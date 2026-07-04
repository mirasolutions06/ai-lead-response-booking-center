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
