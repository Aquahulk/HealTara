-- CreateTable
CREATE TABLE "public"."DoctorWorkingHours" (
    "id" SERIAL NOT NULL,
    "doctorProfileId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorWorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorWorkingHours_doctorProfileId_dayOfWeek_key" ON "public"."DoctorWorkingHours"("doctorProfileId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "public"."DoctorWorkingHours" ADD CONSTRAINT "DoctorWorkingHours_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "public"."DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
