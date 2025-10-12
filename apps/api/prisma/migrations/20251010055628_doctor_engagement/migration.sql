-- CreateTable
CREATE TABLE "public"."DoctorEngagement" (
    "id" SERIAL NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardViews" INTEGER NOT NULL DEFAULT 0,
    "siteClicks" INTEGER NOT NULL DEFAULT 0,
    "bookClicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DoctorEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorEngagement_doctorId_date_key" ON "public"."DoctorEngagement"("doctorId", "date");

-- AddForeignKey
ALTER TABLE "public"."DoctorEngagement" ADD CONSTRAINT "DoctorEngagement_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
