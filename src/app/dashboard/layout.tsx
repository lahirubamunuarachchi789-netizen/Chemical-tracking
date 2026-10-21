import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { clearSessionCookie, getSessionToken } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Layout for every signed-in page.
 *
 * Guards the route server-side: without a valid session cookie the visitor is
 * redirected to the login screen and the unusable cookie is cleared.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getSessionToken();
  const session = await verifySessionToken(token);

  if (!session) {
    await clearSessionCookie();
    redirect("/login");
  }

  return <AppShell username={session.username}>{children}</AppShell>;
}
