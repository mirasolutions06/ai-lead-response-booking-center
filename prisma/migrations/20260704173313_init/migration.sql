-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('website_form', 'sms', 'whatsapp', 'email', 'missed_call', 'quick_intake');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'qualified', 'booked', 'follow_up_needed', 'won', 'lost');

-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('hot', 'warm', 'cold', 'spam');

-- CreateEnum
CREATE TYPE "AiProviderKind" AS ENUM ('openai', 'rule_based');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('drafted', 'approved');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('open', 'booked');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('booked', 'cancelled');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('sms', 'email');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('staged');

-- CreateEnum
CREATE TYPE "AutomationStep" AS ENUM ('lead_received', 'ai_extraction_completed', 'lead_scored', 'follow_up_drafted', 'human_approved', 'booking_staged', 'crm_updated', 'notification_staged');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessHours" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openMinute" INTEGER NOT NULL,
    "closeMinute" INTEGER NOT NULL,

    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" "LeadSource" NOT NULL,
    "rawMessage" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadExtraction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "requestedService" TEXT,
    "urgency" TEXT,
    "location" TEXT,
    "budget" TEXT,
    "preferredTime" TEXT,
    "buyingIntent" TEXT,
    "leadScore" INTEGER NOT NULL,
    "qualificationStatus" "QualificationStatus" NOT NULL,
    "recommendedNextAction" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "missingContact" BOOLEAN NOT NULL,
    "unclearServiceOrLocation" BOOLEAN NOT NULL,
    "isSpam" BOOLEAN NOT NULL,
    "provider" "AiProviderKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpDraft" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'drafted',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'open',

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'booked',
    "confirmationCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "LeadStatus" NOT NULL,
    "toStatus" "LeadStatus" NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'staged',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "step" "AutomationStep" NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHours_businessId_dayOfWeek_key" ON "BusinessHours"("businessId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySlot_startsAt_key" ON "AvailabilitySlot"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_slotId_key" ON "Appointment"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_confirmationCode_key" ON "Appointment"("confirmationCode");

-- AddForeignKey
ALTER TABLE "BusinessHours" ADD CONSTRAINT "BusinessHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadExtraction" ADD CONSTRAINT "LeadExtraction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpDraft" ADD CONSTRAINT "FollowUpDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AvailabilitySlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEvent" ADD CONSTRAINT "PipelineEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
