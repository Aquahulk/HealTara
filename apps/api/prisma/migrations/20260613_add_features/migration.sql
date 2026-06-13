-- Add features JSON column to doctor_profiles
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "features" JSONB DEFAULT '{}';

-- Add features JSON column to hospitals
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "features" JSONB DEFAULT '{}';
