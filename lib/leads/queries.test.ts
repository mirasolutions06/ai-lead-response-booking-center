import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getInboxLeads, getInboxMetrics } from "./queries";

const prisma = new PrismaClient();
const createdLeadIds: string[] = [];

afterEach(async () => {
  for (const leadId of createdLeadIds) {
    await prisma.leadExtraction.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
  }
  createdLeadIds.length = 0;
});

describe("getInboxLeads", () => {
  it("returns leads newest first with their latest extraction attached", async () => {
    const lead = await prisma.lead.create({ data: { source: "sms", rawMessage: "test message" } });
    createdLeadIds.push(lead.id);
    await prisma.leadExtraction.create({
      data: {
        leadId: lead.id, requestedService: "HVAC repair", urgency: "emergency", location: null,
        budget: null, preferredTime: null, buyingIntent: "high", leadScore: 90,
        qualificationStatus: "hot", recommendedNextAction: "book", reasoning: "x",
        missingContact: false, unclearServiceOrLocation: false, isSpam: false, provider: "rule_based",
      },
    });

    const leads = await getInboxLeads(prisma);
    const found = leads.find((l) => l.id === lead.id);
    expect(found).toBeDefined();
    expect(found?.extractions[0]?.qualificationStatus).toBe("hot");
  });
});

describe("getInboxMetrics", () => {
  it("counts leads created today and leads needing review", async () => {
    const lead = await prisma.lead.create({ data: { source: "sms", rawMessage: "test message" } });
    createdLeadIds.push(lead.id);
    await prisma.leadExtraction.create({
      data: {
        leadId: lead.id, requestedService: null, urgency: null, location: null,
        budget: null, preferredTime: null, buyingIntent: null, leadScore: 10,
        qualificationStatus: "cold", recommendedNextAction: "x", reasoning: "x",
        missingContact: true, unclearServiceOrLocation: true, isSpam: false, provider: "rule_based",
      },
    });

    const metrics = await getInboxMetrics(prisma);
    expect(metrics.newToday).toBeGreaterThanOrEqual(1);
    expect(metrics.needReview).toBeGreaterThanOrEqual(1);
  });
});
