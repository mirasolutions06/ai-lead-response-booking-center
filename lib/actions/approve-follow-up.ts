"use server";

import { prisma } from "@/lib/prisma";
import { logStep } from "@/lib/logs/automation-log";

export async function approveFollowUp(draftId: string) {
  const draft = await prisma.followUpDraft.findUniqueOrThrow({ where: { id: draftId } });

  const updated = await prisma.followUpDraft.update({
    where: { id: draftId },
    data: { status: "approved", approvedAt: new Date(), approvedBy: "dashboard user" },
  });

  await logStep(prisma, { leadId: draft.leadId, step: "human_approved", detail: "Follow-up approved by human" });

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: draft.leadId } });
  const channel = lead.phone ? "sms" : "email";

  await prisma.notification.create({
    data: {
      leadId: draft.leadId,
      channel,
      body: updated.message,
    },
  });

  await logStep(prisma, {
    leadId: draft.leadId,
    step: "notification_staged",
    detail: `${channel} notification staged (not dispatched — no live provider configured)`,
  });

  return updated;
}
