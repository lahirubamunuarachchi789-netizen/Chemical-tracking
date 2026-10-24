/**
 * Consumption Reports - domain utilities.
 *
 * Handles Sri Lanka timezone conversion (Asia/Colombo, UTC+5:30),
 * ISO week number calculation, and the daily usage formula:
 *   (AfterWeight - BeforeWeight) + StartWeight
 */

import { chemicals } from './chemical-usage';

const SRI_LANKA_TZ = 'Asia/Colombo';

export interface SLDateParts {
  year: number;
  month: number;
  day: number;
  week: number;
  dayOfWeek: string;
  formattedDate: string;
  isoDate: string; // YYYY-MM-DD in Sri Lanka time
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD in Sri Lanka time
  formattedDate: string;
  dayOfWeek: string;
  totalUsage: number;
  recordCount: number;
  chemical?: string; // Chemical type, e.g. "BASF Midsole"
  tank?: string; // Tank label, e.g. "Poly" or "ISO"
}

/** Convert a UTC timestamp from the database to a Sri Lanka local Date. */
export function toSriLankaTime(timestamp: string | Date): Date {
  return new Date(timestamp);
}

/** Extract Sri Lanka-local date parts from a timestamp. */
export function getSLDateParts(timestamp: string | Date): SLDateParts {
  const date = new Date(timestamp);

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SRI_LANKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10);
  const day = parseInt(get('day'), 10);
  const dayOfWeek = get('weekday');

  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
// Use a robust ISO week calculation that handles timezone edge cases.
// October 19, 2026 should be in week 43, not week 42.
const slDate = new Date(Date.UTC(year, month - 1, day));
const thursday = new Date(slDate.getTime() + 86400000 * (4 - (slDate.getDay() || 7)));
const startYear = thursday.getFullYear();
const jan1 = new Date(startYear, 0, 1);
const daysSinceJan1 = Math.floor((thursday.getTime() - jan1.getTime()) / 86400000);
const weekNum = Math.ceil((daysSinceJan1 + 1) / 7);

  return {
    year,
    month,
    day,
    week: weekNum,
    dayOfWeek,
    formattedDate: new Intl.DateTimeFormat('en-LK', {
      timeZone: SRI_LANKA_TZ,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date),
    isoDate,
  };
}

/** Filter options for the consumption report. */
export const CONSUMPTION_FILTERS = {
  injectors: ['RGE 01', 'RGE 02'],
  tanks: ['A1', 'B1', 'A2', 'B2'],
  chemicals: [...chemicals],
  weeks: Array.from({ length: 53 }, (_, i) => i + 1),
  years: (): number[] => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  },
};

/** Shape of the filter values submitted from the search form. */
export interface ConsumptionFilters {
  injector?: string;
  tank?: string;
  chemical?: string;
  week?: number;
  year?: number;
}

/**
 * Daily usage formula per record:
 *   [(AfterWeight - BeforeWeight) + StartWeight] - EndWeight
 * Null weights are treated as 0.
 */
export function calculateRecordUsage(record: {
  AfterWeight: number | null;
  BeforeWeight: number | null;
  StartWeight: number | null;
  EndWeight: number | null;
}): number {
  return ((record.AfterWeight ?? 0) - (record.BeforeWeight ?? 0) + (record.StartWeight ?? 0)) - (record.EndWeight ?? 0);
}

/** Usage intensity tier for colour coding. */
export function usageTier(usage: number): 'none' | 'low' | 'medium' | 'high' {
  if (usage <= 0) return 'none';
  if (usage < 25) return 'low';
  if (usage < 75) return 'medium';
  return 'high';
}

/** Tailwind classes for a usage tier card. */
export function tierClasses(tier: ReturnType<typeof usageTier>): string {
  const base = 'rounded-xl border px-4 py-3';
  switch (tier) {
    case 'none':
      return `${base} border-navy-100 bg-navy-50/50 text-navy-400`;
    case 'low':
      return `${base} border-green-200 bg-green-50 text-green-700`;
    case 'medium':
      return `${base} border-yellow-200 bg-yellow-50 text-yellow-700`;
    case 'high':
      return `${base} border-red-200 bg-red-50 text-red-700`;
  }
}

/**
 * One chemical's line in the Weekly Report.
 *
 * `poly` and `totalUsage` come from two different tables but describe the same
 * week, so they can be compared: balance = poly - totalUsage.
 */
export interface WeeklyChemicalUsage {
  chemical: string;
  /** Poly quantity recorded in MRNRecords for this week and year. */
  poly: number;
  /** Total usage from ChemicalLoadingRecords for the same week and year. */
  totalUsage: number;
  /** poly − totalUsage. Negative means more consumed than recorded. */
  balance: number;
  /** Number of MRN sets contributing to `poly`. */
  mrnSetCount: number;
  /** Number of loading records contributing to `totalUsage`. */
  recordCount: number;
  /** True when the chemical has usage but no MRN entry, or the reverse. */
  hasMismatch: boolean;
}

/** Result of the weekly report query. */
export interface WeeklyReportResult {
  year: number;
  week: number;
  /** Sri Lanka dates the ISO week covers, inclusive. */
  weekStart: string;
  weekEnd: string;
  chemicals: WeeklyChemicalUsage[];
  totals: {
    poly: number;
    totalUsage: number;
    balance: number;
    chemicalCount: number;
  };
}

/**
 * Accumulate per-chemical weekly figures.
 *
 * Kept pure and separate from the Supabase call so the arithmetic can be
 * unit-tested and so both tables are merged by one rule: every chemical that
 * appears in EITHER source must appear in the report, with a zero default for
 * the side that has nothing.
 *
 * @param polyByChemical Poly quantity per chemical, from MRNRecords.
 * @param usageByChemical Total usage per chemical, from ChemicalLoadingRecords.
 * @param mrnSetsByChemical Number of MRN sets per chemical.
 * @param recordsByChemical Number of loading records per chemical.
 */
export function buildWeeklyReport(
  polyByChemical: Map<string, number>,
  usageByChemical: Map<string, number>,
  mrnSetsByChemical: Map<string, number>,
  recordsByChemical: Map<string, number>
): Omit<WeeklyReportResult, 'year' | 'week' | 'weekStart' | 'weekEnd'> {
  // Union, so a chemical is listed if it has MRN poly, usage, or both.
  const names = new Set<string>([
    ...polyByChemical.keys(),
    ...usageByChemical.keys(),
  ]);

  const chemicals: WeeklyChemicalUsage[] = [...names]
    .map((chemical) => {
      const poly = polyByChemical.get(chemical) ?? 0;
      const totalUsage = usageByChemical.get(chemical) ?? 0;
      const mrnSetCount = mrnSetsByChemical.get(chemical) ?? 0;
      const recordCount = recordsByChemical.get(chemical) ?? 0;

      return {
        chemical,
        poly,
        totalUsage,
        balance: poly - totalUsage,
        mrnSetCount,
        recordCount,
        // A chemical in only one of the two tables is worth flagging: either
        // nothing was loaded against recorded poly, or usage happened with no
        // Poly recorded at all.
        hasMismatch: mrnSetCount === 0 || recordCount === 0,
      };
    })
    .sort((a, b) => a.chemical.localeCompare(b.chemical));

  const totals = chemicals.reduce(
    (acc, row) => ({
      poly: acc.poly + row.poly,
      totalUsage: acc.totalUsage + row.totalUsage,
      balance: acc.balance + row.balance,
      chemicalCount: acc.chemicalCount + 1,
    }),
    { poly: 0, totalUsage: 0, balance: 0, chemicalCount: 0 }
  );

  return { chemicals, totals };
}
