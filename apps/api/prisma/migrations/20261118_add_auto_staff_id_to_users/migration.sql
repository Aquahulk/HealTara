-- ============================================================================
-- Add automatic staff_code generation for SLOT_ADMIN users
-- ============================================================================

-- Update the trigger to also handle staff_code for SLOT_ADMIN role
CREATE OR REPLACE FUNCTION assign_user_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate doctor code for DOCTOR role
  IF NEW.role = 'DOCTOR' AND NEW.doctor_code IS NULL THEN
    NEW.doctor_code := 'HLT-DOC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
  END IF;
  
  -- Generate staff code for SLOT_ADMIN role
  IF NEW.role = 'SLOT_ADMIN' AND NEW.staff_code IS NULL THEN
    NEW.staff_code := 'HLT-STA-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS trigger_assign_doctor_code ON "users";

CREATE TRIGGER trigger_assign_user_codes
  BEFORE INSERT ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_codes();

-- Backfill any existing SLOT_ADMIN users with staff codes
UPDATE "users"
SET "staff_code" = 'HLT-STA-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6))
WHERE "role" = 'SLOT_ADMIN' AND "staff_code" IS NULL;

COMMENT ON COLUMN "users"."staff_code" IS 'Permanent staff ID: HLT-STA-XXXXXX (auto-generated for SLOT_ADMIN role)';
