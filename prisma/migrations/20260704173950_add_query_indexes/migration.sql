-- CreateIndex
CREATE INDEX "AutomationLog_leadId_idx" ON "AutomationLog"("leadId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_status_startsAt_idx" ON "AvailabilitySlot"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "PipelineEvent_leadId_idx" ON "PipelineEvent"("leadId");
