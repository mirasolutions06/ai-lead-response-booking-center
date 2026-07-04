import { describe, it, expect } from "vitest";
import { LeadIntelligenceSchema, LeadIntakeInputSchema } from "./lead-intelligence";

describe("LeadIntelligenceSchema", () => {
  it("accepts a fully valid payload", () => {
    const result = LeadIntelligenceSchema.safeParse({
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
      follow_up_message: "Hi Jane...",
      reasoning: "Emergency HVAC issue with full contact info",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a lead_score outside 0-100", () => {
    const result = LeadIntelligenceSchema.safeParse({
      name: null, email: null, phone: null, requested_service: null,
      urgency: null, location: null, budget: null, preferred_time: null,
      buying_intent: null, lead_score: 150, qualification_status: "hot",
      recommended_next_action: "x", follow_up_message: "x", reasoning: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid qualification_status", () => {
    const result = LeadIntelligenceSchema.safeParse({
      name: null, email: null, phone: null, requested_service: null,
      urgency: null, location: null, budget: null, preferred_time: null,
      buying_intent: null, lead_score: 50, qualification_status: "lukewarm",
      recommended_next_action: "x", follow_up_message: "x", reasoning: "x",
    });
    expect(result.success).toBe(false);
  });
});

describe("LeadIntakeInputSchema", () => {
  it("requires a non-empty rawMessage and a valid source", () => {
    expect(LeadIntakeInputSchema.safeParse({ rawMessage: "", source: "sms" }).success).toBe(false);
    expect(LeadIntakeInputSchema.safeParse({ rawMessage: "hi", source: "carrier_pigeon" }).success).toBe(false);
    expect(LeadIntakeInputSchema.safeParse({ rawMessage: "hi", source: "sms" }).success).toBe(true);
  });
});
