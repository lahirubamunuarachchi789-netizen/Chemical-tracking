"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";
import { chemicals } from "@/lib/chemical-usage";

/**
 * Shape of a single row to be inserted into ChemicalLoadingRecords.
 */
export interface LoadingRecordInput {
  rangeCode: string;
  lineCode: string;
  chemicalId: number | null;
  startWeight: number | null;
  beforeWeight: number | null;
  afterWeight: number | null;
  endWeight: number | null;
}

/**
 * Result of a save operation.
 */
export interface SaveResult {
  success: boolean;
  error?: string;
  inserted?: number;
}

/**
 * Resolve the authenticated user's username from the session cookie.
 * Returns null when there is no valid session.
 */
async function getCurrentUsername(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.username ?? null;
}

/**
 * Fetch all chemicals from the reference table, ordered by name.
 * Used to populate the Chemical dropdown and to resolve name -> id.
 */
export async function getChemicals(): Promise<{ id: number; name: string }[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("chemicals")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load chemicals: ${error.message}`);
  }

  return (data as { id: number; name: string }[] ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }));
}

/**
 * Map of chemical name -> integer ID, reused from the existing
 * `chemicals` array in `chemical-usage.ts` (the same data source that
 * feeds the Chemical dropdown).
 *
 * IDs are assigned by position (index + 1), matching the seeded
 * `chemicals` table order (BASF Midsole=1 ... US Coim=6).
 * "No Chemical" maps to null.
 *
 * No database lookup is performed, so saving works even when the
 * `chemicals` reference table has not been created in Supabase.
 */
const CHEMICAL_ID_MAP: Record<string, number | null> = (() => {
  const map: Record<string, number | null> = {};
  chemicals.forEach((name, index) => {
    map[name] = name === "No Chemical" ? null : index + 1;
  });
  return map;
})();

/**
 * Look up the integer chemical ID for a given chemical name.
 * Returns null for "No Chemical" or when the name is not found.
 *
 * The mapping reuses the existing `chemicals` array from `chemical-usage.ts`.
 * No database query is performed.
 */
export async function getChemicalId(chemicalName: string): Promise<number | null> {
  if (!chemicalName || chemicalName.trim() === "") return null;
  if (chemicalName === "No Chemical") return null;
  return CHEMICAL_ID_MAP[chemicalName] ?? null;
}

/**
 * Persist one loading session's records to ChemicalLoadingRecords.
 *
 * All records in `inputs` share the same `batchId`. `createdBy` is the
 * authenticated user's username (may be null).
 *
 * Duplicate submission is prevented by the caller via a submitting flag.
 */
export async function saveChemicalLoadingRecords(
  batchId: string,
  inputs: LoadingRecordInput[],
  createdBy: string | null,
): Promise<SaveResult> {
  const username = await getCurrentUsername();
  const finalCreatedBy = createdBy ?? username ?? null;

  const supabase = createServerSupabaseClient();

  const rows = inputs.map((input) => ({
    "BatchID": batchId,
    "RangeCode": input.rangeCode,
    "LineCode": input.lineCode,
    "ChemicalID": input.chemicalId,
    "StartWeight": input.startWeight,
    "BeforeWeight": input.beforeWeight,
    "AfterWeight": input.afterWeight,
    "EndWeight": input.endWeight,
    "CreatedBy": finalCreatedBy,
    // CreatedAt uses the database default (now()).
  }));

  const { error } = await supabase
    .from('"ChemicalLoadingRecords"')
    .insert(rows as Record<string, unknown>[]);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    inserted: inputs.length,
  };
}
