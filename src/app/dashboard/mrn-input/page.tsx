import type { Metadata } from "next";
import { FileSpreadsheet } from "lucide-react";

import { MrnInputForm } from "@/components/mrn-input/mrn-input-form";
import { PageHeader } from "@/components/layout/page-header";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";

export const metadata: Metadata = { title: "MRN Input" };

export default async function MrnInputPage() {
  const token = await getSessionToken();
  const session = await verifySessionToken(token);
  const createdBy = session?.username ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="MRN Input"
        description="Capture the MRN sheet: select the chemical for each set and record its Poly and ISO weights."
        icon={FileSpreadsheet}
      />

      <MrnInputForm createdBy={createdBy} />
    </div>
  );
}
