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
  const week = getISOWeek(new Date(year, month - 1, day));

  return {
    year,
    month,
    day,
    week,
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

/** ISO week number for a local calendar date. */
function getISOWeek(date: Date): number {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfYear = Math.floor(
    (copy.getTime() - new Date(Date.UTC(copy.getFullYear(), 0, 0)).getTime()) / 86400000
  );
  return Math.ceil((dayOfYear + 1) / 7);
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
 *   (AfterWeight - BeforeWeight) + StartWeight
 * Null weights are treated as 0.
 */
export function calculateRecordUsage(record: {
  AfterWeight: number | null;
  BeforeWeight: number | null;
  StartWeight: number | null;
}): number {
  return ((record.AfterWeight ?? 0) - (record.BeforeWeight ?? 0)) + (record.StartWeight ?? 0);
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