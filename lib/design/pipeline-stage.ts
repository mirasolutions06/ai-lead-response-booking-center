import { LeadStatus } from "@prisma/client";

export interface PipelineStageStyle {
  label: string;
  color: string;
}

export const PIPELINE_STAGES: LeadStatus[] = ["new", "qualified", "booked", "follow_up_needed", "won", "lost"];

export const PIPELINE_STAGE_STYLES: Record<LeadStatus, PipelineStageStyle> = {
  new: { label: "New", color: "#2563eb" },
  qualified: { label: "Qualified", color: "#7c3aed" },
  booked: { label: "Booked", color: "#0d9488" },
  follow_up_needed: { label: "Follow-up Needed", color: "#d97706" },
  won: { label: "Won", color: "#16a34a" },
  lost: { label: "Lost", color: "#6b7280" },
};
