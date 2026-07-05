"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvailabilitySlot } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { bookAppointment } from "@/lib/actions/book-appointment";
import type { InboxLead } from "@/lib/leads/queries";

// Fixed locale/timeZone so server-rendered and client-hydrated output are
// byte-identical regardless of the host machine's or browser's own locale —
// toLocaleString() with no explicit options can differ between server and
// client, which React reports as a hydration mismatch (see formatReceivedAt
// in components/leads/lead-table.tsx for the same pattern).
function formatSlotDay(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatSlotTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export function BookingClient({
  slots,
  leads,
  initialLeadId,
}: {
  slots: AvailabilitySlot[];
  leads: InboxLead[];
  initialLeadId?: string;
}) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLeadId ?? leads[0]?.id ?? "");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const grouped = slots.reduce<Record<string, AvailabilitySlot[]>>((acc, slot) => {
    const day = formatSlotDay(slot.startsAt);
    acc[day] = acc[day] ?? [];
    acc[day].push(slot);
    return acc;
  }, {});

  async function handleBook(slotId: string) {
    if (!selectedLeadId) return;
    const appointment = await bookAppointment(selectedLeadId, slotId);
    setConfirmation(appointment.confirmationCode);
    router.refresh();
  }

  if (confirmation) {
    return (
      <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
        Booked! Confirmation code: <span className="font-bold">{confirmation}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-gray-500">Booking for:</span>
        <select
          className="rounded-md border border-gray-200 px-2 py-1 text-sm"
          value={selectedLeadId}
          onChange={(e) => setSelectedLeadId(e.target.value)}
        >
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name ?? lead.phone ?? lead.email ?? lead.id}
            </option>
          ))}
        </select>
      </div>

      {Object.entries(grouped).map(([day, daySlots]) => (
        <div key={day} className="mb-4">
          <div className="mb-1.5 text-xs font-semibold uppercase text-gray-400">{day}</div>
          <div className="flex flex-wrap gap-2">
            {daySlots
              .filter((s) => s.status === "open")
              .map((slot) => (
                <Button
                  key={slot.id}
                  size="sm"
                  variant="outline"
                  disabled={!selectedLeadId}
                  onClick={() => handleBook(slot.id)}
                >
                  {formatSlotTime(slot.startsAt)}
                </Button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
