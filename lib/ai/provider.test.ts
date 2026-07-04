import { describe, it, expect } from "vitest";
import { getLeadIntelligenceProvider } from "./provider";

describe("getLeadIntelligenceProvider", () => {
  it("returns RuleBasedProvider when no API key is given", () => {
    const provider = getLeadIntelligenceProvider(undefined);
    expect(provider.kind).toBe("rule_based");
  });

  it("returns OpenAIProvider when an API key is given", () => {
    const provider = getLeadIntelligenceProvider("fake-key");
    expect(provider.kind).toBe("openai");
  });
});
