import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { bookAppointment } from "./book-appointment";
import { ensureSlotsGenerated } from "@/lib/scheduling/slots";

const prisma = new PrismaClient();
const createdLeadIds: string[] = [];
let businessId: string;

afterEach(async () => {
  for (const leadId of createdLeadIds) {
    await prisma.automationLog.deleteMany({ where: { leadId } });
    await prisma.appointment.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
  }
  createdLeadIds.length = 0;
});

describe("bookAppointment", () => {
  it("books an open slot, updates the lead, and logs the steps", async () => {
    let business = await prisma.business.findFirst();
    if (!business) {
      business = await prisma.business.create({ data: { name: "Test Co", timezone: "America/Chicago" } });
    }
    businessId = business.id;
    const slots = await ensureSlotsGenerated(prisma, businessId);
    const slot = slots[0];

    const lead = await prisma.lead.create({ data: { source: "sms", rawMessage: "test" } });
    createdLeadIds.push(lead.id);

    const appointment = await bookAppointment(lead.id, slot.id);

    expect(appointment.status).toBe("booked");
    expect(appointment.confirmationCode).toBeTruthy();

    const updatedSlot = await prisma.availabilitySlot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(updatedSlot.status).toBe("booked");

    const updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updatedLead.status).toBe("booked");

    const logs = await prisma.automationLog.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map((l) => l.step)).toEqual(["human_approved", "booking_staged", "crm_updated"]);
  });

  it("throws if the slot is already booked", async () => {
    let business = await prisma.business.findFirst();
    if (!business) {
      business = await prisma.business.create({ data: { name: "Test Co", timezone: "America/Chicago" } });
    }
    const slots = await ensureSlotsGenerated(prisma, business.id);
    const slot = slots.find((s) => s.status === "open");
    if (!slot) throw new Error("test setup: no open slot available");

    const leadA = await prisma.lead.create({ data: { source: "sms", rawMessage: "a" } });
    const leadB = await prisma.lead.create({ data: { source: "sms", rawMessage: "b" } });
    createdLeadIds.push(leadA.id, leadB.id);

    await bookAppointment(leadA.id, slot.id);
    await expect(bookAppointment(leadB.id, slot.id)).rejects.toThrow();
  });
});
