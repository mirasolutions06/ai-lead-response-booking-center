import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { ensureSlotsGenerated } from "./slots";

const prisma = new PrismaClient();
const BUSINESS_TIMEZONE = "America/Chicago";
let businessId: string;
let preExistingSlotIds: string[] = [];

beforeAll(async () => {
  preExistingSlotIds = (await prisma.availabilitySlot.findMany({ select: { id: true } })).map((s) => s.id);

  const business = await prisma.business.create({
    data: { name: "Test Business", timezone: BUSINESS_TIMEZONE },
  });
  businessId = business.id;
});

afterAll(async () => {
  await prisma.availabilitySlot.deleteMany({ where: { id: { notIn: preExistingSlotIds } } });
  await prisma.businessHours.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
});

// AvailabilitySlot has no businessId column (single-tenant assumption elsewhere in this
// codebase — see the comment in lib/actions/book-appointment.ts), so
// ensureSlotsGenerated's return value is ALL open slots system-wide, not just the ones
// for the businessId passed in. That includes the live seeded "Demo Service Co."
// business's pre-existing slots (generated earlier under the old, buggy server-local-
// time logic) plus anything left over from other tests. To assert on only the slots
// *this* test run actually generated, filter out everything that already existed
// before this test's ensureSlotsGenerated call — mirroring the same
// preExistingSlotIds-based isolation the afterAll cleanup already relies on.
function onlyNewSlots<T extends { id: string }>(slots: T[], existingIds: string[]): T[] {
  const existing = new Set(existingIds);
  return slots.filter((s) => !existing.has(s.id));
}

describe("ensureSlotsGenerated", () => {
  it("generates open slots within business hours on weekdays only, in the business's own timezone", async () => {
    const allSlots = await ensureSlotsGenerated(prisma, businessId);
    const slots = onlyNewSlots(allSlots, preExistingSlotIds);
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      // Read the hour and day-of-week as they'd actually appear on the business's own
      // wall clock (America/Chicago), NOT via raw .getHours()/.getDay(), which read in
      // whatever timezone the *test runner process* happens to be in. A slot stored as
      // e.g. Friday 23:00 America/Chicago is Saturday 04:00/05:00 UTC — asserting on the
      // raw UTC-backed getters would silently check the wrong calendar day/hour.
      const zoned = toZonedTime(slot.startsAt, BUSINESS_TIMEZONE);
      const hour = zoned.getHours();
      expect(hour).toBeGreaterThanOrEqual(8);
      expect(hour).toBeLessThan(18);
      const day = zoned.getDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it("does not duplicate slots when called twice", async () => {
    const first = await ensureSlotsGenerated(prisma, businessId);
    const second = await ensureSlotsGenerated(prisma, businessId);
    expect(second.length).toBe(first.length);
  });

  it("stores the business's last (17:00) America/Chicago wall-clock slot at the correct UTC instant, not server-local or UTC", async () => {
    // Non-tautological regression check: this pins down the exact UTC instant we
    // expect one of the business's opening-hours slots to be stored as, computed via
    // a totally independent construction (fromZonedTime on an explicit wall-clock
    // string) rather than re-using ensureSlotsGenerated's own internal helper. A
    // hardcoded-UTC regression (slots stored as if Xam/pm meant Xam/pm UTC) or a
    // reintroduced server-local-time bug would both fail this assertion, whereas the
    // old `.getHours()` assertion would not have caught either regression if the test
    // machine's local timezone happened to be close to America/Chicago's offset.
    //
    // Deliberately checks the 17:00 (5pm) slot rather than the 08:00 opening slot:
    // the live seeded "Demo Service Co." business already has ~69 pre-existing
    // AvailabilitySlot rows in this same shared table (generated earlier under the
    // OLD buggy server-local-time logic, before this fix) occupying UTC hours
    // 06:00-15:00 every day — which happens to overlap 08:00 Chicago (13:00 UTC in
    // CDT). AvailabilitySlot.startsAt is globally unique with no businessId column
    // (see onlyNewSlots comment above), so a row already sitting at 13:00 UTC would
    // make an 08:00-Chicago assertion pass even against a broken implementation that
    // never actually inserted anything new there. 17:00 Chicago (22:00 UTC in CDT)
    // falls outside that old data's 06:00-15:00 UTC footprint, so a row existing
    // there can only be explained by *this* call to ensureSlotsGenerated having
    // just computed and inserted it correctly. This is a property of the live data
    // as it exists today, not a permanent assumption — see the businessId-scoping
    // gap noted above.
    await ensureSlotsGenerated(prisma, businessId);

    // Find the first Mon-Fri calendar date (in the business's own timezone) on or
    // after "today" — mirroring DEFAULT_HOURS, which only defines hours for
    // dayOfWeek 1-5. "Today" itself may be a weekend, in which case no slot exists
    // for it at all and the production code skips straight to the next weekday.
    const nowInBusinessTz = toZonedTime(new Date(), BUSINESS_TIMEZONE);
    let candidateDate = new Date(
      Date.UTC(nowInBusinessTz.getFullYear(), nowInBusinessTz.getMonth(), nowInBusinessTz.getDate())
    );
    while (candidateDate.getUTCDay() === 0 || candidateDate.getUTCDay() === 6) {
      candidateDate = new Date(candidateDate.getTime() + 24 * 60 * 60_000);
    }
    const firstWeekdayKey = candidateDate.toISOString().slice(0, 10);

    // DEFAULT_HOURS closes at 18:00 with 60-minute slots, so the last bookable slot
    // of the day opens at 17:00 and is independently verifiable as described above.
    const expectedStartUtc = fromZonedTime(`${firstWeekdayKey}T17:00:00`, BUSINESS_TIMEZONE);
    const expectedEndUtc = new Date(expectedStartUtc.getTime() + 60 * 60_000);

    const slotAtClosingHour = await prisma.availabilitySlot.findUnique({
      where: { startsAt: expectedStartUtc },
    });

    expect(slotAtClosingHour).not.toBeNull();
    expect(formatInTimeZone(slotAtClosingHour!.startsAt, BUSINESS_TIMEZONE, "HH:mm")).toBe("17:00");
    expect(slotAtClosingHour!.startsAt.getTime()).toBe(expectedStartUtc.getTime());
    expect(slotAtClosingHour!.endsAt.getTime()).toBe(expectedEndUtc.getTime());
  });
});
