import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/cookies";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/session";
import { findUserByUsername, upgradePasswordHash } from "@/lib/auth/users";

export const runtime = "nodejs";

/** POST /api/auth/login - authenticate against the `users` table. */
export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }

  try {
    const user = await findUserByUsername(username);

    // Generic message so we never reveal whether the username exists.
    const invalidCredentials = NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 },
    );

    if (!user) {
      // Small delay to reduce user-enumeration timing differences.
      await hashPassword(password);
      return invalidCredentials;
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return invalidCredentials;
    }

    // Opportunistically upgrade legacy plaintext rows to a bcrypt hash.
    await upgradePasswordHash(user.id, user.password, await hashPassword(password));

    const token = await createSessionToken(user.id, user.username);
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Unable to sign in right now. Please try again." },
      { status: 500 },
    );
  }
}
