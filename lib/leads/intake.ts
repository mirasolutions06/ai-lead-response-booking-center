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

  // Explicit, labeled contact fields (e.g. from a website form) take priority
  // over whatever the AI extracted from the free-text message. Coalescing here
  // (explicit-over-AI) produces the effective contact identity for this lead.
  const contact = {
    name: parsedInput.name ?? intelligence.name,
    email: parsedInput.email ?? intelligence.email,
    phone: parsedInput.phone ?? intelligence.phone,
  };

  // Compute safety from the MERGED contact, not the raw AI intelligence: a
  // customer who typed their phone into the form but whose free text had no
  // number must NOT be flagged `missingContact`. Spreading `contact` over
  // `intelligence` overrides the email/phone fields that computeSafetyFlags
  // inspects.
  const safety = computeSafetyFlags({ ...intelligence, ...contact });

  // The three writes below are independent of each other (none depends on
  // another's result — the draft message derives from `intelligence` and the
  // lead update from `contact`, both computed above), so they're grouped into a single
  // array-form transaction: either all three land, or none do. This closes
  // the partial-failure window where a crash between writes used to leave a
  // lead with an extraction but no follow-up draft (or vice versa). The
  // initial Lead creation and the AI provider call above are deliberately
  // left outside this transaction: the AI call is a slow external request
  // that shouldn't hold a DB transaction open, and persisting the Lead first
  // ensures a "lead_received" record survives even if the AI call fails
  // outright.
  const [extraction, updatedLead, draft] = await prisma.$transaction([
    prisma.leadExtraction.create({
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
    }),
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      },
    }),
    prisma.followUpDraft.create({
      data: {
        leadId: lead.id,
        message: intelligence.follow_up_message,
      },
    }),
  ]);

  await logStep(prisma, { leadId: lead.id, step: "ai_extraction_completed", detail: extractionDetail });
  await logStep(prisma, {
    leadId: lead.id,
    step: "lead_scored",
    detail: `Score ${intelligence.lead_score}, qualification: ${intelligence.qualification_status}`,
  });
  await logStep(prisma, { leadId: lead.id, step: "follow_up_drafted", detail: "Draft ready for human approval" });

  return { lead: updatedLead, extraction, draft, safety };
}
