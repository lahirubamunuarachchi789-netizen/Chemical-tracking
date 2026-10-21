import type { Metadata } from "next";
import { Database } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Chemical Master Data" };

export default function ChemicalMasterDataPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Chemical Master Data"
        description="Maintain the catalogue of chemicals, units and storage locations that every usage record is validated against."
        icon={Database}
      />

      <div className="mt-8 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-navy-100 px-6 py-4">
          <p className="text-sm font-semibold text-navy-900">Chemical catalogue</p>
          <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-600">
            0 records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-navy-50 text-xs tracking-wide text-navy-500 uppercase">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Chemical name
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Unit
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Storage location
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100 text-navy-700">
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-xs text-navy-400">
                  No chemicals defined yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
