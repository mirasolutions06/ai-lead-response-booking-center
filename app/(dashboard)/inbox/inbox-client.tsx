"use client";

import { useState } from "react";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadDetailPanel } from "@/components/leads/lead-detail-panel";
import type { InboxLead } from "@/lib/leads/queries";

export function InboxClient({ leads }: { leads: InboxLead[] }) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null;

  return (
    <>
      <LeadTable leads={leads} onRowClick={setSelectedLeadId} />
      <LeadDetailPanel
        lead={selectedLead}
        open={selectedLeadId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLeadId(null);
        }}
      />
    </>
  );
}
