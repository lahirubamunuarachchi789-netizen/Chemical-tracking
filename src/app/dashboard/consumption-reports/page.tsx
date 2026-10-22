import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ConsumptionReportView } from "@/components/consumption-reports/consumption-report-view";
import { Activity } from "lucide-react";

export const metadata: Metadata = { title: "Consumption Reports" };

export default function ConsumptionReportsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Consumption Reports"
        description="Review daily chemical consumption by injector, tank and chemical, all in Sri Lanka time."
        icon={Activity}
      />

      <ConsumptionReportView />
    </div>
  );
}
