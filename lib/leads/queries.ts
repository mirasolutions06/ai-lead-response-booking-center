import { PrismaClient } from "@prisma/client";

export async function getInboxLeads(prisma: PrismaClient) {
  return prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      extractions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export type InboxLead = Awaited<ReturnType<typeof getInboxLeads>>[number];

export async function getInboxMetrics(prisma: PrismaClient) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [newToday, needReview] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.leadExtraction.count({
      where: {
        OR: [{ missingContact: true }, { unclearServiceOrLocation: true }, { isSpam: true }],
      },
    }),
  ]);

  return { newToday, needReview };
}
