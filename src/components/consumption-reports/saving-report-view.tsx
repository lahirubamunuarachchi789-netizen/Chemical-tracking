'use client';

import { useCallback, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Download,
  RefreshCw,
  Search,
} from 'lucide-react';

import { SelectField } from '@/components/chemical-usage/form-controls';
import { CONSUMPTION_FILTERS } from '@/lib/consumption-reports';
import {
  fetchSavingReport,
  type SavingReportResult,
} from '@/app/dashboard/consumption-reports/saving-actions';
import { downloadSavingReportPdf } from './saving-report-pdf';

/** Formats a weight with 2 decimals and thousands separators. */
function kg(value: number): string {
  if (!Number.isFinite(value)) return '-';
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

export function SavingReportView() {
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(String(currentYear));
  const [report, setReport] = useState<SavingReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const years = CONSUMPTION_FILTERS.years();

  const handleSearch = useCallback(async () => {
    const parsedYear = parseInt(year, 10);

    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      setError('Select a valid year.');
      return;
    }

    setSearching(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetchSavingReport(parsedYear);
      if (!response.success || !response.data) {
        setError(response.error || 'Failed to load the saving report.');
        return;
      }
      setReport(response.data);
    } catch {
      setError('An unexpected error occurred while loading the report.');
    } finally {
      setSearching(false);
    }
  }, [year]);

  const handleDownload = useCallback(async () => {
    if (!report || downloading) return;
    setDownloading(true);
    try {
      await downloadSavingReportPdf(report);
    } catch {
      setError('Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [report, downloading]);

  const hasSearched = report !== null;

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------- Filters */}
      <section
        className="rounded-2xl border-navy-100 bg-white shadow-sm"
        aria-label="Saving report filters"
      >
        <div className="border-b border-navy-100 bg-navy-50/60 px-5 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-navy-900 uppercase">
            <Calendar
              className="h-4 w-4 shrink-0 text-navy-500"
              aria-hidden="true"
            />
            Year
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
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
            <p className="text-sm text-navy-500">Loading saving report…</p>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- Empty */}
      {hasSearched && !error && report.weeks.length === 0 && (
        <section className="rounded-2xl border-dashed border-navy-200 bg-navy-50/60 px-8 py-12 text-center">
          <AlertCircle
            className="mx-auto h-10 w-10 text-navy-300"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-lg font-semibold text-navy-900">
            No data for this year
          </h3>
          <p className="mt-1 text-sm text-navy-500">
            No MRN records or loading records were found for {report.year}.
            Try another year.
          </p>
        </section>
      )}

      {/* -------------------------------------------------- Results */}
      {hasSearched && !error && report.weeks.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-wider text-navy-900 uppercase">
                Saving Report
              </h2>
              <p className="mt-0.5 text-xs text-navy-500">
                {report.year} &middot; {report.weeks.length} week{report.weeks.length === 1 ? '' : 's'} with data
              </p>
            </div>
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="inline-flex items-center gap-2 rounded-lg border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 shadow-sm transition hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {downloading ? 'Preparing…' : 'Export PDF'}
            </button>
          </div>

          <div className="overflow-x-auto border border-navy-100 rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy-50">
                  <th scope="col" className="px-4 py-3 text-left text-navy-600 font-semibold border-b border-navy-100">
                    Week
                  </th>
                  {report.chemicals.map((chemical) => (
                    <th
                      key={chemical}
                      scope="col"
                      className="px-4 py-3 text-right text-navy-600 font-semibold border-b border-navy-100"
                    >
                      {chemical}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-right text-navy-600 font-semibold border-b border-navy-100">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.weeks.map((week) => (
                  <tr key={week} className="border-t border-navy-100 text-navy-800">
                    <td className="px-4 py-3">
                      <span className="font-medium">Week {week}</span>
                      <span className="block text-xs text-navy-500">
                        {report.weekRange[week].start} to{' '}
                        {report.weekRange[week].end}
                      </span>
                    </td>
                    {report.chemicals.map((chemical) => (
                      <td
                        key={chemical}
                        className={[
                          'px-4 py-3 text-right tabular-nums',
                          balanceClasses(report.balances[week][chemical]),
                        ].join(' ')}
                      >
                        {kg(report.balances[week][chemical])}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums border-t border-navy-200">
                      {kg(report.weekTotals[week])}
                    </td>
                  </tr>
                ))}
                {/* Totals row: total balance per chemical and grand total */}
                <tr className="border-t border-navy-200 bg-navy-50/60 text-navy-900">
                  <td className="px-4 py-3 font-semibold">Total</td>
                  {report.chemicals.map((chemical) => (
                    <td
                      key={chemical}
                      className="px-4 py-3 text-right tabular-nums font-semibold"
                    >
                      {kg(report.chemicalTotals[chemical])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right tabular-nums font-semibold border-l border-navy-200">
                    {kg(report.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] leading-relaxed text-navy-400">
            <span className="font-medium">Balance</span> = MRN &minus; usage for
            the week. <span className="font-medium">MRN</span> is the quantity
            recorded in MRN Input for the week (Poly + ISO boxes).{' '}
            <span className="font-medium">Usage</span> is the loading records
            for the same ISO week in Sri Lanka time, using the Weekly Report
            formula{' '}
            <span className="font-medium">
              [(After &minus; Before) + Start] &minus; End
            </span>
            . A negative balance means more was consumed than recorded.
          </p>
        </section>
      )}

      {/* Not searched yet */}
      {!hasSearched && !searching && !error && (
        <section className="rounded-2xl border-dashed border-navy-200 bg-navy-50/60 px-8 py-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-navy-300" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-navy-900">
            Choose a year
          </h3>
          <p className="mt-1 text-sm text-navy-500">
            Select a year above, then search to show each chemical&apos;s balance
            per ISO week, with MRN minus loading-record usage.
          </p>
        </section>
      )}
    </div>
  );
}