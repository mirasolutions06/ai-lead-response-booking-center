"use client";

import { LeadTable } from "@/components/leads/lead-table";
import type { InboxLead } from "@/lib/leads/queries";

export function InboxClient({ leads }: { leads: InboxLead[] }) {
  return <LeadTable leads={leads} onRowClick={() => {}} />;
}
