"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  RotateCcw,
  Scale,
  Send,
} from "lucide-react";

import {
  CellInput,
  ComputedCell,
  SelectField,
  TextField,
} from "@/components/chemical-usage/form-controls";
import {
  chemicalLoaded,
  chemicalRanges,
  createEmptyRows,
  endWeight,
  formatWeight,
  parseWeight,
  shifts,
  type ChemicalUsageRow,
} from "@/lib/chemical-usage";

/**
 * Blue band that mirrors the shaded cells of the Excel sheet.
 *
 * `sheet-600` is the exact fill used on the spreadsheet (Office accent5
 * #4472C4 tinted -25% = #335695), so the captured sheet and the app match.
 */
const BAND = "bg-sheet-600 text-white";

/** Small chip that labels a computed total. */
function TotalChip({
  label,
  value,
  unit = "kg",
  accent = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  icon: LucideIcon;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-4 rounded-xl border px-4 py-3",
        accent
          ? "border-sheet-600 bg-sheet-600 text-white"
          : "border-navy-100 bg-white text-navy-900",
      ].join(" ")}
    >
      <span
        className={[
          "flex items-center gap-2 text-xs font-semibold tracking-wide uppercase",
          accent ? "text-sheet-100" : "text-navy-500",
        ].join(" ")}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums">{value}</span>
        <span
          className={[
            "text-[11px] font-medium",
            accent ? "text-sheet-100" : "text-navy-400",
          ].join(" ")}
        >
          {unit}
        </span>
      </span>
    </div>
  );
}

/**
 * Chemical Usage Input form.
 *
 * Layout mirrors the Excel sheet: a Date / Shift strip on top, then one table
 * per range with the `Chemical Loading` group (Chemical, Start Weight,
 * Before, After) and the computed `End Weight` column.
 */
export function ChemicalUsageForm() {
  const [date, setDate] = useState("");
  const [shift, setShift] = useState("");
  const [rows, setRows] = useState<ChemicalUsageRow[]>(createEmptyRows);
  const [saved, setSaved] = useState(false);

  function updateRow(id: string, patch: Partial<ChemicalUsageRow>) {
    setSaved(false);
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function resetForm() {
    setDate("");
    setShift("");
    setRows(createEmptyRows());
    setSaved(false);
  }

  const summary = useMemo(() => {
    let chemical = 0;
    let end = 0;
    let filled = 0;
    let invalid = 0;

    for (const row of rows) {
      const loaded = chemicalLoaded(row);
      const remaining = endWeight(row);

      if (row.chemical.trim() || row.startWeight.trim()) filled += 1;
      if (row.before.trim() && parseWeight(row.before) === null) invalid += 1;
      if (row.after.trim() && parseWeight(row.after) === null) invalid += 1;
      if (row.startWeight.trim() && parseWeight(row.startWeight) === null) {
        invalid += 1;
      }

      if (loaded !== null) chemical += loaded;
      if (remaining !== null) end += remaining;
    }

    return { chemical, end, filled, invalid };
  }, [rows]);

  return (
    <div className="mt-8 space-y-6">
      {/* --------------------------------------------- Date / Shift strip */}
      <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
        <div className="grid gap-px bg-navy-100 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
          {/* The sheet shades these two cells blue - they are the entry cells. */}
          <div className="bg-sheet-100 p-4">
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(value) => {
                setDate(value);
                setSaved(false);
              }}
            />
          </div>

          <div className="bg-sheet-100 p-4">
            <SelectField
              label="Shift"
              value={shift}
              onChange={(value) => {
                setShift(value);
                setSaved(false);
              }}
              options={shifts}
            />
          </div>

          <div className="bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-navy-600 uppercase">
              <FlaskConical className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Sheet reference
            </div>
            <p className="mt-1.5 text-sm text-navy-500">
              Chemical usage &mdash; Guston Group classification sheet
            </p>
          </div>
        </div>
      </div>

      {/* --------------------------------------------- Usage tables */}
      {chemicalRanges.map((range) => (
        <section
          key={range.id}
          className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm"
        >
          {/* Range banner */}
          <div className="flex items-center gap-3 border-b border-navy-100 bg-navy-50/70 px-4 py-3 sm:px-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sheet-600 text-xs font-bold text-white">
              {range.lines.length}
            </span>
            <div>
              <h2 className="text-sm font-bold text-navy-900">Range {range.label}</h2>
              <p className="text-xs text-navy-500">
                {range.lines.join(" · ")} — chemical loading &amp; end weight
              </p>
            </div>

            <p className="ml-auto hidden rounded-md bg-sheet-50 px-2.5 py-1.5 text-[11px] font-medium text-sheet-700 lg:block">
              End Weight = Start Weight − (After − Before)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy-100">
                  <th
                    scope="col"
                    className="w-24 px-3 py-3 text-left text-xs font-semibold tracking-wide text-navy-600 uppercase"
                  >
                    Line
                  </th>

                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-semibold tracking-wide text-navy-600 uppercase"
                  >
                    Chemical
                  </th>

                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-semibold tracking-wide text-navy-600 uppercase"
                  >
                    Start Weight
                  </th>

                  {/* The sheet groups Before + After under "Chemical Loading". */}
                  <th scope="colgroup" colSpan={2} className="px-3 py-2">
                    <span
                      className={`block rounded-md px-3 py-1.5 text-xs font-bold tracking-wide uppercase ${BAND}`}
                    >
                      Chemical Loading
                    </span>
                  </th>

                  <th scope="col" className="px-3 py-2">
                    <span
                      className={`block rounded-md px-3 py-1.5 text-xs font-bold tracking-wide uppercase ${BAND}`}
                    >
                      End Weight
                    </span>
                  </th>
                </tr>
                <tr className="border-b border-navy-100">
                  <th scope="col" className="px-3 pb-2 text-left text-xs font-semibold text-navy-400">
                    <span className="sr-only">Line</span>
                  </th>
                  <th scope="col" className="px-3 pb-2 text-center text-xs font-semibold text-navy-400">
                    <span className="sr-only">Chemical</span>
                  </th>
                  <th scope="col" className="px-3 pb-2 text-center text-xs font-semibold text-navy-400">
                    <span className="sr-only">Start Weight</span>
                  </th>
                  <th scope="col" className="px-3 pb-2 text-center text-xs font-semibold text-navy-600 uppercase">
                    Before
                  </th>
                  <th scope="col" className="px-3 pb-2 text-center text-xs font-semibold text-navy-600 uppercase">
                    After
                  </th>
                  <th scope="col" className="px-3 pb-2 text-center text-xs font-semibold text-navy-400">
                    <span className="sr-only">End Weight</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows
                  .filter((row) => row.range === range.label)
                  .map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-navy-50 transition last:border-b-0 hover:bg-navy-50/40"
                    >
                      {/* Line */}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex min-w-9 items-center justify-center rounded-md bg-sheet-100 px-2 py-1 text-xs font-bold text-sheet-800">
                          {row.line}
                        </span>
                      </td>

                      {/* Chemical */}
                      <td className="px-3 py-2.5">
                        <CellInput
                          ariaLabel={`Chemical for ${range.label} ${row.line}`}
                          value={row.chemical}
                          placeholder="Text Box"
                          onChange={(value) => updateRow(row.id, { chemical: value })}
                        />
                      </td>

                      {/* Start Weight */}
                      <td className="px-3 py-2.5">
                        <CellInput
                          ariaLabel={`Start weight for ${range.label} ${row.line}`}
                          value={row.startWeight}
                          placeholder="Text Box"
                          inputMode="decimal"
                          onChange={(value) =>
                            updateRow(row.id, { startWeight: value })
                          }
                        />
                      </td>

                      {/* Before */}
                      <td className="px-3 py-2.5">
                        <CellInput
                          ariaLabel={`Weight before loading for ${range.label} ${row.line}`}
                          value={row.before}
                          placeholder="Text Box"
                          inputMode="decimal"
                          onChange={(value) => updateRow(row.id, { before: value })}
                        />
                      </td>

                      {/* After */}
                      <td className="px-3 py-2.5">
                        <CellInput
                          ariaLabel={`Weight after loading for ${range.label} ${row.line}`}
                          value={row.after}
                          placeholder="Text Box"
                          inputMode="decimal"
                          onChange={(value) => updateRow(row.id, { after: value })}
                        />
                      </td>

                      {/* End Weight - computed */}
                      <td className="px-3 py-2.5">
                        <ComputedCell
                          value={formatWeight(endWeight(row)) || "—"}
                          highlight={endWeight(row) !== null}
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* --------------------------------------------- Summary + actions */}
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <TotalChip
            label="Chemical loaded"
            value={formatWeight(summary.chemical)}
            accent
            icon={FlaskConical}
          />
          <TotalChip
            label="End weight total"
            value={formatWeight(summary.end)}
            icon={Scale}
          />
          <TotalChip
            label="Lines completed"
            value={`${summary.filled} / ${rows.length}`}
            unit=""
            icon={CheckCircle2}
          />
        </div>
        {summary.invalid > 0 ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3 text-xs text-navy-700">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-navy-600"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span>
              {summary.invalid} weight {summary.invalid === 1 ? "value" : "values"}{" "}
              could not be read. Use plain numbers, for example <strong>12.5</strong>.
            </span>
          </p>
        ) : null}

        {saved ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-sheet-600 bg-sheet-600 px-4 py-3 text-xs font-semibold text-white">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            Usage sheet captured for {date || "today"} &middot; {shift || "no shift"}.
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-navy-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Clear
          </button>

          <button
            type="button"
            onClick={() => setSaved(true)}
            disabled={summary.invalid > 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sheet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sheet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sheet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Submit usage
          </button>
        </div>
      </div>
    </div>
  );
}
