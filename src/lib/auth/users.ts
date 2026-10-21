import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppUser, SafeUser } from "@/types/user";

/**
 * Look up a user by username (case-insensitive) in the `users` table.
 * Returns the full row (including the password hash) - never send this to a client.
 */
export async function findUserByUsername(
  username: string,
): Promise<AppUser | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, username, password, created_at")
    .ilike("username", username)
    .limit(1);

  if (error) {
    throw new Error(`Failed to query users table: ${error.message}`);
  }

  const row = (data as AppUser[] | null)?.[0];
  if (!row) return null;

  return row;
}

/** Insert a new user into the `users` table. */
export async function createUser(
  username: string,
  passwordHash: string,
): Promise<SafeUser> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .insert({ username, password: passwordHash })
    .select("id, username")
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data as SafeUser;
}

/**
 * Replace a plaintext password with a bcrypt hash (one-way migration).
 * Safe to call repeatedly - already-hashed values are left untouched.
 */
export async function upgradePasswordHash(
  userId: string | number,
  currentStoredValue: string,
  newHash: string,
): Promise<void> {
  const { isBcryptHash } = await import("@/lib/auth/password");
  if (isBcryptHash(currentStoredValue)) return;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({ password: newHash })
    .eq("id", userId);

  if (error) {
    console.error("Failed to upgrade password hash:", error.message);
  }
}
