-- CreateTable
CREATE TABLE "public"."DoctorTimeOff" (
    "id" SERIAL NOT NULL,
    "doctorProfileId" INTEGER NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorTimeOff_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."DoctorTimeOff" ADD CONSTRAINT "DoctorTimeOff_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "public"."DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
