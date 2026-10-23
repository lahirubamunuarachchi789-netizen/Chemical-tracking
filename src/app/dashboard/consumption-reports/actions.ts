'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getSLDateParts,
  calculateRecordUsage,
  type DailyUsage,
  type SLDateParts,
} from '@/lib/consumption-reports';

export interface ConsumptionRecord {
  RangeCode: string;
  LineCode: string;
  Chemical: string | null;
  StartWeight: number | null;
  BeforeWeight: number | null;
  AfterWeight: number | null;
  EndWeight: number | null;
  CreatedAt: string;
}

export interface ConsumptionReportResult {
  success: boolean;
  error?: string;
  data?: DailyUsage[];
}

/**
 * Fetch consumption report data from ChemicalLoadingRecords.
 *
 * Filters by Injector (RangeCode), Tank (LineCode) and Chemical (Chemical).
 * Converts each UTC CreatedAt to Sri Lanka time, then filters by year and
 * ISO week. Groups remaining records by SL date and sums the daily usage:
 *   [(AfterWeight - BeforeWeight) + StartWeight] - EndWeight
 */
export async function fetchConsumptionReport(filters: {
  injector?: string;
  tank?: string;
  chemical?: string;
  week?: number;
  year?: number;
}): Promise<ConsumptionReportResult> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('ChemicalLoadingRecords')
    .select(
      'RangeCode, LineCode, Chemical, StartWeight, BeforeWeight, AfterWeight, EndWeight, CreatedAt'
    )
    .order('CreatedAt', { ascending: true });

  if (filters.injector) {
    query = query.eq('RangeCode', filters.injector);
  }
  if (filters.tank) {
    query = query.eq('LineCode', filters.tank);
  }
  if (filters.chemical) {
    query = query.eq('Chemical', filters.chemical);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  const records = (data ?? []) as ConsumptionRecord[];

  // Filter by year and week using Sri Lanka timezone
  const filtered = records.filter((record) => {
    const parts = getSLDateParts(record.CreatedAt);
    if (filters.year && parts.year !== filters.year) return false;
    if (filters.week && parts.week !== filters.week) return false;
    return true;
  });

  // Group by SL date and calculate total usage
  const byDate = new Map<
    string,
    { totalUsage: number; count: number; parts: SLDateParts; chemical?: string; tank?: string }
  >();

  for (const record of filtered) {
    const parts = getSLDateParts(record.CreatedAt);
    const usage = calculateRecordUsage(record);
    const existing = byDate.get(parts.isoDate) ?? {
      totalUsage: 0,
      count: 0,
      parts,
    };
    existing.totalUsage += usage;
    existing.count += 1;
    // Capture chemical and tank from the first record that has them
    if (!existing.chemical && record.Chemical) {
      existing.chemical = record.Chemical;
    }
    if (!existing.tank && record.LineCode) {
      existing.tank = record.LineCode;
    }
    byDate.set(parts.isoDate, existing);
  }

  const result: DailyUsage[] = Array.from(byDate.entries())
    .map(([, data]) => ({
      date: data.parts.isoDate,
      formattedDate: data.parts.formattedDate,
      dayOfWeek: data.parts.dayOfWeek,
      totalUsage: Math.round(data.totalUsage * 100) / 100,
      recordCount: data.count,
      chemical: data.chemical,
      tank: data.tank,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { success: true, data: result };
}