import { PrismaClient } from "@prisma/client";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const DEFAULT_HOURS = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  openMinute: 8 * 60,
  closeMinute: 18 * 60,
}));
const APPOINTMENT_LENGTH_MINUTES = 60;
const DAYS_AHEAD = 10;

export async function ensureBusinessHours(prisma: PrismaClient, businessId: string) {
  const existing = await prisma.businessHours.findMany({ where: { businessId } });
  if (existing.length > 0) return existing;
  await prisma.businessHours.createMany({
    data: DEFAULT_HOURS.map((h) => ({ ...h, businessId })),
  });
  return prisma.businessHours.findMany({ where: { businessId } });
}

/**
 * Build a "wall clock" date-time string (no offset) for a given calendar date
 * (yyyy-mm-dd, itself already resolved in the business's timezone) plus a
 * minute-of-day, then hand it to `fromZonedTime` so date-fns-tz resolves it
 * against the business's IANA timezone — correctly accounting for DST.
 */
function zonedWallClockToUtc(dateKey: string, minuteOfDay: number, timeZone: string): Date {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const wallClock = `${dateKey}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  return fromZonedTime(wallClock, timeZone);
}

export async function ensureSlotsGenerated(prisma: PrismaClient, businessId: string) {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const hours = await ensureBusinessHours(prisma, businessId);
  const hoursByDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  // "Today" must be the business's own calendar day, not the server's — a server
  // running in e.g. Europe/Paris can already be into tomorrow (or still in
  // yesterday) relative to a business in America/Chicago.
  const nowInBusinessTz = toZonedTime(new Date(), business.timezone);
  const todayKeyBase = new Date(
    Date.UTC(nowInBusinessTz.getFullYear(), nowInBusinessTz.getMonth(), nowInBusinessTz.getDate())
  );
  const todayKey = todayKeyBase.toISOString().slice(0, 10);
  // Start of "today" in the business's own timezone, expressed as the UTC instant
  // it corresponds to — used below to only return slots from today onward.
  const startOfTodayUtc = zonedWallClockToUtc(todayKey, 0, business.timezone);

  const candidates: { startsAt: Date; endsAt: Date }[] = [];

  for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
    const date = new Date(todayKeyBase);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const dateKey = date.toISOString().slice(0, 10); // yyyy-mm-dd in the business's calendar
    const dayHours = hoursByDay.get(date.getUTCDay());
    if (!dayHours) continue;

    for (
      let minute = dayHours.openMinute;
      minute + APPOINTMENT_LENGTH_MINUTES <= dayHours.closeMinute;
      minute += APPOINTMENT_LENGTH_MINUTES
    ) {
      const startsAt = zonedWallClockToUtc(dateKey, minute, business.timezone);
      // A fixed 60-minute duration added directly to the correct UTC instant is
      // always correct regardless of DST — no need to re-derive via another
      // zoned conversion (and doing so could actually introduce a DST bug on
      // the rare day the appointment window straddles a spring-forward/fall-back
      // transition).
      const endsAt = new Date(startsAt.getTime() + APPOINTMENT_LENGTH_MINUTES * 60_000);

      candidates.push({ startsAt, endsAt });
    }
  }

  // Batched insert: relies on AvailabilitySlot.startsAt being @unique (see schema)
  // so re-running this on subsequent calls silently skips already-generated slots
  // instead of erroring or duplicating rows.
  //
  // Deliberately NOT a per-slot upsert loop (the more obvious Prisma pattern): against
  // the real remote Supabase pooler, a sequential loop of ~50+ upserts took 24-50s+ and
  // risked leaving a partial/orphaned set of rows if the request timed out mid-loop.
  // A single batched createMany is one round trip and either fully succeeds or fully
  // no-ops on a rerun — don't revert to a loop without re-benchmarking against prod-like
  // network latency.
  if (candidates.length > 0) {
    await prisma.availabilitySlot.createMany({
      data: candidates,
      skipDuplicates: true,
    });
  }

  return prisma.availabilitySlot.findMany({
    where: { startsAt: { gte: startOfTodayUtc }, status: "open" },
    orderBy: { startsAt: "asc" },
  });
}
