import { PrismaClient, LeadSource as PrismaLeadSource } from "@prisma/client";
import { LeadIntakeInput, LeadIntakeInputSchema, LeadIntelligence } from "@/lib/schemas/lead-intelligence";
import { LeadIntelligenceProvider } from "@/lib/ai/types";
import { RuleBasedProvider } from "@/lib/ai/rule-based-provider";
import { computeSafetyFlags } from "@/lib/leads/safety-flags";
import { logStep } from "@/lib/logs/automation-log";

export async function runLeadIntake(
  prisma: PrismaClient,
  provider: LeadIntelligenceProvider,
  input: LeadIntakeInput
) {
  const parsedInput = LeadIntakeInputSchema.parse(input);

  const lead = await prisma.lead.create({
    data: {
      source: parsedInput.source as PrismaLeadSource,
      rawMessage: parsedInput.rawMessage,
    },
  });
  await logStep(prisma, { leadId: lead.id, step: "lead_received", detail: `Received via ${parsedInput.source}` });

  let intelligence: LeadIntelligence;
  let usedProvider: LeadIntelligenceProvider = provider;
  let extractionDetail = `Provider: ${provider.kind}`;

  try {
    intelligence = await provider.extractAndScore({
      rawMessage: parsedInput.rawMessage,
      source: parsedInput.source,
    });
  } catch (err) {
    if (provider.kind === "rule_based") {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    usedProvider = new RuleBasedProvider();
    intelligence = await usedProvider.extractAndScore({
      rawMessage: parsedInput.rawMessage,
      source: parsedInput.source,
    });
    extractionDetail = `Provider: ${usedProvider.kind} (fallback after ${provider.kind} error: ${message})`;
  }

  const safety = computeSafetyFlags(intelligence);

  const extraction = await prisma.leadExtraction.create({
    data: {
      leadId: lead.id,
      requestedService: intelligence.requested_service,
      urgency: intelligence.urgency,
      location: intelligence.location,
      budget: intelligence.budget,
      preferredTime: intelligence.preferred_time,
      buyingIntent: intelligence.buying_intent,
      leadScore: intelligence.lead_score,
      qualificationStatus: intelligence.qualification_status,
      recommendedNextAction: intelligence.recommended_next_action,
      reasoning: intelligence.reasoning,
      missingContact: safety.missingContact,
      unclearServiceOrLocation: safety.unclearServiceOrLocation,
      isSpam: safety.isSpam,
      provider: usedProvider.kind,
    },
  });
  await logStep(prisma, { leadId: lead.id, step: "ai_extraction_completed", detail: extractionDetail });
  await logStep(prisma, {
    leadId: lead.id,
    step: "lead_scored",
    detail: `Score ${intelligence.lead_score}, qualification: ${intelligence.qualification_status}`,
  });

  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      name: intelligence.name,
      email: intelligence.email,
      phone: intelligence.phone,
    },
  });

  const draft = await prisma.followUpDraft.create({
    data: {
      leadId: lead.id,
      message: intelligence.follow_up_message,
    },
  });
  await logStep(prisma, { leadId: lead.id, step: "follow_up_drafted", detail: "Draft ready for human approval" });

  return { lead: updatedLead, extraction, draft, safety };
}
