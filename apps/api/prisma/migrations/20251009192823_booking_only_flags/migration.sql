-- AlterTable
ALTER TABLE "public"."DoctorProfile" ADD COLUMN     "micrositeEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "canLogin" BOOLEAN NOT NULL DEFAULT true;
