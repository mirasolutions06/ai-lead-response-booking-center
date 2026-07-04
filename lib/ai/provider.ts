import { LeadIntelligenceProvider } from "@/lib/ai/types";
import { RuleBasedProvider } from "@/lib/ai/rule-based-provider";
import { OpenAIProvider } from "@/lib/ai/openai-provider";

export function getLeadIntelligenceProvider(
  apiKey: string | undefined = process.env.OPENAI_API_KEY
): LeadIntelligenceProvider {
  if (apiKey) {
    return new OpenAIProvider(apiKey);
  }
  return new RuleBasedProvider();
}
