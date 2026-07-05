import { QualificationStatus } from "@/lib/schemas/lead-intelligence";

export interface LeadStatusStyle {
  label: string;
  dotColor: string;
  badgeText: string;
  badgeBg: string;
}

export const LEAD_STATUS_STYLES: Record<QualificationStatus, LeadStatusStyle> = {
  hot: { label: "Hot", dotColor: "bg-red-500", badgeText: "text-red-700", badgeBg: "bg-red-100" },
  warm: { label: "Warm", dotColor: "bg-amber-500", badgeText: "text-amber-800", badgeBg: "bg-amber-100" },
  cold: { label: "Cold", dotColor: "bg-gray-400", badgeText: "text-gray-600", badgeBg: "bg-gray-100" },
  spam: { label: "Spam", dotColor: "bg-gray-300", badgeText: "text-gray-400", badgeBg: "bg-gray-50" },
};
