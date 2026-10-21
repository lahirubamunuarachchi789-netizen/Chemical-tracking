/**
 * Row shape of the `users` table in Supabase.
 *
 * id         -> uuid / int primary key
 * username   -> text, unique, used as the login identifier
 * password   -> text, bcrypt hash of the user's password
 * created_at -> timestamptz
 */
export interface AppUser {
  id: string | number;
  username: string;
  password: string;
  created_at?: string | null;
}

/** Shape returned to the client (never includes the password hash). */
export interface SafeUser {
  id: string | number;
  username: string;
}

/** Decoded JWT session payload stored in the httpOnly cookie. */
export interface SessionPayload {
  userId: string | number;
  username: string;
  issuedAt: number;
  expiresAt: number;
}
