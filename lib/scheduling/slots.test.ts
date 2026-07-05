import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { ensureSlotsGenerated } from "./slots";

const prisma = new PrismaClient();
const BUSINESS_TIMEZONE = "America/Chicago";
// Deliberately NOT the same open/close hours as DEFAULT_HOURS (8:00-18:00) in
// lib/scheduling/slots.ts. AvailabilitySlot.startsAt is globally unique with no
// businessId column (single-tenant assumption — see comment in
// lib/actions/book-appointment.ts), so a test business using the exact same
// timezone + hours as another business (e.g. the live seeded "Demo Service Co.",
// which also uses America/Chicago 8:00-18:00) would have every one of its
// candidate slots collide, byte-for-byte, with that other business's rows —
// causing skipDuplicates to silently no-op the entire insert and making this
// test business's slots indistinguishable from someone else's. Using a distinct
// open/close window guarantees this test's slots occupy UTC instants nothing
// else in the shared table uses, regardless of what other businesses or test
// runs have done to the table.
const TEST_OPEN_MINUTE = 9 * 60 + 15; // 09:15
const TEST_CLOSE_MINUTE = 11 * 60 + 15; // 11:15 (two 60-minute slots: 09:15 and 10:15)
const DAYS_AHEAD = 10; // mirrors DAYS_AHEAD in lib/scheduling/slots.ts
let businessId: string;

// The exact set of UTC instants THIS test's business could ever generate a slot at,
// computed independently of ensureSlotsGenerated. Used to scope cleanup precisely,
// instead of a "delete anything not in a beforeAll snapshot" strategy: vitest runs
// test files concurrently by default (see vitest.config.ts — no pool/isolation
// override), and AvailabilitySlot is a single global table with no businessId column
// shared with other test files (e.g. lib/actions/book-appointment.test.ts) that also
// call ensureSlotsGenerated against the live seeded business. A snapshot-diff cleanup
// risks a race: if another test file inserts real rows for a DIFFERENT business
// in the window between this file's beforeAll snapshot and its afterAll cleanup,
// "not in the snapshot" would wrongly match those rows too and delete real data that
// doesn't belong to this test. Deleting only by exact, known startsAt values this
// test's own distinct 09:15-11:15 window could produce eliminates that risk entirely
// — nothing outside this test's own reserved time window is ever touched.
function possibleTestSlotStarts(): Date[] {
  const nowInBusinessTz = toZonedTime(new Date(), BUSINESS_TIMEZONE);
  const base = new Date(
    Date.UTC(nowInBusinessTz.getFullYear(), nowInBusinessTz.getMonth(), nowInBusinessTz.getDate())
  );
  const starts: Date[] = [];
  for (let dayOffset = -1; dayOffset < DAYS_AHEAD + 1; dayOffset++) {
    // -1..+1 day padding to stay correct across any date-boundary edge cases.
    const day = new Date(base);
    day.setUTCDate(day.getUTCDate() + dayOffset);
    const dateKey = day.toISOString().slice(0, 10);
    for (let minute = TEST_OPEN_MINUTE; minute + 60 <= TEST_CLOSE_MINUTE; minute += 60) {
      const hh = String(Math.floor(minute / 60)).padStart(2, "0");
      const mm = String(minute % 60).padStart(2, "0");
      starts.push(fromZonedTime(`${dateKey}T${hh}:${mm}:00`, BUSINESS_TIMEZONE));
    }
  }
  return starts;
}

beforeAll(async () => {
  const business = await prisma.business.create({
    data: { name: "Test Business", timezone: BUSINESS_TIMEZONE },
  });
  businessId = business.id;

  // Pre-create BusinessHours explicitly so ensureSlotsGenerated's internal
  // ensureBusinessHours call sees existing rows and does NOT fall back to
  // DEFAULT_HOURS (8:00-18:00) — see the isolation comment above.
  await prisma.businessHours.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      businessId,
      dayOfWeek,
      openMinute: TEST_OPEN_MINUTE,
      closeMinute: TEST_CLOSE_MINUTE,
    })),
  });
});

afterAll(async () => {
  await prisma.availabilitySlot.deleteMany({ where: { startsAt: { in: possibleTestSlotStarts() } } });
  await prisma.businessHours.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
});

// AvailabilitySlot has no businessId column (single-tenant assumption elsewhere in this
// codebase — see the comment in lib/actions/book-appointment.ts), so
// ensureSlotsGenerated's return value is ALL open slots system-wide, not just the ones
// for the businessId passed in. That includes the live seeded "Demo Service Co."
// business's pre-existing slots (generated earlier under the old, buggy server-local-
// time logic) plus anything left over from other tests. To assert on only the slots
// *this* test's own business could have generated, filter down to this test's own
// reserved 09:15-11:15 time window (see possibleTestSlotStarts above) rather than
// diffing against a point-in-time snapshot of the whole table.
function onlyOwnSlots<T extends { startsAt: Date }>(slots: T[]): T[] {
  const ownStarts = new Set(possibleTestSlotStarts().map((d) => d.getTime()));
  return slots.filter((s) => ownStarts.has(s.startsAt.getTime()));
}

describe("ensureSlotsGenerated", () => {
  it("generates open slots within business hours on weekdays only, in the business's own timezone", async () => {
    const allSlots = await ensureSlotsGenerated(prisma, businessId);
    const slots = onlyOwnSlots(allSlots);
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      // Read the hour/minute and day-of-week as they'd actually appear on the
      // business's own wall clock (America/Chicago), NOT via raw
      // .getHours()/.getDay(), which read in whatever timezone the *test runner
      // process* happens to be in. A slot stored as e.g. Friday 23:00
      // America/Chicago is Saturday 04:00/05:00 UTC — asserting on the raw
      // UTC-backed getters would silently check the wrong calendar day/hour.
      const zoned = toZonedTime(slot.startsAt, BUSINESS_TIMEZONE);
      const minuteOfDay = zoned.getHours() * 60 + zoned.getMinutes();
      expect(minuteOfDay).toBeGreaterThanOrEqual(TEST_OPEN_MINUTE);
      expect(minuteOfDay).toBeLessThan(TEST_CLOSE_MINUTE);
      const day = zoned.getDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it("does not duplicate slots when called twice", async () => {
    // Scoped to this test's own reserved 09:15-11:15 window (onlyOwnSlots) rather
    // than comparing raw global counts: ensureSlotsGenerated's returned list is
    // ALL open slots system-wide (see onlyOwnSlots comment above), and other test
    // files (e.g. book-appointment.test.ts) run concurrently against the live
    // seeded business, booking/inserting/unbooking real slots in the same shared
    // table at the same time. Comparing global totals before/after is flaky by
    // construction — a slot elsewhere in the table can legitimately change status
    // between the two calls for reasons that have nothing to do with duplication.
    const first = onlyOwnSlots(await ensureSlotsGenerated(prisma, businessId));
    const second = onlyOwnSlots(await ensureSlotsGenerated(prisma, businessId));
    expect(second.length).toBe(first.length);
  });

  it("stores the 09:15 America/Chicago wall-clock slot at the correct UTC instant, not server-local or UTC", async () => {
    // Non-tautological regression check: this pins down the exact UTC instant we
    // expect the business's opening slot to be stored as, computed via a totally
    // independent construction (fromZonedTime on an explicit wall-clock string)
    // rather than re-using ensureSlotsGenerated's own internal helper. A
    // hardcoded-UTC regression (slots stored as if 09:15 meant 09:15 UTC) or a
    // reintroduced server-local-time bug would both fail this assertion, whereas
    // the old `.getHours()` assertion would not have caught either regression if
    // the test machine's local timezone happened to be close to America/Chicago's
    // offset.
    //
    // This test business intentionally uses its own distinct 09:15-11:15 open
    // window (see TEST_OPEN_MINUTE/TEST_CLOSE_MINUTE above and the isolation
    // comment on those constants) rather than DEFAULT_HOURS's 8:00-18:00, so its
    // slots occupy UTC instants that cannot collide with the live seeded "Demo
    // Service Co." business or any other test — this assertion is safe regardless
    // of what other rows currently exist in the shared AvailabilitySlot table.
    await ensureSlotsGenerated(prisma, businessId);

    // Find the first Mon-Fri calendar date (in the business's own timezone) on or
    // after "today" — this test's BusinessHours only defines hours for dayOfWeek
    // 1-5. "Today" itself may be a weekend, in which case no slot exists for it at
    // all and the production code skips straight to the next weekday.
    const nowInBusinessTz = toZonedTime(new Date(), BUSINESS_TIMEZONE);
    let candidateDate = new Date(
      Date.UTC(nowInBusinessTz.getFullYear(), nowInBusinessTz.getMonth(), nowInBusinessTz.getDate())
    );
    while (candidateDate.getUTCDay() === 0 || candidateDate.getUTCDay() === 6) {
      candidateDate = new Date(candidateDate.getTime() + 24 * 60 * 60_000);
    }
    const firstWeekdayKey = candidateDate.toISOString().slice(0, 10);

    const expectedStartUtc = fromZonedTime(`${firstWeekdayKey}T09:15:00`, BUSINESS_TIMEZONE);
    const expectedEndUtc = new Date(expectedStartUtc.getTime() + 60 * 60_000);

    const openingSlot = await prisma.availabilitySlot.findUnique({
      where: { startsAt: expectedStartUtc },
    });

    expect(openingSlot).not.toBeNull();
    expect(formatInTimeZone(openingSlot!.startsAt, BUSINESS_TIMEZONE, "HH:mm")).toBe("09:15");
    expect(openingSlot!.startsAt.getTime()).toBe(expectedStartUtc.getTime());
    expect(openingSlot!.endsAt.getTime()).toBe(expectedEndUtc.getTime());
  });
});
