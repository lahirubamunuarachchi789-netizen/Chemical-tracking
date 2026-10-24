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
 * Weekly report: one chemical, with the Poly and ISO figures side by side.
 *
 * Poly and ISO are tracked separately because they are different materials
 * held in different tanks: Poly from type-A tanks (A1, A2), ISO from type-B
 * tanks (B1, B2). MRNRecords records both weights per set; the loading records
 * carry only the tank, so usage is split by the tank's type.
 */

/** The two material kinds the weekly report compares. */
export type MaterialKind = 'poly' | 'iso';

/** One material's figures for a chemical in one week. */
export interface WeeklyMaterialUsage {
  /** Quantity recorded in MRNRecords for this week and year. */
  mrn: number;
  /** Total usage from ChemicalLoadingRecords for the same week and year. */
  totalUsage: number;
  /** mrn − totalUsage. Negative means more consumed than recorded. */
  balance: number;
  /** Number of MRN sets contributing to `mrn`. */
  mrnSetCount: number;
 /** Number of loading records contributing to `totalUsage`. */
  recordCount: number;
  /** True when this material is present in only one of the two sources. */
  hasMismatch: boolean;
}

/** One chemical's line in the Weekly Report. */
export interface WeeklyChemicalUsage {
  chemical: string;
  poly: WeeklyMaterialUsage;
  iso: WeeklyMaterialUsage;
}

/** Result of the weekly report query. */
export interface WeeklyReportResult {
  year: number;
  week: number;
  /** Sri Lanka dates the ISO week covers, inclusive. */
  weekStart: string;
  weekEnd: string;
  chemicals: WeeklyChemicalUsage[];
  totals: Record<MaterialKind, WeeklyMaterialUsage> & {
    chemicalCount: number;
  };
}

/** An empty material bucket. */
export function emptyMaterialUsage(): WeeklyMaterialUsage {
  return {
    mrn: 0,
    totalUsage: 0,
    balance: 0,
    mrnSetCount: 0,
    recordCount: 0,
    hasMismatch: false,
  };
}

/**
 * Map a tank code to the material it holds.
 *
 * Type A tanks (A1, A2) hold Poly; type B tanks (B1, B2) hold ISO. This mirrors
 * `tankLabel` in the Daily card, so both reports classify a tank identically.
 * Returns null for an unrecognised code, which keeps it out of both columns
 * rather than silently mis-attributing its usage.
 */
export function materialFromTank(tank: string | null | undefined): MaterialKind | null {
  const code = tank?.trim().charAt(0).toUpperCase();
  if (code === 'A') return 'poly';
  if (code === 'B') return 'iso';
  return null;
}

/** Per-material accumulators used while scanning the two tables. */
export interface MaterialAccumulator {
  mrn: Map<string, number>;
  usage: Map<string, number>;
  mrnSets: Map<string, number>;
  records: Map<string, number>;
}

export function createAccumulator(): MaterialAccumulator {
  return {
    mrn: new Map(),
    usage: new Map(),
    mrnSets: new Map(),
    records: new Map(),
  };
}

function toMaterialUsage(acc: MaterialAccumulator, chemical: string): WeeklyMaterialUsage {
  const mrn = acc.mrn.get(chemical) ?? 0;
  const totalUsage = acc.usage.get(chemical) ?? 0;
  const mrnSetCount = acc.mrnSets.get(chemical) ?? 0;
  const recordCount = acc.records.get(chemical) ?? 0;

  return {
    mrn,
    totalUsage,
    balance: mrn - totalUsage,
    mrnSetCount,
    recordCount,
    // Present in only one source: either nothing was loaded against recorded
    // MRN quantity, or usage happened with nothing recorded in the MRN.
    hasMismatch: mrnSetCount === 0 || recordCount === 0,
  };
}

/**
 * Combine both materials into the per-chemical weekly rows.
 *
 * Kept pure so the arithmetic is unit-testable. A chemical is listed if it
 * appears in EITHER material's MRN records or loading records, so nothing is
 * hidden when only one side has data.
 */
export function buildWeeklyReport(
  poly: MaterialAccumulator,
  iso: MaterialAccumulator
): Omit<WeeklyReportResult, 'year' | 'week' | 'weekStart' | 'weekEnd'> {
  const names = new Set<string>([
    ...poly.mrn.keys(),
    ...poly.usage.keys(),
    ...iso.mrn.keys(),
    ...iso.usage.keys(),
  ]);

  const chemicals: WeeklyChemicalUsage[] = [...names]
    .map((chemical) => ({
      chemical,
      poly: toMaterialUsage(poly, chemical),
      iso: toMaterialUsage(iso, chemical),
    }))
    .sort((a, b) => a.chemical.localeCompare(b.chemical));

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

  return { chemicals, totals };
}
