/**
 * Domain model for the Chemical Usage Input sheet.
 *
 * Mirrors the layout of the "Guston Group - Classification" Excel sheet:
 *
 *   Date ................ Shift ................
 *   | Range | Line | Chemical Loading { Chemical | Start Weight | Before | After } | End Weight |
 *
 * Each physical row is one *line* of a *range* (e.g. range `RGE 01`, line `A1`).
 */

/** One physical row of the usage sheet. */
export interface ChemicalUsageRow {
  /** Stable React key / row id. */
  id: string;
  /** Range identifier, e.g. `RGE 01`. */
  range: string;
  /** Line within the range, e.g. `A1`. */
  line: string;
  /** Chemical loaded into the line (free text - batch / chemical name). */
  chemical: string;
  /** Weight of the chemical before loading, in kg. */
  before: string;
  /** Weight of the chemical after loading, in kg. */
  after: string;
  /** Stock weight of the line before the chemical was loaded, in kg. */
  startWeight: string;
  /**
   * Remaining stock weight of the line once loading is finished, in kg.
   *
   * Entered by the operator: the sheet leaves this cell blank, so the app
   * records what is typed rather than deriving it.
   */
  endWeight: string;
}

/** A range groups several lines that are loaded together. */
export interface ChemicalRange {
  id: string;
  label: string;
  lines: string[];
}

/** Ranges and their lines, in the order they appear on the sheet. */
export const chemicalRanges: ChemicalRange[] = [
  { id: "rge-01", label: "RGE 01", lines: ["A1", "B1", "A2", "B2"] },
  { id: "rge-02", label: "RGE 02", lines: ["A1", "B1"] },
];

/** Factory shifts offered in the Shift selector. */
export const shifts = ["Morning", "Evening", "Night"] as const;

export type Shift = (typeof shifts)[number];

/** Build the empty row set that matches the sheet structure. */
export function createEmptyRows(): ChemicalUsageRow[] {
  return chemicalRanges.flatMap((range) =>
    range.lines.map((line, index) => ({
      id: `${range.id}-${line}-${index}`,
      range: range.label,
      line,
      chemical: "",
      before: "",
      after: "",
      startWeight: "",
      endWeight: "",
    })),
  );
}

/** Parse a weight cell. Returns null when the cell is empty or not a number. */
export function parseWeight(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Weight of chemical loaded onto the line: `After - Before`. */
export function chemicalLoaded(row: ChemicalUsageRow): number | null {
  const after = parseWeight(row.after);
  const before = parseWeight(row.before);

  if (after === null || before === null) return null;
  return after - before;
}

/**
 * End weight of the line, as entered by the operator.
 *
 * The sheet leaves the End Weight cell blank, so the value is typed in rather
 * than derived. Returns null when the cell is empty or not a number.
 */
export function enteredEndWeight(row: ChemicalUsageRow): number | null {
  return parseWeight(row.endWeight);
}

/** Weight cells of a row that take part in a validation check. */
export type WeightField = "before" | "after" | "startWeight" | "endWeight";

/** Display name of each weight cell, used in validation messages. */
const WEIGHT_FIELD_LABELS: Record<WeightField, string> = {
  before: "Before",
  after: "After",
  startWeight: "Start Weight",
  endWeight: "End Weight",
};

/** A validation problem detected on a single row. */
export interface RowIssue {
  /** Machine-readable identifier of the problem. */
  code: "unreadable" | "afterBelowBefore" | "startAboveEnd";
  /** Cells involved, so the form knows which inputs to highlight. */
  fields: WeightField[];
  /** Human-readable description shown next to the offending row. */
  message: string;
}

/**
 * Validate a single usage row.
 *
 * Two orderings are enforced once both sides hold readable numbers:
 *
 *   - `Before` must be less than or equal to `After`, because the chemical
 *     loading is the difference between the two readings.
 *   - `Start Weight` must be less than or equal to `End Weight`, because the
 *     line can only get lighter once the chemical has been applied.
 *
 * A cell that is empty or unreadable is reported separately and is skipped by
 * the ordering checks, since there is nothing to compare it against.
 */
export function validateRow(row: ChemicalUsageRow): RowIssue[] {
  const issues: RowIssue[] = [];

  const before = parseWeight(row.before);
  const after = parseWeight(row.after);
  const start = parseWeight(row.startWeight);
  const end = parseWeight(row.endWeight);

  const unreadable: WeightField[] = [];
  if (row.before.trim() && before === null) unreadable.push("before");
  if (row.after.trim() && after === null) unreadable.push("after");
  if (row.startWeight.trim() && start === null) unreadable.push("startWeight");
  if (row.endWeight.trim() && end === null) unreadable.push("endWeight");

  if (unreadable.length > 0) {
    const labels = unreadable.map((field) => WEIGHT_FIELD_LABELS[field]);
    issues.push({
      code: "unreadable",
      fields: unreadable,
      message:
        `Could not read ${labels.join(", ")}. ` +
        "Use plain numbers, for example 12.5.",
    });
  }

  if (before !== null && after !== null && before > after) {
    issues.push({
      code: "afterBelowBefore",
      fields: ["before", "after"],
      message: "Before must be less than or equal to After.",
    });
  }

  if (start !== null && end !== null && start > end) {
    issues.push({
      code: "startAboveEnd",
      fields: ["startWeight", "endWeight"],
      message: "Start Weight must be less than or equal to End Weight.",
    });
  }

  return issues;
}

/** Format a computed weight for display; empty string when not computable. */
export function formatWeight(value: number | null): string {
  if (value === null) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
