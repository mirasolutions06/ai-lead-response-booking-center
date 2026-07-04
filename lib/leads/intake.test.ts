import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { runLeadIntake } from "./intake";
import { RuleBasedProvider } from "@/lib/ai/rule-based-provider";
import { LeadIntelligenceProvider } from "@/lib/ai/types";

const prisma = new PrismaClient();
const createdLeadIds: string[] = [];

afterEach(async () => {
  for (const leadId of createdLeadIds) {
    await prisma.automationLog.deleteMany({ where: { leadId } });
    await prisma.followUpDraft.deleteMany({ where: { leadId } });
    await prisma.leadExtraction.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
  }
  createdLeadIds.length = 0;
});

describe("runLeadIntake", () => {
  it("creates a lead with extracted contact info, extraction, draft, and ordered logs", async () => {
    const provider = new RuleBasedProvider();
    const result = await runLeadIntake(prisma, provider, {
      rawMessage: "My furnace died and it's freezing, please send someone today! 555-987-6543",
      source: "sms",
    });
    createdLeadIds.push(result.lead.id);

    expect(result.lead.phone).toBe("555-987-6543");
    expect(result.extraction.qualificationStatus).toBe("hot");
    expect(result.draft.message.length).toBeGreaterThan(0);
    expect(result.safety.missingContact).toBe(false);

    const logs = await prisma.automationLog.findMany({
      where: { leadId: result.lead.id },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map((l) => l.step)).toEqual([
      "lead_received",
      "ai_extraction_completed",
      "lead_scored",
      "follow_up_drafted",
    ]);
  });

  it("flags a spam lead's safety flags without drafting a real follow-up tone", async () => {
    const provider = new RuleBasedProvider();
    const result = await runLeadIntake(prisma, provider, {
      rawMessage: "Get rich with crypto! Click here now, loan approved instantly!",
      source: "email",
    });
    createdLeadIds.push(result.lead.id);

    expect(result.safety.isSpam).toBe(true);
    expect(result.extraction.qualificationStatus).toBe("spam");
  });

  it("falls back to the rule-based provider when the primary provider throws", async () => {
    const failingProvider: LeadIntelligenceProvider = {
      kind: "openai",
      extractAndScore: async () => {
        throw new Error("simulated malformed LLM response");
      },
    };
    const result = await runLeadIntake(prisma, failingProvider, {
      rawMessage: "My furnace died and it's freezing, please send someone today! 555-987-6543",
      source: "sms",
    });
    createdLeadIds.push(result.lead.id);

    expect(result.extraction.provider).toBe("rule_based");
    expect(result.extraction.qualificationStatus).toBe("hot");

    const logs = await prisma.automationLog.findMany({
      where: { leadId: result.lead.id },
      orderBy: { createdAt: "asc" },
    });
    const extractionLog = logs.find((l) => l.step === "ai_extraction_completed");
    expect(extractionLog?.detail).toContain("fallback");
  });
});
