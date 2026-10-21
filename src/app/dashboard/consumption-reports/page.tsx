import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Consumption Reports" };

export default function ConsumptionReportsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Consumption Reports"
        description="Review consumption trends, spot overuse and cost drift, and export a clear audit trail for safety and regulatory reviews."
        icon={BarChart3}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total consumption", value: "—" },
          { label: "Chemicals used", value: "—" },
          { label: "Overuse alerts", value: "—" },
          { label: "Reporting period", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm"
          >
            <p className="text-[11px] font-semibold tracking-[0.12em] text-navy-400 uppercase">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-navy-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-navy-900">Report builder</p>
        <p className="mt-1.5 text-sm text-navy-500">
          Filter by date range, chemical or process line to build a consumption
          report.
        </p>

        <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-navy-200 bg-navy-50/60">
          <p className="text-xs text-navy-400">
            Chart and report output will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
