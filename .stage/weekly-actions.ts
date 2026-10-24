'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  buildWeeklyReport,
  calculateRecordUsage,
  getSLDateParts,
  type WeeklyReportResult,
} from '@/lib/consumption-reports';

/** A row from MRNRecords, as far as the weekly report needs it. */
interface MrnRow {
  Chemical: string | null;
  Poly: number | null;
  week: number | null;
  created_at: string | null;
}

/** A row from ChemicalLoadingRecords, as far as the weekly report needs it. */
interface LoadingRow {
  Chemical: string | null;
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

function add(a: Map<string, number>, key: string, value: number): void {
  a.set(key, (a.get(key) ?? 0) + value);
}

function bump(a: Map<string, number>, key: string): void {
  a.set(key, (a.get(key) ?? 0) + 1);
}

/**
 * Weekly Report: Poly recorded in MRNRecords against the usage recorded in
 * ChemicalLoadingRecords, for one ISO week of one year, per chemical.
 *
 * Total usage uses `calculateRecordUsage`, the same formula as the Daily
 * report, so the two views always agree:
 *   [(AfterWeight - BeforeWeight) + StartWeight] - EndWeight
 *
 * A chemical appears if it is present in EITHER table, so nothing is hidden
 * when only one side has data. Balance = Poly − total usage.
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

  // ---- MRNRecords: Poly per chemical -------------------------------------
  const { data: mrnData, error: mrnError } = await supabase
    .from('MRNRecords')
    .select('Chemical, Poly, week, created_at')
    .eq('week', week)
    .gte('created_at', from)
    .lte('created_at', to);

  if (mrnError) {
    return { success: false, error: `MRN records: ${mrnError.message}` };
  }

  const polyByChemical = new Map<string, number>();
  const mrnSetsByChemical = new Map<string, number>();

  for (const row of (mrnData ?? []) as MrnRow[]) {
    // The stored week is authoritative, but re-check the Sri Lanka year so a
    // sheet filed at a year boundary cannot leak into the wrong report.
    if (!row.created_at) continue;
    const parts = getSLDateParts(row.created_at);
    if (parts.year !== year || parts.week !== week) continue;

    const chemical = row.Chemical?.trim();
    if (!chemical) continue;

    add(polyByChemical, chemical, row.Poly ?? 0);
    bump(mrnSetsByChemical, chemical);
  }

  // ---- ChemicalLoadingRecords: total usage per chemical ------------------
  const { data: usageData, error: usageError } = await supabase
    .from('ChemicalLoadingRecords')
    .select(
      'Chemical, StartWeight, BeforeWeight, AfterWeight, EndWeight, CreatedAt'
    )
    .gte('CreatedAt', from)
    .lte('CreatedAt', to);

  if (usageError) {
    return { success: false, error: `Loading records: ${usageError.message}` };
  }

  const usageByChemical = new Map<string, number>();
  const recordsByChemical = new Map<string, number>();

  for (const record of (usageData ?? []) as LoadingRow[]) {
    const parts = getSLDateParts(record.CreatedAt);
    if (parts.year !== year || parts.week !== week) continue;

    const chemical = record.Chemical?.trim();
    if (!chemical) continue;

    add(usageByChemical, chemical, calculateRecordUsage(record));
    bump(recordsByChemical, chemical);
  }

  const report = buildWeeklyReport(
    polyByChemical,
    usageByChemical,
    mrnSetsByChemical,
    recordsByChemical
  );

  // Round only at the edge, so intermediate sums keep full precision.
  const chemicals = report.chemicals.map((row) => ({
    ...row,
    poly: Math.round(row.poly * 100) / 100,
    totalUsage: Math.round(row.totalUsage * 100) / 100,
    balance: Math.round((row.poly - row.totalUsage) * 100) / 100,
  }));

  const totals = chemicals.reduce(
    (acc, row) => ({
      poly: acc.poly + row.poly,
      totalUsage: acc.totalUsage + row.totalUsage,
      balance: acc.balance + row.balance,
      chemicalCount: acc.chemicalCount + 1,
    }),
    { poly: 0, totalUsage: 0, balance: 0, chemicalCount: 0 }
  );

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
