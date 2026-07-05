"use server";

import { prisma } from "@/lib/prisma";
import { logStep } from "@/lib/logs/automation-log";

function generateConfirmationCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function bookAppointment(leadId: string, slotId: string) {
  const { appointment, notificationChannel } = await prisma.$transaction(async (tx) => {
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
    const lead = await tx.lead.update({ where: { id: leadId }, data: { status: "booked" } });

    let notificationChannel: "sms" | "email" | null = null;
    if (lead.phone || lead.email) {
      const business = await tx.business.findFirstOrThrow();
      const formattedTime = slot.startsAt.toLocaleString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: business.timezone,
      });
      const channel = lead.phone ? "sms" : "email";
      const body = `Hi${lead.name ? " " + lead.name : ""}, your appointment is confirmed for ${formattedTime}. Confirmation code: ${created.confirmationCode}.`;

      await tx.notification.create({
        data: {
          leadId,
          channel,
          body,
        },
      });
      notificationChannel = channel;
    }

    return { appointment: created, notificationChannel };
  });

  await logStep(prisma, { leadId, step: "human_approved", detail: "Booking confirmed by human" });
  await logStep(prisma, {
    leadId,
    step: "booking_staged",
    detail: `Appointment ${appointment.confirmationCode} booked`,
  });
  if (notificationChannel) {
    await logStep(prisma, {
      leadId,
      step: "notification_staged",
      detail: `${notificationChannel} booking-confirmation notification staged`,
    });
  }
  await logStep(prisma, { leadId, step: "crm_updated", detail: "Lead status set to booked" });

  return appointment;
}
