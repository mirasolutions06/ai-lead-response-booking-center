"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LeadStatus, Prisma } from "@prisma/client";
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider, type DragEndEvent } from "@/components/ui/kanban";
import { ScoreBadge } from "@/components/leads/score-badge";
import { PIPELINE_STAGES, PIPELINE_STAGE_STYLES } from "@/lib/design/pipeline-stage";
import { getStalenessLevel, STALENESS_TEXT_COLOR } from "@/lib/design/staleness";
import { moveLeadStage } from "@/lib/actions/move-lead-stage";

type PipelineLead = Prisma.LeadGetPayload<{ include: { extractions: true } }>;
type KanbanItem = { id: string; name: string; column: LeadStatus; lead: PipelineLead };

// Fixed locale/timeZone so server-rendered and client-hydrated output are
// byte-identical regardless of the host machine's or browser's own locale —
// toLocaleString() with no explicit options can differ between server and
// client, which React reports as a hydration mismatch (see formatReceivedAt
// in components/leads/lead-table.tsx for the same pattern).
function formatCardTimestamp(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

const COLUMNS = PIPELINE_STAGES.map((status) => ({ id: status, name: PIPELINE_STAGE_STYLES[status].label }));

export function PipelineClient({ leads }: { leads: PipelineLead[] }) {
  const router = useRouter();
  const [items, setItems] = useState<KanbanItem[]>(
    leads.map((lead) => ({
      id: lead.id,
      name: lead.name ?? lead.phone ?? lead.email ?? "Unknown",
      column: lead.status,
      lead,
    }))
  );

  function handleDragEnd(event: DragEndEvent) {
    const leadId = event.active.id as string;
    const overId = event.over?.id;
    if (!overId) return;

    const targetColumn = COLUMNS.some((c) => c.id === overId)
      ? (overId as LeadStatus)
      : items.find((i) => i.id === overId)?.column;

    const original = leads.find((l) => l.id === leadId);
    if (!original || !targetColumn || original.status === targetColumn) return;

    moveLeadStage(leadId, targetColumn).then(() => router.refresh());
  }

  return (
    <KanbanProvider
      id="lead-pipeline"
      columns={COLUMNS}
      data={items}
      onDataChange={setItems}
      onDragEnd={handleDragEnd}
      className="h-full"
    >
      {(column) => (
        <KanbanBoard id={column.id} key={column.id}>
          <KanbanHeader>
            <div className="flex items-center justify-between">
              <span style={{ color: PIPELINE_STAGE_STYLES[column.id as LeadStatus].color }}>{column.name}</span>
              <span className="text-xs text-gray-400">
                {items.filter((i) => i.column === column.id).length}
              </span>
            </div>
          </KanbanHeader>
          <KanbanCards id={column.id}>
            {(item: KanbanItem) => {
              const extraction = item.lead.extractions[0];
              const staleness = getStalenessLevel(item.lead.createdAt);
              const isResolved = ["won", "booked", "lost"].includes(item.lead.status);
              return (
                <KanbanCard column={item.column} id={item.id} key={item.id} name={item.name}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="m-0 text-sm font-medium">{item.name}</p>
                    {extraction && <ScoreBadge score={extraction.leadScore} status={extraction.qualificationStatus} />}
                  </div>
                  <p className="m-0 text-xs text-gray-500">{extraction?.requestedService ?? "—"}</p>
                  <p className={`m-0 text-xs ${isResolved ? "text-gray-400" : STALENESS_TEXT_COLOR[staleness]}`}>
                    {formatCardTimestamp(item.lead.createdAt)}
                  </p>
                </KanbanCard>
              );
            }}
          </KanbanCards>
        </KanbanBoard>
      )}
    </KanbanProvider>
  );
}
