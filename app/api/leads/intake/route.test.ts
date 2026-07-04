import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { POST } from "./route";

const prisma = new PrismaClient();
const createdLeadIds: string[] = [];

afterEach(async () => {
  for (const leadId of createdLeadIds) {
    await prisma.automationLog.deleteMany({ where: { leadId } });
    await prisma.followUpDraft.deleteMany({ where: { leadId } });
    await prisma.leadExtraction.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
  }
  createdLeadIds.length = 0;
});

describe("POST /api/leads/intake", () => {
  it("returns 400 for invalid input", async () => {
    const request = new Request("http://localhost/api/leads/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "sms" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 201 and creates a real lead for valid input", async () => {
    const request = new Request("http://localhost/api/leads/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rawMessage: "Looking for a dentist appointment next week, jane@example.com",
        source: "website_form",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const json = await response.json();
    createdLeadIds.push(json.lead.id);
    expect(json.extraction.requestedService).toBe("Dental appointment");
  });
});
