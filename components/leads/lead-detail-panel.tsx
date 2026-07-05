"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/leads/score-badge";
import type { InboxLead } from "@/lib/leads/queries";
import { approveFollowUp } from "@/lib/actions/approve-follow-up";
import { moveLeadStage } from "@/lib/actions/move-lead-stage";

const CLOSED_STAGES = new Set(["booked", "won", "lost"]);

export function LeadDetailPanel({
  lead,
  open,
  onOpenChange,
}: {
  lead: InboxLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const extraction = lead?.extractions[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:max-w-[380px]">
        {lead && extraction && (
          <div className="flex flex-col gap-0 overflow-y-auto px-4 pb-4">
            <SheetHeader className="px-0">
              <SheetTitle className="flex items-center gap-2">
                {lead.name ?? lead.phone ?? lead.email ?? "Unknown lead"}
                <ScoreBadge score={extraction.leadScore} status={extraction.qualificationStatus} />
              </SheetTitle>
            </SheetHeader>

            {(extraction.missingContact || extraction.unclearServiceOrLocation || extraction.isSpam) && (
              <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {extraction.isSpam && "Flagged as spam. "}
                {extraction.missingContact && "Missing phone/email. "}
                {extraction.unclearServiceOrLocation && "Service or location unclear."}
              </div>
            )}

            <div className="mt-4">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-400">Raw message</div>
              <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">{lead.rawMessage}</div>
            </div>

            <div className="mt-4">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-400">AI reasoning</div>
              <div className="text-sm text-gray-600">{extraction.reasoning}</div>
            </div>

            <div className="mt-4">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-400">Draft follow-up</div>
              <Textarea defaultValue={lead.followUpDrafts[0]?.message ?? ""} rows={4} className="text-sm" />
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                disabled={
                  lead.followUpDrafts[0]?.status === "approved" ||
                  extraction.missingContact ||
                  isApproving ||
                  isDismissing
                }
                onClick={async () => {
                  const draftId = lead.followUpDrafts[0]?.id;
                  if (!draftId) return;
                  setIsApproving(true);
                  setError(null);
                  try {
                    await approveFollowUp(draftId);
                    onOpenChange(false);
                    router.refresh();
                  } catch {
                    setError("Couldn't approve this follow-up — it may be missing contact info.");
                  } finally {
                    setIsApproving(false);
                  }
                }}
              >
                {lead.followUpDrafts[0]?.status === "approved" ? "Approved" : "Approve & Send"}
              </Button>
              <Button size="sm" variant="secondary">
                Edit
              </Button>
              {!CLOSED_STAGES.has(lead.status) && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isApproving || isDismissing}
                  onClick={async () => {
                    setError(null);
                    setIsDismissing(true);
                    try {
                      await moveLeadStage(lead.id, "lost");
                      onOpenChange(false);
                      router.refresh();
                    } catch {
                      setError("Couldn't dismiss this lead — try again.");
                    } finally {
                      setIsDismissing(false);
                    }
                  }}
                >
                  Dismiss
                </Button>
              )}
            </div>

            {(extraction.qualificationStatus === "hot" || extraction.qualificationStatus === "warm") &&
              !CLOSED_STAGES.has(lead.status) && (
                <Link
                  href={`/booking?leadId=${lead.id}`}
                  className="mt-3 inline-block text-xs font-medium text-blue-600 hover:underline"
                >
                  Suggest booking slots →
                </Link>
              )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
