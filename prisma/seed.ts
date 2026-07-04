import { PrismaClient } from "@prisma/client";
import { ensureSlotsGenerated } from "../lib/scheduling/slots";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.business.findFirst();
  const business =
    existing ??
    (await prisma.business.create({
      data: { name: "Demo Service Co.", timezone: "America/Chicago" },
    }));

  const slots = await ensureSlotsGenerated(prisma, business.id);
  console.log(`Seeded business "${business.name}" (${business.id}) with ${slots.length} open slots.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
