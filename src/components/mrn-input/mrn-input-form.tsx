"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RotateCcw, Send } from "lucide-react";

import { SelectField, TextField } from "@/components/chemical-usage/form-controls";
import { chemicals } from "@/lib/chemical-usage";
import {
  saveMrnRecords,
  type MrnRecordInput,
} from "@/app/dashboard/mrn-input/actions";

/** Number of chemical + Poly / ISO sets in the MRN sheet. */
const SET_COUNT = 10;

interface MrnRow {
  chemical: string;
  poly: string;
  iso: string;
}

function createEmptyRows(): MrnRow[] {
  return Array.from({ length: SET_COUNT }, () => ({
    chemical: "",
    poly: "",
    iso: "",
  }));
}

/** Round to 3 decimals, matching the numeric(18,3) columns. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * MRN Input form.
 *
 * Mirrors the MRN sheet: ten sets, each row holding a Chemical dropdown and
 * two weight boxes, Poly and ISO. Rows are left-to-right in the same order as
 * the sheet, followed by a single Submit button that writes the filled sets
 * as one batch.
 */
export function MrnInputForm({ createdBy }: { createdBy: string | null }) {
  const [rows, setRows] = useState<MrnRow[]>(createEmptyRows);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedRowsCount, setSavedRowsCount] = useState(0);

  /** One UUID per submission, shared by every row saved from this form. */
  const batchId = useMemo(() => crypto.randomUUID(), []);

  function updateRow(index: number, patch: Partial<MrnRow>) {
    setRows((current) =>
      current.map((row, position) =>
        position === index ? { ...row, ...patch } : row
      )
    );
    setSaveSuccess(false);
  }

  function resetForm() {
    setRows(createEmptyRows());
    setSaveError(null);
    setSaveSuccess(false);
  }

  /** Rows that carry any data at all. */
  const summary = useMemo(() => {
    let filled = 0;
    let invalid = 0;

    for (const row of rows) {
      const hasChemical = row.chemical.trim() !== "";
      const hasPoly = row.poly.trim() !== "";
      const hasIso = row.iso.trim() !== "";

      if (!hasChemical && !hasPoly && !hasIso) continue;
      filled += 1;

      for (const raw of [row.poly, row.iso]) {
        if (raw.trim() === "") continue;
        const parsed = parseFloat(raw);
        if (!Number.isFinite(parsed) || parsed < 0) invalid += 1;
      }
    }

    return { filled, invalid };
  }, [rows]);

  async function handleSubmit() {
    if (submitting) return;
    setSaveError(null);
    setSaveSuccess(false);

    const inputs: MrnRecordInput[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const hasChemical = row.chemical.trim() !== "";
      const hasPoly = row.poly.trim() !== "";
      const hasIso = row.iso.trim() !== "";

      // Skip sets that were left completely empty.
      if (!hasChemical && !hasPoly && !hasIso) continue;

      const polyWeight = hasPoly ? parseFloat(row.poly) : null;
      const isoWeight = hasIso ? parseFloat(row.iso) : null;

      // Any filled weight box must be a readable, non-negative number.
      if (
        (hasPoly && (polyWeight === null || !Number.isFinite(polyWeight) || polyWeight < 0)) ||
        (hasIso && (isoWeight === null || !Number.isFinite(isoWeight) || isoWeight < 0))
      ) {
        setSaveError("Please fix unreadable weight values before submitting.");
        return;
      }

      inputs.push({
        setIndex: index + 1,
        chemical: hasChemical ? row.chemical : null,
        polyWeight: polyWeight === null ? null : round3(polyWeight),
        isoWeight: isoWeight === null ? null : round3(isoWeight),
      });
    }

    if (inputs.length === 0) {
      setSaveError("No data to submit. Fill in at least one set.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await saveMrnRecords(batchId, inputs, createdBy);

      if (!result.success) {
        setSaveError(result.error || "Failed to save to Supabase.");
        return;
      }

      setSaveSuccess(true);
      setSavedRowsCount(result.inserted ?? 0);
      setRows(createEmptyRows());
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Unexpected error saving to Supabase."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="mt-6 overflow-hidden rounded-2xl border-navy-100 bg-white shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      {/* -------------------------------------------------- Band */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sheet-700 bg-sheet-600 px-5 py-4 text-white sm:px-6">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            MRN sheet
          </h2>
          <p className="mt-0.5 text-xs text-sheet-100">
            {SET_COUNT} sets · chemical type with Poly and ISO weights
          </p>
        </div>

        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">
          {summary.filled} of {SET_COUNT} filled
        </span>
      </div>

      {/* -------------------------------------------------- Header row */}
      <div className="hidden border-b border-navy-100 bg-navy-50/60 px-5 py-2.5 text-[11px] font-semibold tracking-wider text-navy-500 uppercase sm:grid sm:grid-cols-[3.5rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4 sm:px-6">
        <span>Set</span>
        <span>Chemical dropdown list</span>
        <span>Poly</span>
        <span>ISO</span>
      </div>

      {/* -------------------------------------------------- Sets */}
      <ol className="divide-y divide-navy-100">
        {rows.map((row, index) => {
          const setNumber = index + 1;

          return (
            <li
              key={setNumber}
              className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[3.5rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end sm:gap-4 sm:px-6"
            >
              <span className="flex h-9 items-center text-xs font-semibold text-navy-500 tabular-nums">
                <span className="rounded-md bg-navy-50 px-2 py-1">
                  #{setNumber}
                </span>
              </span>

              <SelectField
                label="Chemical"
                className="sm:[&>label]:sr-only"
                value={row.chemical}
                onChange={(value) => updateRow(index, { chemical: value })}
                options={chemicals}
              />

              <TextField
                label="Poly"
                className="sm:[&>label]:sr-only"
                value={row.poly}
                onChange={(value) => updateRow(index, { poly: value })}
                placeholder="0.000"
                inputMode="decimal"
                suffix="kg"
              />

              <TextField
                label="ISO"
                className="sm:[&>label]:sr-only"
                value={row.iso}
                onChange={(value) => updateRow(index, { iso: value })}
                placeholder="0.000"
                inputMode="decimal"
                suffix="kg"
              />
            </li>
          );
        })}
      </ol>

      {/* -------------------------------------------------- Footer */}
      <div className="border-t border-navy-100 bg-navy-50/40 px-5 py-4 sm:px-6">
        {summary.invalid > 0 ? (
          <p className="mb-3 flex items-start gap-2 rounded-xl border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span>
              {summary.invalid} weight {summary.invalid === 1 ? "box has" : "boxes have"}{" "}
              a value that is not a valid number. Enter weights as plain numbers,
              for example 12.5.
            </span>
          </p>
        ) : null}

        {saveSuccess ? (
          <p className="mb-3 flex items-center gap-2 rounded-xl border-sheet-600 bg-sheet-600 px-4 py-3 text-xs font-semibold text-white">
            <CheckCircle2
              className="h-4 w-4 shrink-0"
              strokeWidth={2}
              aria-hidden="true"
            />
            Saved to database — {savedRowsCount} set
            {savedRowsCount === 1 ? "" : "s"} written to MRNRecords.
          </p>
        ) : null}

        {saveError ? (
          <p className="mb-3 flex items-start gap-2 rounded-xl border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span>Save failed: {saveError}</span>
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Clear
          </button>

          <button
            type="submit"
            disabled={submitting || summary.invalid > 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sheet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sheet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sheet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span
                  className="block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden="true"
                />
                Saving…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
