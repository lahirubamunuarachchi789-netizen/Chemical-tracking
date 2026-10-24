import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ConsumptionReportsTabs } from "@/components/consumption-reports/consumption-reports-tabs";
import { Activity } from "lucide-react";

export const metadata: Metadata = { title: "Consumption Reports" };

export default function ConsumptionReportsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Consumption Reports"
        description="Review daily chemical consumption by injector, tank and chemical, and the weekly Poly-versus-usage balance, all in Sri Lanka time."
        icon={Activity}
      />

      <ConsumptionReportsTabs />
    </div>
  );
}
