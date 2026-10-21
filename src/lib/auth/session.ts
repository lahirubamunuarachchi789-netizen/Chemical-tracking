import "server-only";

import { SignJWT, jwtVerify } from "jose";

import type { SessionPayload } from "@/types/user";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export { SESSION_COOKIE_NAME };
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SESSION_SECRET is missing or too short. It must be at least 32 characters.",
    );
  }

  return new TextEncoder().encode(secret);
}

/** Create a signed session token for the given user. */
export async function createSessionToken(
  userId: string | number,
  username: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION_SECONDS)
    .sign(getSecretKey());
}

/** Verify a session token and return its payload, or null when invalid/expired. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.username !== "string") {
      return null;
    }

    const issuedAt = payload.iat ?? 0;
    const expiresAt = payload.exp ?? 0;

    return {
      userId: payload.sub,
      username: payload.username,
      issuedAt,
      expiresAt,
    };
  } catch {
    return null;
  }
}
