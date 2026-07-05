"use server";

import { prisma } from "@/lib/prisma";
import { logStep } from "@/lib/logs/automation-log";

export async function approveFollowUp(draftId: string) {
  const draft = await prisma.followUpDraft.findUniqueOrThrow({ where: { id: draftId } });

  // Idempotent: a double-click (or any retry) after the first approval already
  // landed is a no-op rather than creating a second notification/log entry.
  if (draft.status === "approved") {
    return draft;
  }

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: draft.leadId } });
  if (!lead.phone && !lead.email) {
    throw new Error("Cannot approve follow-up: lead has no phone or email to notify");
  }
  const channel = lead.phone ? "sms" : "email";

  const [updated] = await prisma.$transaction([
    prisma.followUpDraft.update({
      where: { id: draftId },
      data: { status: "approved", approvedAt: new Date(), approvedBy: "dashboard user" }, // TODO: replace with real user identity once auth exists
    }),
    prisma.notification.create({
      data: {
        leadId: draft.leadId,
        channel,
        body: draft.message,
      },
    }),
  ]);

  await logStep(prisma, { leadId: draft.leadId, step: "human_approved", detail: "Follow-up approved by human" });
  await logStep(prisma, {
    leadId: draft.leadId,
    step: "notification_staged",
    detail: `${channel} notification staged (not dispatched — no live provider configured)`,
  });

  return updated;
}
