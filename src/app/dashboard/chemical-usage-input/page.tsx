import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Chemical Usage Input" };

export default function ChemicalUsageInputPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Chemical Usage Input"
        description="Record every chemical batch issued to the tannery and finishing lines, with full traceability from tank to batch."
        icon={ClipboardList}
      />

      <div className="mt-8 rounded-xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-navy-900">
          Usage capture form
        </p>
        <p className="mt-1.5 text-sm text-navy-500">
          The data-entry form for chemical usage records will be available here.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            "Date of usage",
            "Chemical / batch number",
            "Quantity used",
            "Process or tank reference",
          ].map((field) => (
            <div
              key={field}
              className="rounded-lg border border-dashed border-navy-200 bg-navy-50/60 px-4 py-5"
            >
              <p className="text-xs font-medium text-navy-500">{field}</p>
              <p className="mt-1 text-xs text-navy-400">Field placeholder</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
