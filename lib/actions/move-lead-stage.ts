"use server";

import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logStep } from "@/lib/logs/automation-log";

export async function moveLeadStage(leadId: string, toStatus: LeadStatus) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const fromStatus = lead.status;

  const updated = await prisma.lead.update({ where: { id: leadId }, data: { status: toStatus } });

  await prisma.pipelineEvent.create({
    data: { leadId, fromStatus, toStatus, actor: "dashboard user" },
  });

  await logStep(prisma, {
    leadId,
    step: "crm_updated",
    detail: `Moved from ${fromStatus} to ${toStatus}`,
  });

  return updated;
}
