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
// in components/leads/lead-table.tsx for the same pattern). timeZone is the
// business's real IANA zone (e.g. "America/Chicago"), fetched server-side
// from the Business row and passed down as a plain prop — not the browser's
// own zone (which would vary per client and reintroduce the mismatch). Since
// AvailabilitySlot.startsAt is now generated as the true UTC instant for the
// business's local wall-clock time (see lib/scheduling/slots.ts), formatting
// with the business's timezone here is what actually displays correctly;
// this mirrors the same approach already used for notification text in
// lib/actions/book-appointment.ts.
function formatSlotDay(date: Date, timeZone: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  });
}

function formatSlotTime(date: Date, timeZone: string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
}

export function BookingClient({
  slots,
  leads,
  initialLeadId,
  businessTimezone,
}: {
  slots: AvailabilitySlot[];
  leads: InboxLead[];
  initialLeadId?: string;
  businessTimezone: string;
}) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLeadId ?? leads[0]?.id ?? "");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = slots.reduce<Record<string, AvailabilitySlot[]>>((acc, slot) => {
    const day = formatSlotDay(slot.startsAt, businessTimezone);
    acc[day] = acc[day] ?? [];
    acc[day].push(slot);
    return acc;
  }, {});

  async function handleBook(slotId: string) {
    if (!selectedLeadId || isBooking) return;
    setIsBooking(true);
    setError(null);
    try {
      const appointment = await bookAppointment(selectedLeadId, slotId);
      setConfirmation(appointment.confirmationCode);
      router.refresh();
    } catch {
      setError("That slot was just booked by someone else — pick another one.");
      router.refresh();
    } finally {
      setIsBooking(false);
    }
  }

  if (confirmation) {
    return (
      <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
        Booked! Confirmation code: <span className="font-bold">{confirmation}</span>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-500">
        No bookable leads right now — every lead is already booked or closed.
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

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

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
                  disabled={!selectedLeadId || isBooking}
                  onClick={() => handleBook(slot.id)}
                >
                  {formatSlotTime(slot.startsAt, businessTimezone)}
                </Button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
