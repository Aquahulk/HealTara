/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `DoctorProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."DoctorProfile" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_slug_key" ON "public"."DoctorProfile"("slug");
