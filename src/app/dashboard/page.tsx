import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const token = await getSessionToken();
  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-dvh bg-navy-50">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800">
              <FlaskConical className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-navy-900">Concord ChemTrack</p>
              <p className="text-[11px] text-navy-500">
                Signed in as {session.username}
              </p>
            </div>
          </div>

          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-navy-500">
          Authentication is working. Chemical usage modules (records, reports,
          inventory) will be added here next.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Chemical usage records",
            "Consumption reports",
            "Chemical master data",
          ].map((title) => (
            <div
              key={title}
              className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm"
            >
              <div className="h-10 w-10 rounded-lg bg-navy-50" />
              <p className="mt-4 text-sm font-semibold text-navy-900">{title}</p>
              <p className="mt-1 text-xs text-navy-400">Coming soon</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
