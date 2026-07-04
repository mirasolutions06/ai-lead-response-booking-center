import OpenAI from "openai";
import { LeadIntelligence, LeadIntelligenceSchema, LeadSource } from "@/lib/schemas/lead-intelligence";
import { LeadIntelligenceProvider } from "@/lib/ai/types";

const SYSTEM_PROMPT = `You are a lead-intake assistant for a service business (HVAC, dental, real estate, agencies, coaches, med spas, gyms, contractors). Extract structured details from the inbound message and score how promising the lead is. Respond only with JSON matching this shape:
{
  "name": string|null, "email": string|null, "phone": string|null,
  "requested_service": string|null, "urgency": string|null, "location": string|null,
  "budget": string|null, "preferred_time": string|null, "buying_intent": string|null,
  "lead_score": number (0-100), "qualification_status": "hot"|"warm"|"cold"|"spam",
  "recommended_next_action": string, "follow_up_message": string, "reasoning": string
}`;

export class OpenAIProvider implements LeadIntelligenceProvider {
  readonly kind = "openai" as const;
  private client: OpenAI;

  constructor(apiKey: string, client?: OpenAI) {
    this.client = client ?? new OpenAI({ apiKey });
  }

  async extractAndScore(input: { rawMessage: string; source: LeadSource }): Promise<LeadIntelligence> {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Source: ${input.source}\nMessage: ${input.rawMessage}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAI returned an empty response");

    return LeadIntelligenceSchema.parse(JSON.parse(raw));
  }
}
