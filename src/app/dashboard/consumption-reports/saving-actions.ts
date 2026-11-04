'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  calculateRecordUsage,
  getSLDateParts,
  materialFromTank,
} from '@/lib/consumption-reports';
import { NO_CHEMICAL } from '@/lib/chemical-usage';

/** A row from MRNRecords, as far as the saving report needs it. */
interface MrnRow {
  Chemical: string | null;
  Poly: number | null;
  ISO: number | null;
  week: number | null;
}

/** A row from ChemicalLoadingRecords, as far as the saving report needs it. */
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

/** Round to 2 decimals for display; keeps sums stable at the edge. */
function round2(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Saving Report: for every ISO week of one year, show each chemical's balance.
 *
 * Balance follows the same logic as the Weekly Report, computed per material:
 *
 *   Poly balance = Poly MRN − Poly usage
 *   ISO balance  = ISO MRN  − ISO usage
 *   Total balance = Poly balance + ISO balance
 *
 * Where:
 *   MRN    <- MRNRecords.Poly / MRNRecords.ISO for that week. The MRN week
 *             column is not year-scoped, mirroring the Weekly Report.
 *   usage  <- ChemicalLoadingRecords for that Sri Lanka week of the year,
 *             using `calculateRecordUsage` -
 *             [(AfterWeight - BeforeWeight) + StartWeight] - EndWeight, null
 *             weights treated as 0 - the same formula as the Daily and Weekly
 *             reports. Only type-A (Poly) and type-B (ISO) tanks contribute,
 *             matching the Weekly Report's material split.
 *
 * A week appears when it has MRN records or loading records; a chemical
 * appears when it has MRN or usage in any week of the year.
 */
export interface SavingReportResult {
  year: number;
  weeks: number[]; // ISO week numbers (1-53) that have data, ascending
  chemicals: string[]; // chemical names, ascending
  balances: Record<number, Record<string, number>>; // week -> chemical -> balance (kg)
  weekTotals: Record<number, number>; // week -> sum of chemical balances (kg)
  chemicalTotals: Record<string, number>; // chemical -> sum across weeks (kg)
  grandTotal: number; // sum of all week balances (kg)
  weekRange: Record<number, { start: string; end: string }>; // SL dates, YYYY-MM-DD
}

export interface SavingReportResponse {
  success: boolean;
  data?: SavingReportResult;
  error?: string;
}

export async function fetchSavingReport(
  year: number
): Promise<SavingReportResponse> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { success: false, error: 'Select a valid year.' };
  }

  const supabase = createServerSupabaseClient();

  // ---- MRNRecords: per-material MRN per chemical per week ---------------
  // Mirrors the Weekly Report: Poly MRN and ISO MRN are tracked separately,
  // keyed by (week, chemical). The MRN week column is not year-scoped.
  const polyMrnByWeek = new Map<number, Map<string, number>>();
  const isoMrnByWeek = new Map<number, Map<string, number>>();

  const { data: mrnData, error: mrnError } = await supabase
    .from('MRNRecords')
    .select('Chemical, Poly, ISO, week');

  if (mrnError) {
    return { success: false, error: `MRN records: ${mrnError.message}` };
  }

  for (const row of (mrnData ?? []) as MrnRow[]) {
    const week = Number(row.week);
    if (!Number.isInteger(week) || week < 1 || week > 53) continue;

    const chemical = row.Chemical?.trim();
    if (!chemical || chemical === NO_CHEMICAL) continue;

    // Poly MRN (matches Weekly Report: only non-null Poly weights count)
    if (row.Poly !== null && row.Poly !== undefined) {
      let byChemical = polyMrnByWeek.get(week);
      if (!byChemical) {
        byChemical = new Map();
        polyMrnByWeek.set(week, byChemical);
      }
      add(byChemical, chemical, row.Poly);
    }

    // ISO MRN (matches Weekly Report: only non-null ISO weights count)
    if (row.ISO !== null && row.ISO !== undefined) {
      let byChemical = isoMrnByWeek.get(week);
      if (!byChemical) {
        byChemical = new Map();
        isoMrnByWeek.set(week, byChemical);
      }
      add(byChemical, chemical, row.ISO);
    }
  }

  // ---- ChemicalLoadingRecords: per-material usage per chemical per week -
  // Mirrors the Weekly Report: usage is split by tank type (A = Poly, B = ISO)
  // and tracked separately per material.
  const polyUsageByWeek = new Map<number, Map<string, number>>();
  const isoUsageByWeek = new Map<number, Map<string, number>>();

  const { data: usageData, error: usageError } = await supabase
    .from('ChemicalLoadingRecords')
    .select(
      'Chemical, LineCode, StartWeight, BeforeWeight, AfterWeight, EndWeight, CreatedAt'
    )
    .gte('CreatedAt', `${year}-01-01T00:00:00Z`)
    .lte('CreatedAt', `${year + 1}-01-01T00:00:00Z`)
    .order('CreatedAt', { ascending: true });

  if (usageError) {
    return { success: false, error: `Loading records: ${usageError.message}` };
  }

  for (const record of (usageData ?? []) as LoadingRow[]) {
    const parts = getSLDateParts(record.CreatedAt);
    if (parts.year !== year) continue;

    const chemical = record.Chemical?.trim();
    if (!chemical || chemical === NO_CHEMICAL) continue;

    const kind = materialFromTank(record.LineCode);
    if (!kind) continue;

    const usage = calculateRecordUsage(record);

    const byWeek = kind === 'poly' ? polyUsageByWeek : isoUsageByWeek;
    let byChemical = byWeek.get(parts.week);
    if (!byChemical) {
      byChemical = new Map();
      byWeek.set(parts.week, byChemical);
    }
    add(byChemical, chemical, usage);
  }

  // ---- Combine: weeks and chemicals -------------------------------------
  const weeksSet = new Set<number>([
    ...polyMrnByWeek.keys(),
    ...isoMrnByWeek.keys(),
    ...polyUsageByWeek.keys(),
    ...isoUsageByWeek.keys(),
  ]);
  const weeks = [...weeksSet].sort((a, b) => a - b);

  const chemicalsSet = new Set<string>();
  for (const byChemical of [
    ...polyMrnByWeek.values(),
    ...isoMrnByWeek.values(),
    ...polyUsageByWeek.values(),
    ...isoUsageByWeek.values(),
  ]) {
    for (const chemical of byChemical.keys()) chemicalsSet.add(chemical);
  }
  const chemicals = [...chemicalsSet].sort((a, b) => a.localeCompare(b));

  // ---- Balances per week and chemical -----------------------------------
  // Balance follows the Weekly Report exactly, per material:
  //   Poly balance = round2(round2(polyMrn) - round2(polyUsage))
  //   ISO balance  = round2(round2(isoMrn)  - round2(isoUsage))
  //   Total balance = Poly balance + ISO balance
  const balances: Record<number, Record<string, number>> = {};
  const weekTotals: Record<number, number> = {};
  const chemicalTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const week of weeks) {
    const byChemical: Record<string, number> = {};
    let weekTotal = 0;

    for (const chemical of chemicals) {
      const polyMrn = round2(polyMrnByWeek.get(week)?.get(chemical) ?? 0);
      const polyUsage = round2(polyUsageByWeek.get(week)?.get(chemical) ?? 0);
      const polyBalance = round2(polyMrn - polyUsage);

      const isoMrn = round2(isoMrnByWeek.get(week)?.get(chemical) ?? 0);
      const isoUsage = round2(isoUsageByWeek.get(week)?.get(chemical) ?? 0);
      const isoBalance = round2(isoMrn - isoUsage);

      const balance = round2(polyBalance + isoBalance);

      byChemical[chemical] = balance;
      weekTotal += balance;
      chemicalTotals[chemical] = round2(
        (chemicalTotals[chemical] ?? 0) + balance
      );
    }

    weekTotal = round2(weekTotal);
    balances[week] = byChemical;
    weekTotals[week] = weekTotal;
    grandTotal += weekTotal;
  }

  // ---- Week date ranges (Sri Lanka time) --------------------------------
  const weekRange: Record<number, { start: string; end: string }> = {};
  for (const week of weeks) {
    const range = isoWeekRange(year, week);
    weekRange[week] = {
      start: slIsoDate(range.start),
      end: slIsoDate(range.end),
    };
  }

  return {
    success: true,
    data: {
      year,
      weeks,
      chemicals,
      balances,
      weekTotals,
      chemicalTotals,
      grandTotal: round2(grandTotal),
      weekRange,
    },
  };
}