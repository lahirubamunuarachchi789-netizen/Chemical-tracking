import "server-only";

import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/** Hash a plain-text password with bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a plain-text password against a stored hash.
 *
 * Supports two storage formats so that legacy plaintext rows in the `users`
 * table keep working until they are migrated to a bcrypt hash:
 *   - bcrypt hash  -> "$2a$..." / "$2b$..." / "$2y$..."
 *   - plain text   -> anything else (compared with a timing-safe check)
 */
export async function verifyPassword(
  password: string,
  storedValue: string,
): Promise<boolean> {
  if (!storedValue) return false;

  if (isBcryptHash(storedValue)) {
    return bcrypt.compare(password, storedValue);
  }

  return safeEquals(password, storedValue);
}

/** True when the stored value looks like a bcrypt hash. */
export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

/** Constant-time string comparison to avoid leaking length/content via timing. */
function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
