import { describe, it, expect } from "vitest";
import { RuleBasedProvider } from "./rule-based-provider";

describe("RuleBasedProvider", () => {
  const provider = new RuleBasedProvider();

  it("extracts phone, service, and emergency urgency from an HVAC message", async () => {
    const result = await provider.extractAndScore({
      rawMessage: "My furnace died and it's freezing, please send someone today! 555-987-6543",
      source: "sms",
    });
    expect(result.phone).toBe("555-987-6543");
    expect(result.requested_service).toBe("HVAC repair");
    expect(result.urgency).toBe("emergency");
    expect(result.qualification_status).toBe("hot");
    expect(result.lead_score).toBeGreaterThanOrEqual(70);
  });

  it("extracts email and detects a dental service request", async () => {
    const result = await provider.extractAndScore({
      rawMessage: "Looking for a dentist appointment next week, jane@example.com",
      source: "website_form",
    });
    expect(result.email).toBe("jane@example.com");
    expect(result.requested_service).toBe("Dental appointment");
  });

  it("flags spam messages with a score of 0", async () => {
    const result = await provider.extractAndScore({
      rawMessage: "Get rich with crypto! Click here now, loan approved instantly!",
      source: "email",
    });
    expect(result.qualification_status).toBe("spam");
    expect(result.lead_score).toBe(0);
  });

  it("returns cold/low score for a vague message with no contact info", async () => {
    const result = await provider.extractAndScore({
      rawMessage: "just curious about pricing",
      source: "website_form",
    });
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.qualification_status).toBe("cold");
  });
});
