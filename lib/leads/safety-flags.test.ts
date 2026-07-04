import { describe, it, expect } from "vitest";
import { computeSafetyFlags } from "./safety-flags";
import { LeadIntelligence } from "@/lib/schemas/lead-intelligence";

function baseIntelligence(overrides: Partial<LeadIntelligence> = {}): LeadIntelligence {
  return {
    name: null, email: "jane@example.com", phone: "555-123-4567",
    requested_service: "HVAC repair", urgency: "emergency", location: "Austin, TX",
    budget: null, preferred_time: null, buying_intent: "high",
    lead_score: 90, qualification_status: "hot",
    recommended_next_action: "book", follow_up_message: "hi", reasoning: "x",
    ...overrides,
  };
}

describe("computeSafetyFlags", () => {
  it("does not flag a complete, non-spam lead", () => {
    const flags = computeSafetyFlags(baseIntelligence());
    expect(flags).toEqual({ missingContact: false, unclearServiceOrLocation: false, isSpam: false });
  });

  it("flags missingContact when both email and phone are absent", () => {
    const flags = computeSafetyFlags(baseIntelligence({ email: null, phone: null }));
    expect(flags.missingContact).toBe(true);
  });

  it("does not flag missingContact when only one of email/phone is present", () => {
    const flags = computeSafetyFlags(baseIntelligence({ email: null }));
    expect(flags.missingContact).toBe(false);
  });

  it("flags unclearServiceOrLocation when service is missing", () => {
    const flags = computeSafetyFlags(baseIntelligence({ requested_service: null }));
    expect(flags.unclearServiceOrLocation).toBe(true);
  });

  it("flags isSpam when qualification_status is spam", () => {
    const flags = computeSafetyFlags(baseIntelligence({ qualification_status: "spam" }));
    expect(flags.isSpam).toBe(true);
  });
});
