import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { navigationItems } from "@/lib/navigation";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl bg-navy-900 px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-navy-300 uppercase">
          Welcome back
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Chemical Usage Tracking
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-navy-200">
          Record every chemical used on the production floor, monitor consumption
          and keep the master catalogue accurate &mdash; all from one place.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col rounded-xl border border-navy-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-800 transition group-hover:bg-navy-800 group-hover:text-white">
              <item.icon
                className="h-5 w-5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>

            <p className="mt-4 text-sm font-semibold text-navy-900">
              {item.label}
            </p>
            <p className="mt-1.5 flex-1 text-xs leading-relaxed text-navy-500">
              {item.description}
            </p>

            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700">
              Open module
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
