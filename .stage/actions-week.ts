"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";
import { NO_CHEMICAL } from "@/lib/chemical-usage";

/**
 * One MRN row: the chemical issued plus the Poly and ISO weights recorded
 * against it. Weights are always numbers; "no chemical" rows carry 0.
 */
export interface MrnRecordInput {
  /** 1-based position of the set in the sheet (1..10). */
  setIndex: number;
  /** Chemical name from the dropdown, or null when the row was left empty. */
  chemical: string | null;
  polyWeight: number;
  isoWeight: number;
}

/** Result of an MRN save operation. */
export interface MrnSaveResult {
  success: boolean;
  error?: string;
  inserted?: number;
}

/** Round to 3 decimals, matching the numeric(18,3) columns. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * True when the row should store zero weights regardless of what was typed:
 * the user chose "No Chemical", so there is nothing loaded.
 */
function isNoChemical(chemical: string | null): boolean {
  return chemical === NO_CHEMICAL;
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
 * Persist one MRN submission.
 *
 * Every row in `inputs` shares the same `batchId` and the same `week`, so a
 * submission can be read back as a single sheet. `created_at` is stamped by
 * the database. `createdBy` falls back to the session username when the
 * caller does not pass one.
 */
export async function saveMrnRecords(
  batchId: string,
  week: number,
  inputs: MrnRecordInput[],
  createdBy: string | null,
): Promise<MrnSaveResult> {
  if (!Number.isInteger(week) || week < 1 || week > 53) {
    return { success: false, error: "Select a valid week (1-53) before saving." };
  }

  if (inputs.length === 0) {
    return { success: false, error: "No data to submit." };
  }

  const username = await getCurrentUsername();
  const finalCreatedBy = createdBy ?? username ?? null;

  const supabase = createServerSupabaseClient();

  const rows = inputs.map((input) => ({
    BatchID: batchId,
    SetIndex: input.setIndex,
    Chemical: input.chemical,
    // "No Chemical" means nothing was loaded, so the weights are forced to 0
    // here as well as in the form — the rule cannot be bypassed by the client.
    Poly: isNoChemical(input.chemical) ? 0 : round3(input.polyWeight),
    ISO: isNoChemical(input.chemical) ? 0 : round3(input.isoWeight),
    week,
    CreatedBy: finalCreatedBy,
  }));

  const { error } = await supabase
    .from("MRNRecords")
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
