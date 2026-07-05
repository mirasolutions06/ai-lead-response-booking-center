import { prisma } from "@/lib/prisma";
import { getRecentLogs } from "@/lib/logs/queries";
import { LogFeed } from "@/components/logs/log-feed";

export default async function LogsPage() {
  const logs = await getRecentLogs(prisma);

  return (
    <div>
      <h1 className="mb-5 text-lg font-bold text-gray-900">Automation Logs</h1>
      <LogFeed logs={logs} />
    </div>
  );
}
