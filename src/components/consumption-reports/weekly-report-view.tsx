'use client';

import { useCallback, useState } from 'react';
import {
  AlertCircle,
  CalendarRange,
  Download,
  RefreshCw,
  Search,
} from 'lucide-react';

import { SelectField } from '@/components/chemical-usage/form-controls';
import {
  CONSUMPTION_FILTERS,
  type MaterialKind,
  type WeeklyMaterialUsage,
  type WeeklyReportResult,
} from '@/lib/consumption-reports';
import { fetchWeeklyReport } from '@/app/dashboard/consumption-reports/weekly-actions';
import { downloadWeeklyReportPdf } from './weekly-report-pdf';

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

/** Colour hint for a material group, so Poly and ISO read apart at a glance. */
const GROUP_STYLES: Record<MaterialKind, { head: string; cell: string }> = {
  poly: {
    head: 'bg-sheet-600 text-white',
    cell: 'bg-sheet-50/40',
  },
  iso: {
    head: 'bg-navy-700 text-white',
    cell: 'bg-navy-50/40',
  },
};

const MATERIAL_LABELS: Record<MaterialKind, string> = {
  poly: 'Poly',
  iso: 'ISO',
};

/**
 * Weekly Report.
 *
 * Pick a week and a year, then compare — for every chemical — the Poly and ISO
 * quantities recorded in MRNRecords with the usage recorded in
 * ChemicalLoadingRecords for that same week. Balance = MRN − total usage.
 *
 * Volume usage is split by tank type (A tanks hold Poly, B tanks hold ISO) and
 * uses the shared `calculateRecordUsage` helper, so the figures match the
 * Daily report exactly.
 */
export function WeeklyReportView() {
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(String(currentYear));
  const [week, setWeek] = useState('');
  const [result, setResult] = useState<WeeklyReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  /** Builds the PDF in the browser and saves it. */
  const handleDownload = useCallback(async () => {
    if (!result || downloading) return;
    setDownloading(true);
    try {
      await downloadWeeklyReportPdf(result);
    } catch {
      setError('Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [result, downloading]);

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
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-wider text-navy-900 uppercase">
                Weekly Poly and ISO balance
              </h2>
              <p className="mt-0.5 text-xs text-navy-500">
                Week {result.week}, {result.year} · {result.weekStart} to{' '}
                {result.weekEnd} · {result.totals.chemicalCount}{' '}
                chemical{result.totals.chemicalCount === 1 ? '' : 's'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 shadow-sm transition hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>

          {/* Totals strip, one pair per material */}
          <div className="grid gap-3 lg:grid-cols-2">
            {(['poly', 'iso'] as const).map((kind) => (
              <div
                key={kind}
                className="overflow-hidden rounded-xl border-navy-100 bg-white shadow-sm"
              >
                <div
                  className={[
                    'px-4 py-2 text-[11px] font-semibold tracking-wider uppercase',
                    GROUP_STYLES[kind].head,
                  ].join(' ')}
                >
                  {MATERIAL_LABELS[kind]} — week totals
                </div>
                <dl className="grid grid-cols-3 divide-x divide-navy-100">
                  {[
                    { label: 'MRN', value: result.totals[kind].mrn },
                    { label: 'Usage', value: result.totals[kind].totalUsage },
                    { label: 'Balance', value: result.totals[kind].balance },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-3">
                      <dt className="text-[10px] font-semibold tracking-wider text-navy-400 uppercase">
                        {label}
                      </dt>
                      <dd
                        className={[
                          'mt-0.5 text-base font-bold tabular-nums',
                          label === 'Balance'
                            ? balanceClasses(value)
                            : 'text-navy-900',
                        ].join(' ')}
                      >
                        {kg(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          {/* Table: one chemical per row, Poly then ISO */}
          <div className="overflow-x-auto rounded-2xl border-navy-100 bg-white shadow-sm">
            <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Per chemical, for week {result.week} of {result.year}: MRN
                quantity, total usage and balance, for Poly and ISO separately.
              </caption>

              <thead>
                <tr className="bg-navy-50/60 text-[11px] tracking-wider text-navy-500 uppercase">
                  <th scope="col" rowSpan={2} className="px-4 py-3 font-semibold">
                    Chemical
                  </th>
                  {(['poly', 'iso'] as const).map((kind) => (
                    <th
                      key={kind}
                      scope="colgroup"
                      colSpan={3}
                      className={[
                        'border-l border-white/20 px-4 py-2 text-center font-semibold',
                        GROUP_STYLES[kind].head,
                      ].join(' ')}
                    >
                      {MATERIAL_LABELS[kind]}
                    </th>
                  ))}
                </tr>
                <tr className="text-[10px] tracking-wider text-navy-500 uppercase">
                  {(['poly', 'iso'] as const).flatMap((kind) =>
                    ['MRN', 'Usage', 'Balance'].map((label, index) => (
                      <th
                        key={`${kind}-${label}`}
                        scope="col"
                        className={[
                          'px-4 py-2 text-right font-semibold',
                          index === 0 ? 'border-l border-navy-100' : '',
                        ].join(' ')}
                      >
                        {label}
                      </th>
                    ))
                  )}
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
                    </th>
                    {(['poly', 'iso'] as const).flatMap((kind) => (
                      <MaterialCells
                        key={`${row.chemical}-${kind}`}
                        material={row[kind]}
                        firstOfGroup
                        tint={GROUP_STYLES[kind].cell}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-navy-200 bg-navy-50/60 font-semibold text-navy-900">
                  <th scope="row" className="px-4 py-3 text-left">
                    Total
                  </th>
                  {(['poly', 'iso'] as const).map((kind) => (
                    <TotalsCells key={kind} material={result.totals[kind]} />
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[11px] leading-relaxed text-navy-400">
            <span className="font-medium">MRN</span> is the quantity recorded in
            MRN Input for this week. <span className="font-medium">Usage</span>{' '}
            is the loading records for the same week, split by tank type: A
            tanks (A1, A2) count towards Poly, B tanks (B1, B2) towards ISO,
            using the Daily report formula{' '}
            <span className="font-medium">
              [(After − Before) + Start] − End
            </span>
            . <span className="font-medium">Balance</span> = MRN − usage; a
            negative balance means more was consumed than recorded.
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
            Select a week and year above, then search to compare MRN Poly and
            ISO against recorded usage.
          </p>
        </section>
      )}
    </div>
  );
}

/** MRN / usage / balance cells for one material on a chemical row. */
function MaterialCells({
  material,
  firstOfGroup,
  tint,
}: {
  material: WeeklyMaterialUsage;
  firstOfGroup?: boolean;
  tint: string;
}) {
  return (
    <>
      <td
        className={[
          'px-4 py-3 text-right tabular-nums',
          tint,
          firstOfGroup ? 'border-l border-navy-100' : '',
        ].join(' ')}
      >
        {kg(material.mrn)}
        {material.hasMismatch ? (
          <span
            className="ml-1.5 align-middle text-[10px] font-semibold text-amber-600"
            title={
              material.mrnSetCount === 0
                ? 'Usage recorded, but nothing in MRN for this week'
                : 'MRN recorded, but no loading records for this week'
            }
          >
            {material.mrnSetCount === 0 ? '!' : '*'}
          </span>
        ) : null}
      </td>
      <td className={['px-4 py-3 text-right tabular-nums', tint].join(' ')}>
        {kg(material.totalUsage)}
      </td>
      <td
        className={[
          'px-4 py-3 text-right font-semibold tabular-nums',
          tint,
          balanceClasses(material.balance),
        ].join(' ')}
      >
        {kg(material.balance)}
      </td>
    </>
  );
}

/** Totals-row cells for one material. */
function TotalsCells({ material }: { material: WeeklyMaterialUsage }) {
  return (
    <>
      <td className="border-l border-navy-200 px-4 py-3 text-right tabular-nums">
        {kg(material.mrn)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {kg(material.totalUsage)}
      </td>
      <td
        className={[
          'px-4 py-3 text-right tabular-nums',
          balanceClasses(material.balance),
        ].join(' ')}
      >
        {kg(material.balance)}
      </td>
    </>
  );
}
