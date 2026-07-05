import { prisma } from "@/lib/prisma";
import { PipelineClient } from "./pipeline-client";

export default async function PipelinePage() {
  const leads = await prisma.lead.findMany({
    include: { extractions: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex h-full flex-col">
      <h1 className="mb-5 text-lg font-bold text-gray-900">CRM Pipeline</h1>
      <div className="flex-1 overflow-hidden">
        <PipelineClient leads={leads} />
      </div>
    </div>
  );
}
