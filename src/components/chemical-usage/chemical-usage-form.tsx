"use client";

import { Fragment, useMemo, useState } from "react";
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
  CellSelect,
  SelectField,
  TextField,
} from "@/components/chemical-usage/form-controls";
import {
  applyChemicalSelection,
  chemicalLoaded,
  chemicalRanges,
  chemicals,
  createEmptyRows,
  enteredEndWeight,
  formatWeight,
  shifts,
  validateRow,
  type ChemicalUsageRow,
  type RowIssue,
  type WeightField,
} from "@/lib/chemical-usage";
import { useCellNavigation } from "@/components/chemical-usage/use-cell-navigation";
import { saveChemicalLoadingRecords, getChemicalId } from "@/app/dashboard/chemical-usage-input/actions";

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
 * Before, After) and the `End Weight` column, which the operator enters by
 * hand once loading is finished.
 */
export function ChemicalUsageForm({
  createdBy,
}: {
  createdBy: string | null;
}) {
  const [date, setDate] = useState("");
  const [shift, setShift] = useState("");
  const [rows, setRows] = useState<ChemicalUsageRow[]>(createEmptyRows);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedRowsCount, setSavedRowsCount] = useState(0);

  /** One UUID per loading session, shared by every record saved from this form. */
  const batchId = useMemo(() => crypto.randomUUID(), []);

  /**
   * Arrow-key navigation between the weight cells.
   *
   * The rows are flattened in the order they are rendered, so moving down
   * from the last line of a range lands on the first line of the next one.
   */
  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const { register, handleKeyDown } = useCellNavigation(rowIds);

  function updateRow(id: string, patch: Partial<ChemicalUsageRow>) {
    setSaved(false);
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  /**
   * Record the chemical picked for a line.
   *
   * `No Chemical` also fills the four weight cells with zeros, so the sheet
   * shows a line that was not loaded rather than an empty one.
   */
  function selectChemical(id: string, chemical: string) {
    setSaved(false);
    setRows((current) =>
      current.map((row) =>
        row.id === id ? applyChemicalSelection(row, chemical) : row,
      ),
    );
  }

  function resetForm() {
    setDate("");
    setShift("");
    setRows(createEmptyRows());
    setSaved(false);
    setSubmitting(false);
    setSaveError(null);
    setSaveSuccess(false);
    setSavedRowsCount(0);
  }

  /**
   * Round a weight to 3 decimal places for NUMERIC(18,3) compatibility.
   */
  function round3(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  /**
   * Save all non-empty rows to Supabase as one loading session (one BatchID).
   * Skips completely empty lines, maps chemical names to integer IDs,
   * prevents duplicate submissions, and reports success or error.
   */
  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Resolve chemical names to integer IDs (may throw).
      const chemicalIdByName = new Map<string, number | null>();
      for (const row of rows) {
        if (!chemicalIdByName.has(row.chemical)) {
          chemicalIdByName.set(row.chemical, await getChemicalId(row.chemical));
        }
      }

      // Build insert payload: skip completely empty lines.
      const inputs: { rangeCode: string; lineCode: string; chemicalId: number | null; startWeight: number | null; beforeWeight: number | null; afterWeight: number | null; endWeight: number | null }[] = [];

      for (const row of rows) {
        const hasChemical = row.chemical.trim() !== "";
        const hasStart = row.startWeight.trim() !== "";
        const hasBefore = row.before.trim() !== "";
        const hasAfter = row.after.trim() !== "";
        const hasEnd = row.endWeight.trim() !== "";

        // Skip completely empty lines.
        if (!hasChemical && !hasStart && !hasBefore && !hasAfter && !hasEnd) {
          continue;
        }

        // Validate numeric inputs: any non-empty weight cell must be a valid number.
        const startWeight = hasStart ? (() => {
          const v = parseFloat(row.startWeight);
          return Number.isFinite(v) ? round3(v) : null;
        })() : null;
        const beforeWeight = hasBefore ? (() => {
          const v = parseFloat(row.before);
          return Number.isFinite(v) ? round3(v) : null;
        })() : null;
        const afterWeight = hasAfter ? (() => {
          const v = parseFloat(row.after);
          return Number.isFinite(v) ? round3(v) : null;
        })() : null;
        const endWeight = hasEnd ? (() => {
          const v = parseFloat(row.endWeight);
          return Number.isFinite(v) ? round3(v) : null;
        })() : null;

        // If a weight cell was filled but unreadable, reject the whole save.
        if (
          (hasStart && startWeight === null) ||
          (hasBefore && beforeWeight === null) ||
          (hasAfter && afterWeight === null) ||
          (hasEnd && endWeight === null)
        ) {
          setSaveError("Please fix unreadable weight values before saving.");
          setSubmitting(false);
          return;
        }

        inputs.push({
          rangeCode: row.range,
          lineCode: row.line,
          chemicalId: chemicalIdByName.get(row.chemical) ?? null,
          startWeight,
          beforeWeight,
          afterWeight,
          endWeight,
        });
      }

      if (inputs.length === 0) {
        setSaveError("No data to save. Enter at least one line with a chemical or weight.");
        setSubmitting(false);
        return;
      }

      const result = await saveChemicalLoadingRecords(batchId, inputs, createdBy);

      if (!result.success) {
        setSaveError(result.error || "Failed to save to Supabase.");
        setSubmitting(false);
        return;
      }

      setSaveSuccess(true);
      setSavedRowsCount(result.inserted ?? 0);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unexpected error saving to Supabase.");
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }

  const summary = useMemo(() => {
    let chemical = 0;
    let end = 0;
    let filled = 0;
    let invalid = 0;
    let ordering = 0;
    const issuesByRow = new Map<string, RowIssue[]>();

    for (const row of rows) {
      const loaded = chemicalLoaded(row);
      const remaining = enteredEndWeight(row);

      if (
        row.chemical.trim() ||
        row.startWeight.trim() ||
        row.endWeight.trim()
      ) {
        filled += 1;
      }

      const issues = validateRow(row);
      if (issues.length > 0) {
        issuesByRow.set(row.id, issues);
      }
      for (const issue of issues) {
        // Unreadable entries are counted per cell so the warning matches the
        // number of values the operator has to correct.
        if (issue.code === "unreadable") invalid += issue.fields.length;
        else ordering += 1;
      }

      if (loaded !== null) chemical += loaded;
      if (remaining !== null) end += remaining;
    }

    return { chemical, end, filled, invalid, ordering, issuesByRow };
  }, [rows]);

  /** True when the given weight cell of a row holds a rejected value. */
  function isInvalid(row: ChemicalUsageRow, field: WeightField): boolean {
    const issues = summary.issuesByRow.get(row.id);
    if (!issues) return false;
    return issues.some((issue) => issue.fields.includes(field));
  }

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
              End weight is entered manually after loading
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
                  .map((row) => {
                    const rowIssues = summary.issuesByRow.get(row.id) ?? [];

                    return (
                      <Fragment key={row.id}>
                        <tr className="border-b border-navy-50 transition last:border-b-0 hover:bg-navy-50/40">
                          {/* Line */}
                          <td className="px-3 py-2.5">
                            <span className="inline-flex min-w-9 items-center justify-center rounded-md bg-sheet-100 px-2 py-1 text-xs font-bold text-sheet-800">
                              {row.line}
                            </span>
                          </td>

                          {/* Chemical */}
                          <td className="px-3 py-2.5">
                            <CellSelect
                              ariaLabel={`Chemical for ${range.label} ${row.line}`}
                              value={row.chemical}
                              options={chemicals}
                              onChange={(value) => selectChemical(row.id, value)}
                            />
                          </td>

                          {/* Start Weight */}
                          <td className="px-3 py-2.5">
                            <CellInput
                              ariaLabel={`Start weight for ${range.label} ${row.line}`}
                              value={row.startWeight}
                              inputMode="decimal"
                              invalid={isInvalid(row, "startWeight")}
                              ref={register(row.id, "startWeight")}
                              navRow={row.id}
                              navField="startWeight"
                              onKeyDown={handleKeyDown}
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
                              inputMode="decimal"
                              invalid={isInvalid(row, "before")}
                              ref={register(row.id, "before")}
                              navRow={row.id}
                              navField="before"
                              onKeyDown={handleKeyDown}
                              onChange={(value) =>
                                updateRow(row.id, { before: value })
                              }
                            />
                          </td>

                          {/* After */}
                          <td className="px-3 py-2.5">
                            <CellInput
                              ariaLabel={`Weight after loading for ${range.label} ${row.line}`}
                              value={row.after}
                              inputMode="decimal"
                              invalid={isInvalid(row, "after")}
                              ref={register(row.id, "after")}
                              navRow={row.id}
                              navField="after"
                              onKeyDown={handleKeyDown}
                              onChange={(value) =>
                                updateRow(row.id, { after: value })
                              }
                            />
                          </td>

                          {/* End Weight - entered by the operator */}
                          <td className="px-3 py-2.5">
                            <CellInput
                              ariaLabel={`End weight for ${range.label} ${row.line}`}
                              value={row.endWeight}
                              inputMode="decimal"
                              invalid={isInvalid(row, "endWeight")}
                              ref={register(row.id, "endWeight")}
                              navRow={row.id}
                              navField="endWeight"
                              onKeyDown={handleKeyDown}
                              onChange={(value) =>
                                updateRow(row.id, { endWeight: value })
                              }
                            />
                          </td>
                        </tr>

                        {/* Inline explanation of what is wrong with this row. */}
                        {rowIssues.length > 0 ? (
                          <tr className="border-b border-navy-50 bg-red-50/50">
                            <td colSpan={6} className="px-3 pb-3">
                              <ul className="flex flex-col gap-1">
                                {rowIssues.map((issue) => (
                                  <li
                                    key={issue.code}
                                    className="flex items-start gap-1.5 text-xs font-medium text-red-700"
                                  >
                                    <AlertCircle
                                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                      strokeWidth={2}
                                      aria-hidden="true"
                                    />
                                    <span>{issue.message}</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
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

        {summary.ordering > 0 ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span>
              {summary.ordering} {summary.ordering === 1 ? "line has" : "lines have"}{" "}
              weights in the wrong order. Start Weight must be less than or equal to
              End Weight, and Before must be less than or equal to After.
            </span>
          </p>
        ) : null}

        {saveSuccess ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-sheet-600 bg-sheet-600 px-4 py-3 text-xs font-semibold text-white">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            Saved to database — {savedRowsCount} record{savedRowsCount === 1 ? "" : "s"} written to ChemicalLoadingRecords.
          </p>
        ) : null}

        {saveError ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" strokeWidth={1.8} aria-hidden="true" />
            <span>Save failed: {saveError}</span>
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
            onClick={handleSubmit}
            disabled={submitting || summary.invalid > 0 || summary.ordering > 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sheet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sheet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sheet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="animate-spin block h-4 w-4 border-2 border-white/30 border-t-white rounded-full" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Submit usage
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
