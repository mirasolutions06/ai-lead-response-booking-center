import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
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

describe("logStep", () => {
  it("writes an automation log row tied to a lead", async () => {
    const lead = await prisma.lead.create({
      data: { source: "sms", rawMessage: "test message" },
    });
    createdLeadIds.push(lead.id);

    await logStep(prisma, { leadId: lead.id, step: "lead_received", detail: "Received via sms" });

    const logs = await prisma.automationLog.findMany({ where: { leadId: lead.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].step).toBe("lead_received");
    expect(logs[0].detail).toBe("Received via sms");
  });
});
