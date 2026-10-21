import { NextResponse } from "next/server";

import { getSessionToken } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/me - return the currently signed-in user (or null). */
export async function GET() {
  const token = await getSessionToken();
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: { id: session.userId, username: session.username },
  });
}
