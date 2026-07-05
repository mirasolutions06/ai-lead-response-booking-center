import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { approveFollowUp } from "./approve-follow-up";

const prisma = new PrismaClient();
const createdLeadIds: string[] = [];

afterEach(async () => {
  for (const leadId of createdLeadIds) {
    await prisma.notification.deleteMany({ where: { leadId } });
    await prisma.automationLog.deleteMany({ where: { leadId } });
    await prisma.followUpDraft.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
  }
  createdLeadIds.length = 0;
});

describe("approveFollowUp", () => {
  it("moves a draft to approved, stages a notification, and logs both steps", async () => {
    const lead = await prisma.lead.create({
      data: { source: "sms", rawMessage: "test", name: "Jane Doe", phone: "555-1234" },
    });
    createdLeadIds.push(lead.id);
    const draft = await prisma.followUpDraft.create({
      data: { leadId: lead.id, message: "Hi Jane, thanks for reaching out." },
    });

    await approveFollowUp(draft.id);

    const updatedDraft = await prisma.followUpDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(updatedDraft.status).toBe("approved");
    expect(updatedDraft.approvedAt).not.toBeNull();

    const notification = await prisma.notification.findFirst({ where: { leadId: lead.id } });
    expect(notification).not.toBeNull();
    expect(notification?.status).toBe("staged");
    expect(notification?.body).toBe("Hi Jane, thanks for reaching out.");

    const logs = await prisma.automationLog.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map((l) => l.step)).toEqual(["human_approved", "notification_staged"]);
  });

  it("throws if the draft does not exist", async () => {
    await expect(approveFollowUp("nonexistent-id")).rejects.toThrow();
  });

  it("throws and creates no notification when the lead has neither phone nor email", async () => {
    const lead = await prisma.lead.create({
      data: { source: "email", rawMessage: "test" },
    });
    createdLeadIds.push(lead.id);
    const draft = await prisma.followUpDraft.create({
      data: { leadId: lead.id, message: "Hi, thanks for reaching out." },
    });

    await expect(approveFollowUp(draft.id)).rejects.toThrow(/no phone or email/);

    const unchangedDraft = await prisma.followUpDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(unchangedDraft.status).toBe("drafted");

    const notification = await prisma.notification.findFirst({ where: { leadId: lead.id } });
    expect(notification).toBeNull();
  });

  it("is idempotent — approving an already-approved draft does not create a second notification", async () => {
    const lead = await prisma.lead.create({
      data: { source: "sms", rawMessage: "test", phone: "555-9999" },
    });
    createdLeadIds.push(lead.id);
    const draft = await prisma.followUpDraft.create({
      data: { leadId: lead.id, message: "Hi, thanks for reaching out." },
    });

    await approveFollowUp(draft.id);
    await approveFollowUp(draft.id);

    const notifications = await prisma.notification.findMany({ where: { leadId: lead.id } });
    expect(notifications).toHaveLength(1);

    const logs = await prisma.automationLog.findMany({ where: { leadId: lead.id } });
    expect(logs.filter((l) => l.step === "human_approved")).toHaveLength(1);
    expect(logs.filter((l) => l.step === "notification_staged")).toHaveLength(1);
  });
});
