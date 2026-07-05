import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getRecentLogs } from "./queries";
import { logStep } from "./automation-log";

const prisma = new PrismaClient();
const createdLeadIds: string[] = [];

afterEach(async () => {
  for (const leadId of createdLeadIds) {
    await prisma.automationLog.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
  }
  createdLeadIds.length = 0;
});

describe("getRecentLogs", () => {
  it("returns the most recent logs newest first, including the lead's name when present", async () => {
    const lead = await prisma.lead.create({
      data: { source: "sms", rawMessage: "test", name: "Jane Doe" },
    });
    createdLeadIds.push(lead.id);
    await logStep(prisma, { leadId: lead.id, step: "lead_received", detail: "Received via sms" });

    const logs = await getRecentLogs(prisma);
    const found = logs.find((l) => l.leadId === lead.id);
    expect(found).toBeDefined();
    expect(found?.lead?.name).toBe("Jane Doe");
  });
});
