import { describe, it, expect } from "vitest";
import { OpenAIProvider } from "./openai-provider";

function fakeClient(responseJson: object) {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify(responseJson) } }],
        }),
      },
    },
  } as any;
}

describe("OpenAIProvider", () => {
  it("parses a valid JSON response into LeadIntelligence", async () => {
    const validResponse = {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-123-4567",
      requested_service: "HVAC repair",
      urgency: "emergency",
      location: "Austin, TX",
      budget: null,
      preferred_time: "this afternoon",
      buying_intent: "high",
      lead_score: 92,
      qualification_status: "hot",
      recommended_next_action: "Offer earliest available booking slot",
      follow_up_message: "Hi Jane, we can get a tech out today...",
      reasoning: "Emergency HVAC issue with full contact info",
    };
    const provider = new OpenAIProvider("fake-key", fakeClient(validResponse));
    const result = await provider.extractAndScore({ rawMessage: "AC is out, need help today", source: "sms" });
    expect(result.qualification_status).toBe("hot");
    expect(result.lead_score).toBe(92);
  });

  it("throws when the OpenAI response fails schema validation", async () => {
    const invalidResponse = { name: "Jane", lead_score: "not-a-number" };
    const provider = new OpenAIProvider("fake-key", fakeClient(invalidResponse));
    await expect(
      provider.extractAndScore({ rawMessage: "test", source: "sms" })
    ).rejects.toThrow();
  });
});
