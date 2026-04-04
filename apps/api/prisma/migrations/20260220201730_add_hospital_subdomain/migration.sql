/*
  Warnings:

  - A unique constraint covering the columns `[subdomain]` on the table `Hospital` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Hospital" ADD COLUMN     "subdomain" TEXT;

-- CreateTable
CREATE TABLE "public"."SearchAnalytics" (
    "id" SERIAL NOT NULL,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "matchedConditions" TEXT[],
    "matchedSpecialties" TEXT[],
    "topRankedDoctorId" INTEGER,
    "clickedDoctorId" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchAnalytics_normalizedQuery_idx" ON "public"."SearchAnalytics"("normalizedQuery");

-- CreateIndex
CREATE INDEX "SearchAnalytics_topRankedDoctorId_idx" ON "public"."SearchAnalytics"("topRankedDoctorId");

-- CreateIndex
CREATE INDEX "SearchAnalytics_clickedDoctorId_idx" ON "public"."SearchAnalytics"("clickedDoctorId");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_subdomain_key" ON "public"."Hospital"("subdomain");
