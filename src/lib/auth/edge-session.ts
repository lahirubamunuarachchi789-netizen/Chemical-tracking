import { jwtVerify } from "jose";

/**
 * Edge-runtime session verification.
 *
 * The Middleware runs on the Edge Runtime, so it cannot import the
 * `server-only` session module. This is a trimmed, edge-safe copy that only
 * needs to answer "is this cookie a valid, unexpired session token?".
 *
 * Uses `jose` (WebCrypto based) so it works in the Edge Runtime.
 */
export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    console.error(
      "AUTH_SESSION_SECRET is missing or too short - treating session as invalid.",
    );
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });

    return Boolean(payload.sub) && typeof payload.username === "string";
  } catch {
    // Expired, tampered or malformed token - not a valid session.
    return false;
  }
}