import { redirect } from "next/navigation";

import { getSessionToken } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const token = await getSessionToken();
  const session = await verifySessionToken(token);

  redirect(session ? "/dashboard" : "/login");
}
