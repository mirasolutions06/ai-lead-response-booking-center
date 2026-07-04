import { describe, it, expect } from "vitest";
import { OpenAIProvider } from "./openai-provider";

const apiKey = process.env.OPENAI_API_KEY;

describe.skipIf(!apiKey)("OpenAIProvider (real API smoke test)", () => {
  it("extracts a real response from the live OpenAI API", async () => {
    const provider = new OpenAIProvider(apiKey!);
    const result = await provider.extractAndScore({
      rawMessage: "Hi, my AC broke and it's 95 degrees, please help ASAP! Call me at 555-222-3333.",
      source: "sms",
    });
    expect(result.lead_score).toBeGreaterThan(0);
    expect(["hot", "warm", "cold", "spam"]).toContain(result.qualification_status);
  }, 15000);
});
