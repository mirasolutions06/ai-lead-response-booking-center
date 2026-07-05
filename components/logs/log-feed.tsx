"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RecentLog } from "@/lib/logs/queries";

// Fixed locale/timeZone so server-rendered and client-hydrated output are
// byte-identical regardless of the host machine's or browser's own locale —
// toLocaleTimeString() with no explicit options can differ between server and
// client, which React reports as a hydration mismatch.
function formatLogTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

const STEP_LABELS: Record<string, string> = {
  lead_received: "Lead received",
  ai_extraction_completed: "AI extraction completed",
  lead_scored: "Lead scored",
  follow_up_drafted: "Follow-up drafted",
  human_approved: "Human approved",
  booking_staged: "Booking staged",
  crm_updated: "CRM updated",
  notification_staged: "Notification staged",
};

export function LogFeed({ logs }: { logs: RecentLog[] }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        Live
      </div>
      <div className="rounded-lg border border-gray-100 divide-y divide-gray-50">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <span className="font-medium text-gray-900">{STEP_LABELS[log.step] ?? log.step}</span>
              <span className="ml-2 text-gray-500">{log.detail}</span>
              {log.lead && (
                <span className="ml-2 text-gray-400">
                  — {log.lead.name ?? log.lead.phone ?? log.lead.email ?? "lead"}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">{formatLogTime(log.createdAt)}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No activity yet.</div>
        )}
      </div>
    </div>
  );
}
