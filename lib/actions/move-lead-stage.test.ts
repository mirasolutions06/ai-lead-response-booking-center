import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { moveLeadStage } from "./move-lead-stage";

const prisma = new PrismaClient();
const createdLeadIds: string[] = [];

afterEach(async () => {
  for (const leadId of createdLeadIds) {
    await prisma.automationLog.deleteMany({ where: { leadId } });
    await prisma.pipelineEvent.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
  }
  createdLeadIds.length = 0;
});

describe("moveLeadStage", () => {
  it("updates the lead status, records a pipeline event, and logs the change", async () => {
    const lead = await prisma.lead.create({ data: { source: "sms", rawMessage: "test", status: "new" } });
    createdLeadIds.push(lead.id);

    await moveLeadStage(lead.id, "qualified");

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.status).toBe("qualified");

    const event = await prisma.pipelineEvent.findFirst({ where: { leadId: lead.id } });
    expect(event?.fromStatus).toBe("new");
    expect(event?.toStatus).toBe("qualified");

    const log = await prisma.automationLog.findFirst({ where: { leadId: lead.id, step: "crm_updated" } });
    expect(log).not.toBeNull();
  });
});
