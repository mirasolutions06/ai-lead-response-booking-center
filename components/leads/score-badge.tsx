import { QualificationStatus } from "@/lib/schemas/lead-intelligence";
import { LEAD_STATUS_STYLES } from "@/lib/design/lead-status";

export function ScoreBadge({ score, status }: { score: number; status: QualificationStatus }) {
  const style = LEAD_STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${style.badgeText} ${style.badgeBg}`}>
      {score}
    </span>
  );
}
