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

export const LeadIntakeInputSchema = z.object({
  rawMessage: z.string().min(1, "rawMessage is required"),
  source: LeadSourceSchema,
});
export type LeadIntakeInput = z.infer<typeof LeadIntakeInputSchema>;
