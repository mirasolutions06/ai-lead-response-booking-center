import { prisma } from "@/lib/prisma";
import { getInboxLeads, getInboxMetrics } from "@/lib/leads/queries";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const [leads, metrics] = await Promise.all([getInboxLeads(prisma), getInboxMetrics(prisma)]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-bold text-gray-900">Lead Inbox</h1>
        <p className="mt-0.5 text-xs text-gray-400">
          {metrics.newToday} new today · {metrics.needReview} need review
        </p>
      </div>
      <InboxClient leads={leads} />
    </div>
  );
}
