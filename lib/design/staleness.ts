export type StalenessLevel = "normal" | "warning" | "stale";

export function getStalenessLevel(createdAt: Date, now: Date = new Date()): StalenessLevel {
  const hoursSince = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursSince >= 24) return "stale";
  if (hoursSince >= 4) return "warning";
  return "normal";
}

export const STALENESS_TEXT_COLOR: Record<StalenessLevel, string> = {
  normal: "text-gray-500",
  warning: "text-amber-600",
  stale: "text-red-600",
};
