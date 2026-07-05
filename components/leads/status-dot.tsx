import { QualificationStatus } from "@/lib/schemas/lead-intelligence";
import { LEAD_STATUS_STYLES } from "@/lib/design/lead-status";

export function StatusDot({ status }: { status: QualificationStatus }) {
  const style = LEAD_STATUS_STYLES[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
      <span className={`h-1.5 w-1.5 rounded-full ${style.dotColor}`} />
      {style.label}
    </span>
  );
}
