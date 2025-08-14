-- CreateTable
CREATE TABLE "public"."DoctorProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "specialization" TEXT NOT NULL,
    "qualifications" TEXT,
    "experience" INTEGER,
    "clinicName" TEXT,
    "clinicAddress" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT NOT NULL,
    "consultationFee" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "public"."DoctorProfile"("userId");

-- AddForeignKey
ALTER TABLE "public"."DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
