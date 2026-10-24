"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";

/**
 * One MRN row: the chemical issued plus the Poly and ISO weights recorded
 * against it. Both weights are optional so a row can hold only one of them.
 */
export interface MrnRecordInput {
  /** 1-based position of the set in the sheet (1..10). */
  setIndex: number;
  /** Chemical name from the dropdown, or null when the row was left empty. */
  chemical: string | null;
  polyWeight: number | null;
  isoWeight: number | null;
}

/** Result of an MRN save operation. */
export interface MrnSaveResult {
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
 * Persist one MRN submission.
 *
 * Every row in `inputs` shares the same `batchId`, so a submission can be
 * read back as a single sheet. `createdBy` falls back to the session
 * username when the caller does not pass one.
 */
export async function saveMrnRecords(
  batchId: string,
  inputs: MrnRecordInput[],
  createdBy: string | null,
): Promise<MrnSaveResult> {
  const username = await getCurrentUsername();
  const finalCreatedBy = createdBy ?? username ?? null;

  const supabase = createServerSupabaseClient();

  const rows = inputs.map((input) => ({
    BatchID: batchId,
    SetIndex: input.setIndex,
    Chemical: input.chemical,
    PolyWeight: input.polyWeight,
    IsoWeight: input.isoWeight,
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
