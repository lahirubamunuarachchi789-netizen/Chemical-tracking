import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/cookies";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/session";
import { createUser, findUserByUsername } from "@/lib/auth/users";

export const runtime = "nodejs";

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;

/** POST /api/auth/register - create a new account in the `users` table. */
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

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      {
        error:
          "Username must be 3-32 characters and may only contain letters, numbers, dots, underscores or hyphens.",
      },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters long." },
      { status: 400 },
    );
  }

  try {
    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(username, passwordHash);

    const token = await createSessionToken(user.id, user.username);
    await setSessionCookie(token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Unable to create your account right now. Please try again." },
      { status: 500 },
    );
  }
}
