import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";

import { ChemicalUsageForm } from "@/components/chemical-usage/chemical-usage-form";
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

      <ChemicalUsageForm />
    </div>
  );
}
