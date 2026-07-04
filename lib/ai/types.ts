import { LeadIntelligence, LeadSource } from "@/lib/schemas/lead-intelligence";

export interface LeadIntelligenceProvider {
  readonly kind: "openai" | "rule_based";
  extractAndScore(input: { rawMessage: string; source: LeadSource }): Promise<LeadIntelligence>;
}
