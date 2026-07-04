import { LeadIntelligence } from "@/lib/schemas/lead-intelligence";

export interface SafetyFlags {
  missingContact: boolean;
  unclearServiceOrLocation: boolean;
  isSpam: boolean;
}

export function computeSafetyFlags(extraction: LeadIntelligence): SafetyFlags {
  return {
    missingContact: !extraction.email && !extraction.phone,
    unclearServiceOrLocation: !extraction.requested_service || !extraction.location,
    isSpam: extraction.qualification_status === "spam",
  };
}
