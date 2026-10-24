'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  buildWeeklyReport,
  calculateRecordUsage,
  createAccumulator,
  emptyMaterialUsage,
  getSLDateParts,
  materialFromTank,
  type MaterialKind,
  type WeeklyMaterialUsage,
  type WeeklyReportResult,
} from '@/lib/consumption-reports';

/** A row from MRNRecords, as far as the weekly report needs it. */
interface MrnRow {
  Chemical: string | null;
  Poly: number | null;
  ISO: number | null;
  week: number | null;
  created_at: string | null;
}

/** A row from ChemicalLoadingRecords, as far as the weekly report needs it. */
interface LoadingRow {
  Chemical: string | null;
  LineCode: string | null;
  StartWeight: number | null;
  BeforeWeight: number | null;
  AfterWeight: number | null;
  EndWeight: number | null;
  CreatedAt: string;
}

/** Sri Lanka calendar date for a given UTC date, as YYYY-MM-DD. */
function slIsoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Calendar dates covered by an ISO week.
 *
 * Jan 4 is always in week 1, so the Monday on or before it is week 1's start.
 * Adding (week - 1) weeks lands on the requested week's Monday.
 */
function isoWeekRange(year: number, week: number): { start: Date; end: Date } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  // getUTCDay(): 0 = Sunday .. 6 = Saturday, so shift to Monday-first.
  const offsetToMonday = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(
    Date.UTC(year, 0, 4 - offsetToMonday + (week - 1) * 7)
  );
  const end = new Date(week1Monday.getTime() + 6 * 86400000);
  return { start: week1Monday, end };
}

function add(map: Map<string, number>, key: string, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Round to 2 decimals for display; keeps sums stable at the edge. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function tidy(material: WeeklyMaterialUsage): WeeklyMaterialUsage {
  const mrn = round2(material.mrn);
  const totalUsage = round2(material.totalUsage);
  return { ...material, mrn, totalUsage, balance: round2(mrn - totalUsage) };
}

/**
 * Weekly Report: for one ISO week of one year, show every chemical's Poly and
 * ISO side by side.
 *
 * Per material:
 *   MRN      <- MRNRecords.Poly / MRNRecords.ISO
 *   usage    <- ChemicalLoadingRecords, split by tank type (A = Poly, B = ISO)
 *   balance  = MRN - usage
 *
 * Usage uses `calculateRecordUsage`, the same formula as the Daily report:
 *   [(AfterWeight - BeforeWeight) + StartWeight] - EndWeight
 *
 * A chemical appears if it is present in either material or either table, so
 * nothing is hidden when only one side has data.
 */
export async function fetchWeeklyReport(
  year: number,
  week: number
): Promise<{ success: boolean; data?: WeeklyReportResult; error?: string }> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { success: false, error: 'Select a valid year.' };
  }
  if (!Number.isInteger(week) || week < 1 || week > 53) {
    return { success: false, error: 'Select a valid week (1–53).' };
  }

  const supabase = createServerSupabaseClient();
  const { start, end } = isoWeekRange(year, week);

  // Widen the window by a day each side: Sri Lanka is UTC+5:30, so a record's
  // UTC timestamp can fall on the previous day. Exact week matching happens
  // below with getSLDateParts, never on the raw timestamp.
  const from = new Date(start.getTime() - 86400000).toISOString();
  const to = new Date(end.getTime() + 2 * 86400000).toISOString();

  const accumulators: Record<MaterialKind, ReturnType<typeof createAccumulator>> = {
    poly: createAccumulator(),
    iso: createAccumulator(),
  };

  // ---- MRNRecords: per-material quantity --------------------------------
  const { data: mrnData, error: mrnError } = await supabase
    .from('MRNRecords')
    .select('Chemical, Poly, ISO, week, created_at')
    .eq('week', week)
    .gte('created_at', from)
    .lte('created_at', to);

  if (mrnError) {
    return { success: false, error: `MRN records: ${mrnError.message}` };
  }

  for (const row of (mrnData ?? []) as MrnRow[]) {
    if (!row.created_at) continue;

    // The stored week is authoritative, but re-check the Sri Lanka year so a
    // sheet filed at a year boundary cannot leak into the wrong report.
    const parts = getSLDateParts(row.created_at);
    if (parts.year !== year || parts.week !== week) continue;

    const chemical = row.Chemical?.trim();
    if (!chemical) continue;

    for (const kind of ['poly', 'iso'] as const) {
      const weight = kind === 'poly' ? row.Poly : row.ISO;
      // A set may record only one of the two materials; skip empty sides so
      // they do not count as a zero MRN entry.
      if (weight === null || weight === undefined) continue;

      add(accumulators[kind].mrn, chemical, weight);
      bump(accumulators[kind].mrnSets, chemical);
    }
  }

  // ---- ChemicalLoadingRecords: usage, split by tank type ----------------
  const { data: usageData, error: usageError } = await supabase
    .from('ChemicalLoadingRecords')
    .select(
      'Chemical, LineCode, StartWeight, BeforeWeight, AfterWeight, EndWeight, CreatedAt'
    )
    .gte('CreatedAt', from)
    .lte('CreatedAt', to);

  if (usageError) {
    return { success: false, error: `Loading records: ${usageError.message}` };
  }

  for (const record of (usageData ?? []) as LoadingRow[]) {
    const parts = getSLDateParts(record.CreatedAt);
    if (parts.year !== year || parts.week !== week) continue;

    const chemical = record.Chemical?.trim();
    if (!chemical) continue;

    const kind = materialFromTank(record.LineCode);
    if (!kind) continue;

    add(accumulators[kind].usage, chemical, calculateRecordUsage(record));
    bump(accumulators[kind].records, chemical);
  }

  const report = buildWeeklyReport(accumulators.poly, accumulators.iso);

  const chemicals = report.chemicals.map((row) => ({
    ...row,
    poly: tidy(row.poly),
    iso: tidy(row.iso),
  }));

  const totals = chemicals.reduce(
    (acc, row) => {
      for (const kind of ['poly', 'iso'] as const) {
        acc[kind] = {
          mrn: acc[kind].mrn + row[kind].mrn,
          totalUsage: acc[kind].totalUsage + row[kind].totalUsage,
          balance: acc[kind].balance + row[kind].balance,
          mrnSetCount: acc[kind].mrnSetCount + row[kind].mrnSetCount,
          recordCount: acc[kind].recordCount + row[kind].recordCount,
          hasMismatch: acc[kind].hasMismatch || row[kind].hasMismatch,
        };
      }
      acc.chemicalCount += 1;
      return acc;
    },
    {
      poly: emptyMaterialUsage(),
      iso: emptyMaterialUsage(),
      chemicalCount: 0,
    } as Record<MaterialKind, WeeklyMaterialUsage> & { chemicalCount: number }
  );

  for (const kind of ['poly', 'iso'] as const) {
    totals[kind] = tidy(totals[kind]);
  }

  return {
    success: true,
    data: {
      year,
      week,
      weekStart: slIsoDate(start),
      weekEnd: slIsoDate(end),
      chemicals,
      totals,
    },
  };
}
