import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { LeadIntakeInputSchema } from "@/lib/schemas/lead-intelligence";
import { getLeadIntelligenceProvider } from "@/lib/ai/provider";
import { runLeadIntake } from "@/lib/leads/intake";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LeadIntakeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const provider = getLeadIntelligenceProvider();
  const result = await runLeadIntake(prisma, provider, parsed.data);

  return NextResponse.json(
    { lead: result.lead, extraction: result.extraction, draft: result.draft, safety: result.safety },
    { status: 201 }
  );
}
