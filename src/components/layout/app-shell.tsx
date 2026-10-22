"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppFooter } from "@/components/layout/app-footer";

/**
 * Application shell for every signed-in page.
 *
 * Owns the slide-out sidebar and the top bar. The mobile drawer toggle lives
 * here because the sidebar itself is rendered off-canvas on small screens.
 */
export function AppShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-dvh bg-navy-50">
      <AppSidebar
        username={username}
        onSignOut={handleSignOut}
        isOpen={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        isSigningOut={isSigningOut}
      />

      <div className="lg:pl-72 flex flex-col min-h-dvh">
        {/* -------------------------------------------------- Top bar */}
        <header className="sticky top-0 z-20 border-b border-navy-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="flex items-center gap-3 px-5 py-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 text-navy-700 transition hover:bg-navy-50 lg:hidden"
              aria-label="Open navigation"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy-900">
                Concord ChemTrack
              </p>
              <p className="truncate text-[11px] text-navy-500">
                Signed in as {username}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-8 sm:py-10">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}
