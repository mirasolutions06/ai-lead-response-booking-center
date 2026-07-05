import { prisma } from "@/lib/prisma";
import { ensureSlotsGenerated } from "@/lib/scheduling/slots";
import { getInboxLeads } from "@/lib/leads/queries";
import { BookingClient } from "./booking-client";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;

  let business = await prisma.business.findFirst();
  if (!business) {
    business = await prisma.business.create({ data: { name: "Demo Service Co.", timezone: "America/Chicago" } });
  }
  const [slots, leads] = await Promise.all([ensureSlotsGenerated(prisma, business.id), getInboxLeads(prisma)]);

  const bookableLeads = leads.filter((l) => l.status !== "booked" && l.status !== "won" && l.status !== "lost");
  const preselectedLead = leadId ? bookableLeads.find((l) => l.id === leadId) : undefined;

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-gray-900">Booking Panel</h1>
      {preselectedLead && (
        <p className="mb-4 text-xs text-gray-400">
          Booking for {preselectedLead.name ?? preselectedLead.phone ?? preselectedLead.email}
        </p>
      )}
      <BookingClient slots={slots} leads={bookableLeads} initialLeadId={preselectedLead?.id} />
    </div>
  );
}
