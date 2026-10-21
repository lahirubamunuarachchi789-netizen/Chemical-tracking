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

/** Format a computed weight for display; empty string when not computable. */
export function formatWeight(value: number | null): string {
  if (value === null) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
