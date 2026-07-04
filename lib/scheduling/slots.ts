import { PrismaClient } from "@prisma/client";

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

export async function ensureSlotsGenerated(prisma: PrismaClient, businessId: string) {
  const hours = await ensureBusinessHours(prisma, businessId);
  const hoursByDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates: { startsAt: Date; endsAt: Date }[] = [];

  for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dayHours = hoursByDay.get(date.getDay());
    if (!dayHours) continue;

    for (
      let minute = dayHours.openMinute;
      minute + APPOINTMENT_LENGTH_MINUTES <= dayHours.closeMinute;
      minute += APPOINTMENT_LENGTH_MINUTES
    ) {
      const startsAt = new Date(date);
      startsAt.setMinutes(minute);
      const endsAt = new Date(startsAt);
      endsAt.setMinutes(startsAt.getMinutes() + APPOINTMENT_LENGTH_MINUTES);

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
  //
  // KNOWN GAP: this function ignores Business.timezone and does all date/hour math in
  // the server process's local timezone. Fine for the current single-business, same-
  // machine dev/demo setup, but will produce wrong slot hours if deployed somewhere
  // whose local timezone differs from the business's (e.g. a UTC-default host). Needs
  // proper IANA-timezone-aware conversion (e.g. via Intl.DateTimeFormat) before this
  // matters for a real deployment or multi-business support.
  if (candidates.length > 0) {
    await prisma.availabilitySlot.createMany({
      data: candidates,
      skipDuplicates: true,
    });
  }

  return prisma.availabilitySlot.findMany({
    where: { startsAt: { gte: today }, status: "open" },
    orderBy: { startsAt: "asc" },
  });
}
