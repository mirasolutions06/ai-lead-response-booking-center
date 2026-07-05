import { PrismaClient } from "@prisma/client";
import { ensureSlotsGenerated } from "../lib/scheduling/slots";
import { runLeadIntake } from "../lib/leads/intake";
import { RuleBasedProvider } from "../lib/ai/rule-based-provider";
import { approveFollowUp } from "../lib/actions/approve-follow-up";
import { bookAppointment } from "../lib/actions/book-appointment";
import { moveLeadStage } from "../lib/actions/move-lead-stage";

const prisma = new PrismaClient();
const provider = new RuleBasedProvider();

const DEMO_LEADS: { rawMessage: string; source: "sms" | "whatsapp" | "email" | "website_form" | "missed_call" }[] = [
  { rawMessage: "My AC broke and it's 95 degrees, please help today! 555-201-4488", source: "sms" },
  { rawMessage: "Looking for a dentist appointment next week, priya@example.com", source: "website_form" },
  { rawMessage: "Interested in a real estate viewing this weekend for the Oak St property", source: "email" },
  { rawMessage: "We need a marketing agency for our Q4 launch, can we set up a consult? 555-990-1122", source: "website_form" },
  { rawMessage: "Get rich with crypto! Click here now, loan approved instantly!", source: "email" },
  { rawMessage: "Furnace is out and it's freezing, need a tech ASAP, 555-773-2200", source: "sms" },
  { rawMessage: "Would like to book a discovery call for coaching services next month", source: "whatsapp" },
];

async function main() {
  const existingBusiness = await prisma.business.findFirst();
  const business =
    existingBusiness ??
    (await prisma.business.create({ data: { name: "Demo Service Co.", timezone: "America/Chicago" } }));

  const slots = await ensureSlotsGenerated(prisma, business.id);
  console.log(`Business "${business.name}" ready with ${slots.length} open slots.`);

  const existingLeadCount = await prisma.lead.count();
  if (existingLeadCount > 0) {
    console.log(`${existingLeadCount} leads already exist — skipping demo lead creation.`);
    await prisma.$disconnect();
    return;
  }

  const createdLeads = [];
  for (const demo of DEMO_LEADS) {
    const result = await runLeadIntake(prisma, provider, demo);
    createdLeads.push(result);
  }
  console.log(`Created ${createdLeads.length} demo leads.`);

  const [hvacLead, dentalLead, realEstateLead, agencyLead, , furnaceLead, coachingLead] = createdLeads;

  await approveFollowUp(hvacLead.draft.id);
  const freshSlots = await ensureSlotsGenerated(prisma, business.id);
  const openSlot = freshSlots.find((s) => s.status === "open");
  if (!openSlot) {
    throw new Error("No open slots available to book the HVAC demo appointment — check ensureSlotsGenerated output.");
  }
  await bookAppointment(hvacLead.lead.id, openSlot.id);

  await moveLeadStage(dentalLead.lead.id, "qualified");
  await moveLeadStage(realEstateLead.lead.id, "qualified");
  await moveLeadStage(agencyLead.lead.id, "follow_up_needed");
  await moveLeadStage(furnaceLead.lead.id, "won");
  await moveLeadStage(coachingLead.lead.id, "lost");

  console.log("Demo leads distributed across CRM pipeline stages.");
}

main()
  .catch((e) => {
    console.error(e);
    console.error(
      "Partial seed data may exist — clear the leads table (and its dependent rows) before rerunning, since the existingLeadCount guard will otherwise skip lead creation."
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
