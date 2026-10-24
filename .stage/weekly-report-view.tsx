'use client';

import { useCallback, useState } from 'react';
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  RefreshCw,
  Scale,
  Search,
} from 'lucide-react';

import { SelectField } from '@/components/chemical-usage/form-controls';
import { CONSUMPTION_FILTERS, type WeeklyReportResult } from '@/lib/consumption-reports';
import { fetchWeeklyReport } from '@/app/dashboard/consumption-reports/weekly-actions';

/** Formats a weight with 2 decimals and thousands separators. */
function kg(value: number): string {
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Balance tone: negative means more consumed than was recorded. */
function balanceClasses(balance: number): string {
  if (balance < 0) return 'text-red-700';
  if (balance > 0) return 'text-emerald-700';
  return 'text-navy-600';
}

/**
 * Weekly Report.
 *
 * Pick a week and a year, then compare the Poly recorded in MRNRecords with
 * the total usage recorded in ChemicalLoadingRecords for that same week, per
 * chemical. Balance = Poly − total usage.
 *
 * Total usage comes from the shared `calculateRecordUsage` helper, so the
 * figure matches the Daily report exactly.
 */
export function WeeklyReportView() {
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(String(currentYear));
  const [week, setWeek] = useState('');
  const [result, setResult] = useState<WeeklyReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const years = CONSUMPTION_FILTERS.years();

  const handleSearch = useCallback(async () => {
    const parsedWeek = parseInt(week, 10);
    const parsedYear = parseInt(year, 10);

    if (!Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > 53) {
      setError('Select a week (1–53) before searching.');
      return;
    }

    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetchWeeklyReport(parsedYear, parsedWeek);
      if (!response.success || !response.data) {
        setError(response.error || 'Failed to load the weekly report.');
        return;
      }
      setResult(response.data);
    } catch {
      setError('An unexpected error occurred while loading the report.');
    } finally {
      setSearching(false);
    }
  }, [week, year]);

  const hasSearched = result !== null;

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------- Filters */}
      <section
        className="rounded-2xl border-navy-100 bg-white shadow-sm"
        aria-label="Weekly report filters"
      >
        <div className="border-b border-navy-100 bg-navy-50/60 px-5 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-navy-900 uppercase">
            <CalendarRange
              className="h-4 w-4 shrink-0 text-navy-500"
              aria-hidden="true"
            />
            Week and year
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-wide text-navy-600 uppercase">
              Week
            </label>
            <SelectField
              label=""
              value={week}
              onChange={setWeek}
              options={CONSUMPTION_FILTERS.weeks.map(String)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-wide text-navy-600 uppercase">
              Year
            </label>
            <SelectField
              label=""
              value={year}
              onChange={setYear}
              options={years.map(String)}
            />
          </div>
        </div>

        <div className="border-t border-navy-100 bg-navy-50/40 px-5 py-4 sm:flex sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] text-navy-400">
            Weeks follow the ISO calendar and are matched in Sri Lanka time
            (UTC+5:30).
          </p>
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={searching}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sheet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sheet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sheet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0 sm:ml-4"
          >
            {searching ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            Search
          </button>
        </div>
      </section>

      {/* -------------------------------------------------- Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
            aria-hidden="true"
          />
          <span>{error}</span>
        </div>
      )}

      {/* -------------------------------------------------- Loading */}
      {searching && (
        <div className="flex h-40 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw
              className="h-6 w-6 animate-spin text-navy-500"
              aria-hidden="true"
            />
            <p className="text-sm text-navy-500">Loading weekly report…</p>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- Empty */}
      {hasSearched && !error && result.chemicals.length === 0 && (
        <section className="rounded-2xl border-dashed border-navy-200 bg-navy-50/60 px-8 py-12 text-center">
          <AlertCircle
            className="mx-auto h-10 w-10 text-navy-300"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-lg font-semibold text-navy-900">
            No data for this week
          </h3>
          <p className="mt-1 text-sm text-navy-500">
            No MRN records or loading records were found for week {result.week}{' '}
            of {result.year}. Try another week or year.
          </p>
        </section>
      )}

      {/* -------------------------------------------------- Results */}
      {hasSearched && !error && result.chemicals.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-navy-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-wider text-navy-900 uppercase">
                Weekly balance
              </h2>
              <p className="mt-0.5 text-xs text-navy-500">
                Week {result.week}, {result.year} · {result.weekStart} to{' '}
                {result.weekEnd} · {result.totals.chemicalCount}{' '}
                chemical{result.totals.chemicalCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Total Poly (MRN)"
              value={kg(result.totals.poly)}
              unit="kg"
              icon={CalendarRange}
              accent="border-sheet-600 bg-sheet-50 text-sheet-600"
            />
            <StatCard
              label="Total usage (loadings)"
              value={kg(result.totals.totalUsage)}
              unit="kg"
              icon={CheckCircle2}
              accent="border-emerald-200 bg-emerald-50 text-emerald-700"
            />
            <StatCard
              label="Total balance"
              value={kg(result.totals.balance)}
              unit="kg"
              icon={Scale}
              accent={
                result.totals.balance < 0
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-navy-100 bg-white text-navy-600'
              }
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border-navy-100 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Poly recorded in MRN records, total chemical usage and their
                balance, per chemical, for week {result.week} of {result.year}.
              </caption>
              <thead>
                <tr className="bg-navy-50/60 text-[11px] tracking-wider text-navy-500 uppercase">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Chemical
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Poly (MRN)
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Total usage
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.chemicals.map((row) => (
                  <tr
                    key={row.chemical}
                    className="border-t border-navy-100 text-navy-800 transition hover:bg-navy-50/40"
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 text-left font-semibold text-navy-900"
                    >
                      {row.chemical}
                      {row.hasMismatch ? (
                        <span
                          className="ml-2 rounded-md border-amber-200 bg-amber-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold tracking-wide text-amber-700 uppercase"
                          title={
                            row.mrnSetCount === 0
                              ? 'Usage recorded, but no MRN Poly entry for this week'
                              : 'MRN Poly recorded, but no loading records for this week'
                          }
                        >
                          {row.mrnSetCount === 0 ? 'No MRN' : 'No usage'}
                        </span>
                      ) : null}
                    </th>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.mrnSetCount > 0 ? kg(row.poly) : '-' }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {kg(row.totalUsage)}
                    </td>
                    <td
                      className={[
                        'px-4 py-3 text-right font-semibold tabular-nums',
                        balanceClasses(row.balance),
                      ].join(' ')}
                    >
                      {kg(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy-200 bg-navy-50/60 font-semibold text-navy-900">
                  <th scope="row" className="px-4 py-3 text-left">
                    Total
                  </th>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {kg(result.totals.poly)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {kg(result.totals.totalUsage)}
                  </td>
                  <td
                    className={[
                      'px-4 py-3 text-right tabular-nums',
                      balanceClasses(result.totals.balance),
                    ].join(' ')}
                  >
                    {kg(result.totals.balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[11px] leading-relaxed text-navy-400">
            Poly is the quantity recorded in MRN Input for this week. Total usage
            applies the same formula as the Daily report:{' '}
            <span className="font-medium">
              [(After − Before) + Start] − End
            </span>
            . Balance = Poly − total usage; a negative balance means more was
            consumed than recorded.
          </p>
        </section>
      )}

      {/* Not searched yet */}
      {!hasSearched && !searching && !error && (
        <section className="rounded-2xl border-dashed border-navy-200 bg-navy-50/60 px-8 py-12 text-center">
          <CalendarRange
            className="mx-auto h-10 w-10 text-navy-300"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-lg font-semibold text-navy-900">
            Choose a week
          </h3>
          <p className="mt-1 text-sm text-navy-500">
            Select a week and year above, then search to compare MRN Poly
            against recorded usage.
          </p>
        </section>
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
    <div className={['flex flex-col gap-2 rounded-xl border px-4 py-4', accent].join(' ')}>
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
