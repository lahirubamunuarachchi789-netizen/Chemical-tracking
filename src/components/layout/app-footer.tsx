"use client";

import { Sparkles } from "lucide-react";

/**
 * Application footer shown on every interface.
 *
 * A subtle signature band that sits at the bottom of the page. It uses a
 * gradient hairline above the credit text so it feels like a stamp rather
 * than a heavy footer, and it stays legible on both mobile and desktop.
 */
export function AppFooter() {
  return (
    <footer
      className="mt-auto border-t border-navy-100 bg-gradient-to-b from-navy-50/50 to-transparent px-5 py-6 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-end">
        <span className="text-[11px] font-medium text-navy-400 tracking-wide uppercase">
          Developed and Designed by Lahiru Bamunuarachchi
        </span>
        <Sparkles
          className="h-3.5 w-3.5 text-navy-300 animate-pulse"
          aria-hidden="true"
        />
      </div>
    </footer>
  );
}
