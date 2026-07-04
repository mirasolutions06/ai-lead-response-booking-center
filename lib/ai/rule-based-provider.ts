import { LeadIntelligence, LeadSource } from "@/lib/schemas/lead-intelligence";
import { LeadIntelligenceProvider } from "@/lib/ai/types";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

const URGENT_KEYWORDS = [
  "emergency", "asap", "urgent", "right now", "today", "no heat", "no ac", "flooding", "leaking",
];
const SPAM_KEYWORDS = [
  "seo services", "backlinks", "crypto", "loan approved", "click here", "make money fast", "bitcoin",
];

const SERVICE_KEYWORDS: Record<string, string> = {
  hvac: "HVAC repair",
  furnace: "HVAC repair",
  "air condition": "HVAC repair",
  ac: "HVAC repair",
  dental: "Dental appointment",
  teeth: "Dental appointment",
  dentist: "Dental appointment",
  "real estate": "Real estate viewing",
  house: "Real estate viewing",
  property: "Real estate viewing",
  viewing: "Real estate viewing",
  consult: "Discovery call",
  agency: "Discovery call",
  marketing: "Discovery call",
};

function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(PHONE_REGEX);
  return match ? match[0].trim() : null;
}

function detectService(text: string): string | null {
  for (const [keyword, service] of Object.entries(SERVICE_KEYWORDS)) {
    const pattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (pattern.test(text)) return service;
  }
  return null;
}

function detectUrgency(text: string): "emergency" | "soon" | "flexible" {
  const lower = text.toLowerCase();
  if (URGENT_KEYWORDS.some((k) => lower.includes(k))) return "emergency";
  if (lower.includes("this week") || lower.includes("next few days")) return "soon";
  return "flexible";
}

function isSpamMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return SPAM_KEYWORDS.some((k) => lower.includes(k));
}

function scoreLead(params: {
  hasEmail: boolean;
  hasPhone: boolean;
  hasService: boolean;
  urgency: "emergency" | "soon" | "flexible";
  isSpam: boolean;
}): number {
  if (params.isSpam) return 0;
  let score = 20;
  if (params.hasEmail) score += 15;
  if (params.hasPhone) score += 20;
  if (params.hasService) score += 20;
  if (params.urgency === "emergency") score += 25;
  else if (params.urgency === "soon") score += 15;
  return Math.min(score, 100);
}

function qualify(score: number, isSpam: boolean): "hot" | "warm" | "cold" | "spam" {
  if (isSpam) return "spam";
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

export class RuleBasedProvider implements LeadIntelligenceProvider {
  readonly kind = "rule_based" as const;

  async extractAndScore(input: { rawMessage: string; source: LeadSource }): Promise<LeadIntelligence> {
    const { rawMessage } = input;
    const email = extractEmail(rawMessage);
    const phone = extractPhone(rawMessage);
    const service = detectService(rawMessage);
    const urgency = detectUrgency(rawMessage);
    const spam = isSpamMessage(rawMessage);
    const score = scoreLead({
      hasEmail: !!email,
      hasPhone: !!phone,
      hasService: !!service,
      urgency,
      isSpam: spam,
    });
    const qualification = qualify(score, spam);

    const reasonParts = [
      email ? "email found" : "no email found",
      phone ? "phone found" : "no phone found",
      service ? `service detected: ${service}` : "service unclear",
      `urgency: ${urgency}`,
    ];
    if (spam) reasonParts.push("matched spam keyword list");

    const followUp = spam
      ? "This message appears to be spam and has not been sent a follow-up."
      : `Hi${email || phone ? "" : " there"}, thanks for reaching out${service ? ` about ${service}` : ""}. ` +
        `${urgency === "emergency" ? "We understand this is urgent and" : "We'd love to help — we"} can get you scheduled soon. ` +
        `What time works best for you?`;

    return {
      name: null,
      email,
      phone,
      requested_service: service,
      urgency,
      location: null,
      budget: null,
      preferred_time: null,
      buying_intent: spam ? "none" : urgency === "emergency" ? "high" : "medium",
      lead_score: score,
      qualification_status: qualification,
      recommended_next_action: spam
        ? "Discard — flagged as spam"
        : score >= 70
        ? "Offer earliest available booking slot"
        : "Send follow-up and request missing details",
      follow_up_message: followUp,
      reasoning: reasonParts.join("; "),
    };
  }
}
