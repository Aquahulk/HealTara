-- Add latitude/longitude to doctor_profiles for map pin location
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Add latitude/longitude to hospitals for map pin location
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
