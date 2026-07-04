import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ensureSlotsGenerated } from "./slots";

const prisma = new PrismaClient();
let businessId: string;
let preExistingSlotIds: string[] = [];

beforeAll(async () => {
  preExistingSlotIds = (await prisma.availabilitySlot.findMany({ select: { id: true } })).map((s) => s.id);

  const business = await prisma.business.create({
    data: { name: "Test Business", timezone: "America/Chicago" },
  });
  businessId = business.id;
});

afterAll(async () => {
  await prisma.availabilitySlot.deleteMany({ where: { id: { notIn: preExistingSlotIds } } });
  await prisma.businessHours.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
});

describe("ensureSlotsGenerated", () => {
  it("generates open slots within business hours on weekdays only", async () => {
    const slots = await ensureSlotsGenerated(prisma, businessId);
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const hour = slot.startsAt.getHours();
      expect(hour).toBeGreaterThanOrEqual(8);
      expect(hour).toBeLessThan(18);
      const day = slot.startsAt.getDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it("does not duplicate slots when called twice", async () => {
    const first = await ensureSlotsGenerated(prisma, businessId);
    const second = await ensureSlotsGenerated(prisma, businessId);
    expect(second.length).toBe(first.length);
  });
});
