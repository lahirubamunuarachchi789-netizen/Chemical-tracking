"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  FlaskConical,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import { navigationItems } from "@/lib/navigation";

/**
 * Slide-out application sidebar.
 *
 * - On small screens it is off-canvas and slides in over the content behind a
 *   translucent navy overlay.
 * - On large screens it is pinned to the left and can be collapsed, in which
 *   case only the icons remain visible.
 */
export function AppSidebar({
  username,
  onSignOut,
  isOpen,
  onOpenChange,
  isSigningOut = false,
}: {
  username: string;
  onSignOut: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isSigningOut?: boolean;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scrolling while the drawer covers the screen.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close the drawer on Escape.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* -------------------------------------------------- Overlay (mobile) */}
      <div
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
        className={[
          "fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* -------------------------------------------------- Sidebar */}
      <aside
        aria-label="Main navigation"
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-900 text-white transition-transform duration-300 ease-out lg:translate-x-0",
          isCollapsed ? "lg:w-20" : "",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-5">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <FlaskConical
                className="h-5 w-5 text-white"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>
            <span
              className={[
                "min-w-0 leading-tight",
                isCollapsed ? "lg:hidden" : "",
              ].join(" ")}
            >
              <span className="block truncate text-base font-bold tracking-tight text-white">
                Concord <span className="font-medium">ChemTrack</span>
              </span>
              <span className="block truncate text-[10px] font-medium tracking-[0.14em] text-navy-200 uppercase">
                Concord Footwear
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-navy-200 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>


        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p
            className={[
              "px-3 pb-3 text-[10px] font-semibold tracking-[0.16em] text-navy-300 uppercase",
              isCollapsed ? "lg:hidden" : "",
            ].join(" ")}
          >
            Modules
          </p>

          <ul className="space-y-1.5">
            {navigationItems.map((item) => {
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={[
                      "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                      isCollapsed ? "lg:justify-center lg:px-2" : "",
                      active
                        ? "bg-white text-navy-900 shadow-sm"
                        : "text-navy-100 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
                        active
                          ? "bg-navy-900 text-white"
                          : "bg-white/10 text-white ring-1 ring-white/15 group-hover:bg-white/15",
                      ].join(" ")}
                    >
                      <item.icon
                        className="h-4.5 w-4.5"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </span>

                    <span
                      className={[
                        "min-w-0 flex-1 truncate",
                        isCollapsed ? "lg:hidden" : "",
                      ].join(" ")}
                    >
                      {item.label}
                    </span>

                    {active ? (
                      <ChevronRight
                        className={[
                          "h-4 w-4 shrink-0 text-navy-500",
                          isCollapsed ? "lg:hidden" : "",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>



        {/* User + sign out */}
        <div className="border-t border-white/10 px-3 py-4">
          <div
            className={[
              "flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3",
              isCollapsed ? "lg:justify-center lg:px-2" : "",
            ].join(" ")}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white ring-1 ring-white/20">
              {username.slice(0, 2).toUpperCase()}
            </span>
            <span
              className={[
                "min-w-0 flex-1 leading-tight",
                isCollapsed ? "lg:hidden" : "",
              ].join(" ")}
            >
              <span className="block truncate text-xs font-semibold text-white">
                {username}
              </span>
              <span className="block truncate text-[11px] text-navy-300">
                Signed in
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            disabled={isSigningOut}
            title={isCollapsed ? "Sign out" : undefined}
            className={[
              "mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-200 transition hover:bg-white/10 hover:text-white disabled:opacity-60",
              isCollapsed ? "lg:justify-center lg:px-2" : "",
            ].join(" ")}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className={isCollapsed ? "lg:hidden" : ""}>
              {isSigningOut ? "Signing out..." : "Sign out"}
            </span>
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------- Collapse toggle */}
      <button
        type="button"
        onClick={() => setIsCollapsed((value) => !value)}
        aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        className="fixed bottom-5 z-30 hidden h-9 w-9 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-700 shadow-sm transition hover:bg-navy-50 lg:flex"
        style={isCollapsed ? { left: "5.5rem" } : { left: "17.5rem" }}
      >
        {isCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </>
  );
}
