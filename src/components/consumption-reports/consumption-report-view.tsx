'use client';

import { useCallback, useRef, useState } from 'react';
import {
  BarChart3,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';

import { ConsumptionReportFilters } from './consumption-report-filters';
import { DailyUsageCard } from './daily-usage-card';
import {
  fetchConsumptionReport,
  fetchDailyRecords,
  type DailyRecord,
} from '@/app/dashboard/consumption-reports/actions';
import {
  type ConsumptionFilters,
  type DailyUsage,
} from '@/lib/consumption-reports';

/**
 * Consumption report view.
 *
 * Combines the filter panel with a stats strip and a responsive grid of daily
 * usage cards. Works on both PC and mobile screens.
 */
export function ConsumptionReportView() {
  const [results, setResults] = useState<DailyUsage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  // Filters from the last search, reused when a daily card is opened.
  const [activeFilters, setActiveFilters] = useState<ConsumptionFilters>({});

  // Day detail view state
  const [selectedDay, setSelectedDay] = useState<DailyUsage | null>(null);
  const [detailRecords, setDetailRecords] = useState<DailyRecord[] | null>(
    null
  );
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const detailRequestRef = useRef(0);

  const handleCardClick = useCallback(
    async (day: DailyUsage) => {
      // Ignore the response if the dialog is closed while it is loading.
      const requestId = ++detailRequestRef.current;
      const isStale = () => requestId !== detailRequestRef.current;

      setSelectedDay(day);
      setDetailRecords(null);
      setDetailError(null);
      setLoadingDetail(true);

      try {
        // Apply the filters the user searched with, so the dialog shows only
        // the records behind this card (not every record for the date).
        const response = await fetchDailyRecords({
          date: day.date,
          injector: activeFilters.injector,
          tank: activeFilters.tank,
          chemical: activeFilters.chemical,
          week: activeFilters.week,
          year: activeFilters.year,
        });
        if (isStale()) {
          return;
        }
        if (!response.success) {
          setDetailError(response.error || 'Failed to load day details.');
          return;
        }
        setDetailRecords(response.data ?? []);
      } catch {
        if (!isStale()) {
          setDetailError('An unexpected error occurred while loading details.');
        }
      } finally {
        if (!isStale()) {
          setLoadingDetail(false);
        }
      }
    },
    [activeFilters]
  );

  const closeDetail = useCallback(() => {
    setSelectedDay(null);
    setDetailRecords(null);
    setDetailError(null);
    setLoadingDetail(false);
    // Invalidate any in-flight detail request so its result is discarded.
    detailRequestRef.current += 1;
  }, []);

  const handleSearch = useCallback(
    async (filters: ConsumptionFilters) => {
      setSearching(true);
      setError(null);
      setResults(null);
      setActiveFilters(filters);
      try {
        const response = await fetchConsumptionReport(filters);
        if (!response.success) {
          setError(response.error || 'Failed to load consumption report.');
          return;
        }
        setResults(response.data ?? []);
      } catch {
        setError('An unexpected error occurred while loading the report.');
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const totalUsage = results
    ? results.reduce((sum, day) => sum + day.totalUsage, 0)
    : 0;
  const peakDay = results && results.length > 0
    ? results.reduce((peak, day) =>
        day.totalUsage > peak.totalUsage ? day : peak
      )
    : null;

  const hasSearched = results !== null;

  return (
    <div className="space-y-6">
      <ConsumptionReportFilters onSearch={handleSearch} />
      {/* -------------------------------------------------- Stats strip */}
      {hasSearched && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Days with data"
            value={results.length}
            icon={BarChart3}
            accent="border-sheet-600 bg-sheet-50 text-sheet-600"
          />
          <StatCard
            label="Total records"
            value={
              results.reduce((sum, day) => sum + day.recordCount, 0)
            }
            icon={CheckCircle2}
            accent="border-navy-100 bg-white text-navy-600"
          />
          <StatCard
            label="Total usage"
            value={totalUsage.toFixed(2)}
            unit="kg"
            icon={BarChart3}
            accent="border-emerald-200 bg-emerald-50 text-emerald-700"
          />
          <StatCard
            label="Peak day"
            value={peakDay ? peakDay.formattedDate : '—'}
            unit={peakDay ? peakDay.totalUsage.toFixed(2) + ' kg' : undefined}
            icon={ActivityIcon}
            accent="border-rose-200 bg-rose-50 text-rose-700"
          />
        </section>
      )}

      {/* -------------------------------------------------- Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span className="ml-2">Search failed: {error}</span>
        </div>
      )}

      {/* -------------------------------------------------- Day detail dialog */}
      {selectedDay && (
        <DayDetailDialog
          day={selectedDay}
          records={detailRecords ?? []}
          loading={loadingDetail}
          error={detailError}
          onClose={closeDetail}
        />
      )}

      {/* -------------------------------------------------- Empty state */}
      {hasSearched && !error && results.length === 0 && (
        <section className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/60 px-8 py-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-navy-300" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-navy-900">Data Not Found</h3>
          <p className="mt-1 text-sm text-navy-500">
            No consumption data found for the selected filters. Try adjusting the injector, tank, chemical, week or year filters.
          </p>
        </section>
      )}

      {/* No search applied yet */}
      {!hasSearched && !searching && (
        <section className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/60 px-8 py-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-navy-300" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-navy-900">No Search Applied</h3>
          <p className="mt-1 text-sm text-navy-500">
            Set filters above to search consumption data.
          </p>
        </section>
      )}

      {/* -------------------------------------------------- Daily results */}
      {hasSearched && !error && results.length > 0 && (
        <section>
          <div className="flex items-center justify-between gap-2 border-b border-navy-100 pb-3">
            <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wider">
              Daily consumption
            </h2>
            <p className="text-xs text-navy-500">
              {results.length} day{results.length === 1 ? '' : 's'} in Sri Lanka time
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((day) => (
              <DailyUsageCard
                key={day.date}
                day={day}
                onClick={() => handleCardClick(day)}
              />
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------- Loading state */}
      {searching && !hasSearched && (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-navy-500" aria-hidden="true" />
            <p className="text-sm text-navy-500">Searching records…</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Small stat card used in the results header strip. */
function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div
      className={[
        'rounded-xl border px-4 py-4 flex flex-col gap-2',
        accent,
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-[10px] font-semibold tracking-wider uppercase">
          {label}
        </p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums">{value}</span>
        {unit && <span className="text-[11px] font-medium">{unit}</span>}
      </div>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

/** Weight value with a fixed 2-decimal readout; "—" when the cell is empty. */
function formatWeight(value: number | null): string {
  return value === null || value === undefined ? '—' : value.toFixed(2);
}

/**
 * Day detail dialog.
 *
 * Opened by clicking a Daily consumption card. Lists the individual
 * ChemicalLoadingRecords recorded for that Sri Lanka date, with the derived
 * loaded / consumption figures for each entry.
 */
function DayDetailDialog({
  day,
  records,
  loading,
  error,
  onClose,
}: {
  day: DailyUsage;
  records: DailyRecord[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const details = records.map((record) => {
    const before = record.BeforeWeight ?? 0;
    const after = record.AfterWeight ?? 0;
    const loaded = after - before;
    const start = record.StartWeight ?? 0;
    // Final Start Weight = Start Weight + [After - Before]
    const finalStart = start + loaded;
    const consumption =
      typeof record.EndWeight === 'number'
        ? finalStart - record.EndWeight
        : finalStart;

    return { record, loaded, finalStart, consumption };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* -------------------------------------------------- Header */}
        <div className="flex items-start justify-between gap-3 border-b border-navy-100 bg-navy-50/60 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wider text-navy-500 uppercase">
              Daily report — detail view
            </p>
            <h3
              id="day-detail-title"
              className="truncate text-base font-semibold text-navy-900 sm:text-lg"
            >
              {day.formattedDate}
            </h3>
            <p className="mt-0.5 text-xs text-navy-500">
              {day.recordCount} record{day.recordCount === 1 ? '' : 's'} ·{' '}
              {day.totalUsage.toFixed(2)} kg total usage
              {day.chemical ? ` · ${day.chemical}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-navy-100 bg-white p-1.5 text-navy-500 transition hover:bg-navy-50 hover:text-navy-900"
            aria-label="Close day details"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* -------------------------------------------------- Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading && (
            <div className="flex h-40 flex-col items-center justify-center gap-3">
              <RefreshCw
                className="h-5 w-5 animate-spin text-navy-500"
                aria-hidden="true"
              />
              <p className="text-sm text-navy-500">Loading records…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && details.length === 0 && (
            <div className="rounded-xl border border-dashed border-navy-200 bg-navy-50/60 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-navy-900">
                No records found
              </p>
              <p className="mt-1 text-sm text-navy-500">
                No individual entries were recorded for this day.
              </p>
            </div>
          )}

          {!loading && !error && details.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-navy-100">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-navy-50/60 text-[11px] tracking-wider text-navy-500 uppercase">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Line / Range
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Start
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Before
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      After
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Loaded
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Final Start Weight
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      End Weight
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Usage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.map(
                    ({ record, loaded, finalStart, consumption }, index) => (
                      <tr
                        key={`${record.CreatedAt}-${index}`}
                        className="border-t border-navy-100 text-navy-800"
                      >
                        <td className="px-3 py-2">
                          <span className="font-medium">
                            {record.LineCode || '—'}
                          </span>
                          <span className="block text-xs text-navy-500">
                            {record.RangeCode || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatWeight(record.StartWeight)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatWeight(record.BeforeWeight)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatWeight(record.AfterWeight)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatWeight(loaded)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatWeight(finalStart)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatWeight(record.EndWeight)}
                        </td>
                        <td className="px-3 py-2 font-semibold text-navy-900 tabular-nums">
                          {formatWeight(consumption)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* -------------------------------------------------- Footer */}
        <div className="border-t border-navy-100 px-4 py-3 text-right sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-navy-100 bg-white px-4 py-2 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}