import { NextResponse } from "next/server";
import { LeadIntakeInputSchema } from "@/lib/schemas/lead-intelligence";
import { getLeadIntelligenceProvider } from "@/lib/ai/provider";
import { runLeadIntake } from "@/lib/leads/intake";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LeadIntakeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const provider = getLeadIntelligenceProvider();
    const result = await runLeadIntake(prisma, provider, parsed.data);

    return NextResponse.json(
      { lead: result.lead, extraction: result.extraction, draft: result.draft, safety: result.safety },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lead intake failed", error);
    return NextResponse.json({ error: "Failed to process lead intake" }, { status: 500 });
  }
}
