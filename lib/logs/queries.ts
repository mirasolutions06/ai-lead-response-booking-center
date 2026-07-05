import { PrismaClient } from "@prisma/client";

export async function getRecentLogs(prisma: PrismaClient, limit = 100) {
  return prisma.automationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { lead: { select: { name: true, phone: true, email: true } } },
  });
}

export type RecentLog = Awaited<ReturnType<typeof getRecentLogs>>[number];
