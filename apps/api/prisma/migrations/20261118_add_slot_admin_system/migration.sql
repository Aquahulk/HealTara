-- ============================================================================
-- 🏥 HEALTARA SLOT ADMINISTRATOR SYSTEM - Phase 1: Identity Foundation
-- ============================================================================
-- This migration creates the permanent identity system for staff members
-- and establishes the foundation for the multi-tenant assignment system
-- ============================================================================

-- ============================================================================
-- STEP 1: Add permanent identity codes to existing tables
-- ============================================================================

-- Add permanent codes to users table
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "doctor_code" VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS "staff_code" VARCHAR(20) UNIQUE;

-- Add permanent codes to hospitals table  
ALTER TABLE "hospitals"
  ADD COLUMN IF NOT EXISTS "hospital_code" VARCHAR(20) UNIQUE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "idx_users_doctor_code" ON "users"("doctor_code");
CREATE INDEX IF NOT EXISTS "idx_users_staff_code" ON "users"("staff_code");
CREATE INDEX IF NOT EXISTS "idx_hospitals_hospital_code" ON "hospitals"("hospital_code");

-- ============================================================================
-- STEP 2: Create staff_profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "staff_profiles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "staff_code" VARCHAR(20) NOT NULL UNIQUE,
  "name" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(20),
  "status" VARCHAR(20) DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_staff_profiles_user_id" ON "staff_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "idx_staff_profiles_staff_code" ON "staff_profiles"("staff_code");
CREATE INDEX IF NOT EXISTS "idx_staff_profiles_status" ON "staff_profiles"("status");

COMMENT ON TABLE "staff_profiles" IS 'Permanent professional identity for slot administrators';
COMMENT ON COLUMN "staff_profiles"."staff_code" IS 'Permanent ID: HLT-STA-XXXXXX';
COMMENT ON COLUMN "staff_profiles"."status" IS 'ACTIVE, SUSPENDED, INACTIVE';

-- ============================================================================
-- STEP 3: Create staff_assignment_requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "staff_assignment_requests" (
  "id" SERIAL PRIMARY KEY,
  "staff_id" INTEGER NOT NULL REFERENCES "staff_profiles"("id") ON DELETE CASCADE,
  "doctor_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "hospital_id" INTEGER REFERENCES "hospitals"("id") ON DELETE CASCADE,
  
  "scope" VARCHAR(30) NOT NULL CHECK ("scope" IN ('DOCTOR', 'HOSPITAL', 'DOCTOR_HOSPITAL')),
  "initiated_by" INTEGER NOT NULL REFERENCES "users"("id"),
  
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'PENDING_HOSPITAL_APPROVAL', 'PENDING_DOCTOR_APPROVAL', 'PENDING_STAFF_ACCEPTANCE', 'APPROVED', 'REJECTED', 'EXPIRED')),
  
  "doctor_approved_at" TIMESTAMP,
  "doctor_approved_by" INTEGER REFERENCES "users"("id"),
  
  "hospital_approved_at" TIMESTAMP,
  "hospital_approved_by" INTEGER REFERENCES "users"("id"),
  
  "staff_accepted_at" TIMESTAMP,
  
  "rejection_reason" TEXT,
  "rejection_by" INTEGER REFERENCES "users"("id"),
  "rejected_at" TIMESTAMP,
  
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_staff_requests_staff_id" ON "staff_assignment_requests"("staff_id");
CREATE INDEX IF NOT EXISTS "idx_staff_requests_doctor_id" ON "staff_assignment_requests"("doctor_id");
CREATE INDEX IF NOT EXISTS "idx_staff_requests_hospital_id" ON "staff_assignment_requests"("hospital_id");
CREATE INDEX IF NOT EXISTS "idx_staff_requests_status" ON "staff_assignment_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_staff_requests_initiated_by" ON "staff_assignment_requests"("initiated_by");
CREATE INDEX IF NOT EXISTS "idx_staff_requests_expires_at" ON "staff_assignment_requests"("expires_at");

COMMENT ON TABLE "staff_assignment_requests" IS 'Assignment requests requiring multi-party approval';
COMMENT ON COLUMN "staff_assignment_requests"."scope" IS 'DOCTOR: all contexts | HOSPITAL: hospital-level | DOCTOR_HOSPITAL: specific doctor at specific hospital';

-- ============================================================================
-- STEP 4: Create staff_assignments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "staff_assignments" (
  "id" SERIAL PRIMARY KEY,
  "request_id" INTEGER REFERENCES "staff_assignment_requests"("id"),
  
  "staff_id" INTEGER NOT NULL REFERENCES "staff_profiles"("id") ON DELETE CASCADE,
  "doctor_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "hospital_id" INTEGER REFERENCES "hospitals"("id") ON DELETE CASCADE,
  
  "scope" VARCHAR(30) NOT NULL CHECK ("scope" IN ('DOCTOR', 'HOSPITAL', 'DOCTOR_HOSPITAL')),
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
  
  "activated_at" TIMESTAMP DEFAULT NOW(),
  "revoked_at" TIMESTAMP,
  "revoked_by" INTEGER REFERENCES "users"("id"),
  "revocation_reason" TEXT,
  
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  
  -- Ensure only one active assignment per unique combination
  CONSTRAINT "unique_active_assignment" UNIQUE ("staff_id", "doctor_id", "hospital_id", "scope", "status") 
    DEFERRABLE INITIALLY DEFERRED
);

-- Partial unique index to enforce active assignment uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_active_staff_assignment" 
  ON "staff_assignments"("staff_id", "doctor_id", "hospital_id", "scope") 
  WHERE "status" = 'ACTIVE';

CREATE INDEX IF NOT EXISTS "idx_staff_assignments_staff_id" ON "staff_assignments"("staff_id");
CREATE INDEX IF NOT EXISTS "idx_staff_assignments_doctor_id" ON "staff_assignments"("doctor_id");
CREATE INDEX IF NOT EXISTS "idx_staff_assignments_hospital_id" ON "staff_assignments"("hospital_id");
CREATE INDEX IF NOT EXISTS "idx_staff_assignments_status" ON "staff_assignments"("status");
CREATE INDEX IF NOT EXISTS "idx_staff_assignments_scope" ON "staff_assignments"("scope");

COMMENT ON TABLE "staff_assignments" IS 'Active and historical staff assignments';
COMMENT ON COLUMN "staff_assignments"."status" IS 'ACTIVE: currently valid | REVOKED: manually ended | EXPIRED: time-based end';

-- ============================================================================
-- STEP 5: Create staff_assignment_permissions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "staff_assignment_permissions" (
  "id" SERIAL PRIMARY KEY,
  "assignment_id" INTEGER NOT NULL REFERENCES "staff_assignments"("id") ON DELETE CASCADE,
  "permission" VARCHAR(60) NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT FALSE,
  
  "created_at" TIMESTAMP DEFAULT NOW(),
  
  UNIQUE ("assignment_id", "permission")
);

CREATE INDEX IF NOT EXISTS "idx_staff_permissions_assignment_id" ON "staff_assignment_permissions"("assignment_id");
CREATE INDEX IF NOT EXISTS "idx_staff_permissions_permission" ON "staff_assignment_permissions"("permission");

COMMENT ON TABLE "staff_assignment_permissions" IS 'Granular permissions for each assignment';
COMMENT ON COLUMN "staff_assignment_permissions"."permission" IS 'e.g., APPOINTMENT_VIEW, SLOT_MANAGE, WALKIN_CREATE';

-- ============================================================================
-- STEP 6: Create staff_assignment_audit_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "staff_assignment_audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "assignment_id" INTEGER REFERENCES "staff_assignments"("id") ON DELETE SET NULL,
  "request_id" INTEGER REFERENCES "staff_assignment_requests"("id") ON DELETE SET NULL,
  
  "action" VARCHAR(50) NOT NULL,
  "actor_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "details" JSONB,
  
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_staff_audit_assignment_id" ON "staff_assignment_audit_logs"("assignment_id");
CREATE INDEX IF NOT EXISTS "idx_staff_audit_request_id" ON "staff_assignment_audit_logs"("request_id");
CREATE INDEX IF NOT EXISTS "idx_staff_audit_actor_id" ON "staff_assignment_audit_logs"("actor_id");
CREATE INDEX IF NOT EXISTS "idx_staff_audit_action" ON "staff_assignment_audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_staff_audit_created_at" ON "staff_assignment_audit_logs"("created_at");

COMMENT ON TABLE "staff_assignment_audit_logs" IS 'Complete audit trail of all assignment changes';
COMMENT ON COLUMN "staff_assignment_audit_logs"."action" IS 'e.g., CREATED, APPROVED, REJECTED, ACTIVATED, REVOKED, PERMISSION_CHANGED';

-- ============================================================================
-- STEP 7: Create helper functions
-- ============================================================================

-- Function to generate unique staff codes
CREATE OR REPLACE FUNCTION generate_staff_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code in format: HLT-STA-XXXXXX (6 random alphanumeric chars)
    new_code := 'HLT-STA-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM "staff_profiles" WHERE "staff_code" = new_code) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique doctor codes
CREATE OR REPLACE FUNCTION generate_doctor_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'HLT-DOC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM "users" WHERE "doctor_code" = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique hospital codes
CREATE OR REPLACE FUNCTION generate_hospital_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'HLT-HOS-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM "hospitals" WHERE "hospital_code" = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: Backfill existing doctors and hospitals with codes
-- ============================================================================

-- Generate codes for existing doctors (only for DOCTOR role users)
UPDATE "users"
SET "doctor_code" = generate_doctor_code()
WHERE "role" = 'DOCTOR' AND "doctor_code" IS NULL;

-- Generate codes for existing hospitals
UPDATE "hospitals"
SET "hospital_code" = generate_hospital_code()
WHERE "hospital_code" IS NULL;

-- ============================================================================
-- STEP 9: Create triggers for automatic code generation
-- ============================================================================

-- Trigger function for new doctors
CREATE OR REPLACE FUNCTION assign_doctor_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'DOCTOR' AND NEW.doctor_code IS NULL THEN
    NEW.doctor_code := generate_doctor_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_doctor_code
  BEFORE INSERT ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION assign_doctor_code();

-- Trigger function for new hospitals
CREATE OR REPLACE FUNCTION assign_hospital_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hospital_code IS NULL THEN
    NEW.hospital_code := generate_hospital_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_hospital_code
  BEFORE INSERT ON "hospitals"
  FOR EACH ROW
  EXECUTE FUNCTION assign_hospital_code();

-- Trigger function for new staff profiles
CREATE OR REPLACE FUNCTION assign_staff_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.staff_code IS NULL THEN
    NEW.staff_code := generate_staff_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_staff_code
  BEFORE INSERT ON "staff_profiles"
  FOR EACH ROW
  EXECUTE FUNCTION assign_staff_code();

-- ============================================================================
-- STEP 10: Grant permissions (if needed)
-- ============================================================================

-- Grant necessary permissions to application user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- Migration complete! 🎉
-- ============================================================================
