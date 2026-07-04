import { PrismaClient, AutomationStep } from "@prisma/client";

export async function logStep(
  prisma: PrismaClient,
  params: { leadId: string | null; step: AutomationStep; detail: string }
) {
  return prisma.automationLog.create({
    data: {
      leadId: params.leadId,
      step: params.step,
      detail: params.detail,
    },
  });
}
