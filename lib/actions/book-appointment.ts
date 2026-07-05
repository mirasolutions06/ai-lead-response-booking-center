"use server";

import { prisma } from "@/lib/prisma";
import { logStep } from "@/lib/logs/automation-log";

function generateConfirmationCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function bookAppointment(leadId: string, slotId: string) {
  const appointment = await prisma.$transaction(async (tx) => {
    const slot = await tx.availabilitySlot.findUniqueOrThrow({ where: { id: slotId } });
    if (slot.status !== "open") {
      throw new Error(`Slot ${slotId} is not open (status: ${slot.status})`);
    }

    const created = await tx.appointment.create({
      data: {
        leadId,
        slotId,
        status: "booked",
        confirmationCode: generateConfirmationCode(),
      },
    });

    await tx.availabilitySlot.update({ where: { id: slotId }, data: { status: "booked" } });
    await tx.lead.update({ where: { id: leadId }, data: { status: "booked" } });

    return created;
  });

  await logStep(prisma, { leadId, step: "human_approved", detail: "Booking confirmed by human" });
  await logStep(prisma, {
    leadId,
    step: "booking_staged",
    detail: `Appointment ${appointment.confirmationCode} booked`,
  });
  await logStep(prisma, { leadId, step: "crm_updated", detail: "Lead status set to booked" });

  return appointment;
}
