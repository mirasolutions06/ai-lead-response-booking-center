import { prisma } from "@/lib/prisma";
import { getPipelineLeads } from "@/lib/leads/queries";
import { PipelineClient } from "./pipeline-client";

export default async function PipelinePage() {
  const leads = await getPipelineLeads(prisma);

  return (
    <div className="flex h-full flex-col">
      <h1 className="mb-5 text-lg font-bold text-gray-900">CRM Pipeline</h1>
      <div className="flex-1 overflow-hidden">
        <PipelineClient leads={leads} />
      </div>
    </div>
  );
}
