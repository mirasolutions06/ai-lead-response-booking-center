import { z } from "zod";

export const LeadSourceSchema = z.enum([
  "website_form",
  "sms",
  "whatsapp",
  "email",
  "missed_call",
  "quick_intake",
]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const QualificationStatusSchema = z.enum(["hot", "warm", "cold", "spam"]);
export type QualificationStatus = z.infer<typeof QualificationStatusSchema>;

export const LeadIntelligenceSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  requested_service: z.string().nullable(),
  urgency: z.string().nullable(),
  location: z.string().nullable(),
  budget: z.string().nullable(),
  preferred_time: z.string().nullable(),
  buying_intent: z.string().nullable(),
  lead_score: z.number().int().min(0).max(100),
  qualification_status: QualificationStatusSchema,
  recommended_next_action: z.string(),
  follow_up_message: z.string(),
  reasoning: z.string(),
});
export type LeadIntelligence = z.infer<typeof LeadIntelligenceSchema>;

// A lenient optional string for labeled contact fields (name/email/phone).
// Blank or whitespace-only input normalizes to `undefined` so that a form
// submitting an empty box (e.g. `email: ""`) is treated as "not provided" and
// the pipeline falls back to AI extraction cleanly. Placing `.optional()` after
// `.transform()` yields an inferred type of `string | undefined`.
const optionalContactField = z
  .string()
  .trim()
  .transform((v) => (v.length > 0 ? v : undefined))
  .optional();

export const LeadIntakeInputSchema = z.object({
  rawMessage: z.string().min(1, "rawMessage is required"),
  source: LeadSourceSchema,
  // Explicit, labeled contact fields (e.g. from a website form). All optional
  // and backward-compatible: existing callers passing only { rawMessage, source }
  // remain valid. Email is deliberately NOT format-validated here — a lead-capture
  // form must never DROP a real lead because a customer fat-fingered their email.
  // Capturing the lead matters more than a clean string; the human-review /
  // safety-flag step catches genuinely bad data.
  name: optionalContactField,
  email: optionalContactField,
  phone: optionalContactField,
});
export type LeadIntakeInput = z.infer<typeof LeadIntakeInputSchema>;
