-- ============================================================================
-- Fix VARCHAR(20) to VARCHAR(30) for status columns
-- ============================================================================
-- The status enums use values up to 26 characters long but were defined as VARCHAR(20)
-- This migration increases the column length to VARCHAR(30) to accommodate all values
-- ============================================================================

-- Fix staff_assignment_requests.status column
ALTER TABLE "staff_assignment_requests" 
  ALTER COLUMN "status" TYPE VARCHAR(30);

-- Fix staff_assignments.status column  
ALTER TABLE "staff_assignments"
  ALTER COLUMN "status" TYPE VARCHAR(30);

-- Fix staff_profiles.status column
ALTER TABLE "staff_profiles"
  ALTER COLUMN "status" TYPE VARCHAR(30);

-- Migration complete
