-- CreateIndex
CREATE INDEX "Appointment_doctorId_date_status_idx" ON "public"."Appointment"("doctorId", "date", "status");

-- CreateIndex
CREATE INDEX "Appointment_patientId_date_idx" ON "public"."Appointment"("patientId", "date");

-- CreateIndex
CREATE INDEX "Appointment_date_time_idx" ON "public"."Appointment"("date", "time");

-- CreateIndex
CREATE INDEX "Slot_doctorId_date_status_idx" ON "public"."Slot"("doctorId", "date", "status");

-- CreateIndex
CREATE INDEX "Slot_date_status_idx" ON "public"."Slot"("date", "status");

-- CreateIndex
CREATE INDEX "Slot_status_time_idx" ON "public"."Slot"("status", "time");
