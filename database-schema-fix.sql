-- ============================================================================
-- 🏥 DATABASE SCHEMA FIX - Add Missing Columns for Real Data
-- ============================================================================
-- This script adds the missing columns that the APIs are trying to access
-- ============================================================================

-- Add missing columns to Hospital table
DO $$
BEGIN;
    -- Check if column exists before adding
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hospital' 
        AND column_name = 'rating'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Hospital" ADD COLUMN rating DECIMAL(3,2);
        RAISE NOTICE 'Added rating column to Hospital table';
    END IF;
    
    -- Check if subdomain column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hospital' 
        AND column_name = 'subdomain'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Hospital" ADD COLUMN subdomain TEXT;
        RAISE NOTICE 'Added subdomain column to Hospital table';
    END IF;
    
    -- Check if profile column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hospital' 
        AND column_name = 'profile'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Hospital" ADD COLUMN profile JSONB;
        RAISE NOTICE 'Added profile column to Hospital table';
    END IF;
    
    -- Check if address column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hospital' 
        AND column_name = 'address'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Hospital" ADD COLUMN address TEXT;
        RAISE NOTICE 'Added address column to Hospital table';
    END IF;
    
    -- Check if city column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hospital' 
        AND column_name = 'city'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Hospital" ADD COLUMN city TEXT;
        ALTER TABLE "Hospital" ADD COLUMN state TEXT;
        RAISE NOTICE 'Added city and state columns to Hospital table';
    END IF;
    
    -- Check if name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hospital' 
        AND column_name = 'name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Hospital" ADD COLUMN name TEXT;
        RAISE NOTICE 'Added name column to Hospital table';
    END IF;
    
    -- Check if id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hospital' 
        AND column_name = 'id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Hospital" ADD COLUMN id SERIAL PRIMARY KEY;
        RAISE NOTICE 'Added id column to Hospital table';
    END IF;
    
END;
$$;

-- Add missing columns to User table
DO $$
BEGIN;
    -- Check if name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "User" ADD COLUMN name TEXT;
        RAISE NOTICE 'Added name column to User table';
    END IF;
    
    -- Check if role column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'role'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "User" ADD COLUMN role TEXT;
        RAISE NOTICE 'Added role column to User table';
    END IF;
    
    -- Check if email column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "User" ADD COLUMN email TEXT UNIQUE;
        RAISE NOTICE 'Added email column to User table';
    END IF;
    
    -- Check if id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "User" ADD COLUMN id SERIAL PRIMARY KEY;
        RAISE NOTICE 'Added id column to User table';
    END IF;
    
    -- Check if createdAt column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'createdAt'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added createdAt column to User table';
    END IF;
    
END;
$$;

-- Add missing columns to DoctorProfile table
DO $$
BEGIN;
    -- Check if userId column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'userId'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN "userId" INTEGER REFERENCES "User"(id);
        RAISE NOTICE 'Added userId column to DoctorProfile table';
    END IF;
    
    -- Check if id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN id SERIAL PRIMARY KEY;
        RAISE NOTICE 'Added id column to DoctorProfile table';
    END IF;
    
    -- Check if specialization column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'specialization'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN specialization TEXT;
        RAISE NOTICE 'Added specialization column to DoctorProfile table';
    END IF;
    
    -- Check if qualifications column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'qualifications'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN qualifications TEXT;
        RAISE NOTICE 'Added qualifications column to DoctorProfile table';
    END IF;
    
    -- Check if experience column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'experience'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN experience INTEGER;
        RAISE NOTICE 'Added experience column to DoctorProfile table';
    END IF;
    
    -- Check if clinicName column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'clinicName'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN "clinicName" TEXT;
        RAISE NOTICE 'Added clinicName column to DoctorProfile table';
    END IF;
    
    -- Check if clinicAddress column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'clinicAddress'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN "clinicAddress" TEXT;
        RAISE NOTICE 'Added clinicAddress column to DoctorProfile table';
    END IF;
    
    -- Check if city column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'city'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN city TEXT;
        ALTER TABLE "DoctorProfile" ADD COLUMN state TEXT;
        RAISE NOTICE 'Added city and state columns to DoctorProfile table';
    END IF;
    
    -- Check if phone column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'phone'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone column to DoctorProfile table';
    END IF;
    
    -- Check if consultationFee column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'consultationFee'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN "consultationFee" DECIMAL(10,2);
        RAISE NOTICE 'Added consultationFee column to DoctorProfile table';
    END IF;
    
    -- Check if slug column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'slug'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN slug TEXT;
        RAISE NOTICE 'Added slug column to DoctorProfile table';
    END IF;
    
    -- Check if profileImage column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'DoctorProfile' 
        AND column_name = 'profileImage'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "DoctorProfile" ADD COLUMN "profileImage" TEXT;
        RAISE NOTICE 'Added profileImage column to DoctorProfile table';
    END IF;
    
END;
$$;

-- Create sample data if tables are empty
DO $$
BEGIN
    -- Insert sample hospitals if table is empty
    IF (SELECT COUNT(*) FROM "Hospital") = 0 THEN
        INSERT INTO "Hospital" (name, city, state, address, rating, subdomain, profile) VALUES
        ('City General Hospital', 'Mumbai', 'Maharashtra', '123 Main Street', 4.5, 'citygeneral', '{"general": {"logoUrl": null, "description": "Multi-specialty hospital in Mumbai"}}'),
        ('Apollo Medical Center', 'Delhi', 'Delhi', '456 Park Avenue', 4.7, 'apollo', '{"general": {"logoUrl": null, "description": "Premium healthcare facility"}}'),
        ('Lifeline Care Hospital', 'Bangalore', 'Karnataka', '789 Hosur Road', 4.3, 'lifeline', '{"general": {"logoUrl": null, "description": "Emergency care hospital"}}'),
        ('Global Health Hospital', 'Chennai', 'Tamil Nadu', '321 Anna Salai', 4.6, 'global', '{"general": {"logoUrl": null, "description": "International standard hospital"}}'),
        ('Sunshine Medical Center', 'Kolkata', 'West Bengal', '654 Park Street', 4.4, 'sunshine', '{"general": {"logoUrl": null, "description": "Affordable healthcare services"}}');
        RAISE NOTICE 'Inserted 5 sample hospitals';
    END IF;
    
    -- Insert sample users if table is empty
    IF (SELECT COUNT(*) FROM "User") = 0 THEN
        INSERT INTO "User" (name, email, role) VALUES
        ('Dr. Sarah Johnson', 'sarah@hospital.com', 'DOCTOR'),
        ('Dr. Michael Chen', 'michael@hospital.com', 'DOCTOR'),
        ('Dr. Emily Rodriguez', 'emily@hospital.com', 'DOCTOR'),
        ('Admin User', 'admin@hospital.com', 'ADMIN'),
        ('Patient User', 'patient@example.com', 'PATIENT');
        RAISE NOTICE 'Inserted 5 sample users';
    END IF;
    
    -- Insert sample doctor profiles if table is empty
    IF (SELECT COUNT(*) FROM "DoctorProfile") = 0 THEN
        INSERT INTO "DoctorProfile" ("userId", specialization, qualifications, experience, "clinicName", "clinicAddress", city, state, phone, "consultationFee", slug, "profileImage") VALUES
        (1, 'Cardiology', 'MD, FACC', 15, 'Heart Care Center', '123 Heart St', 'Mumbai', 'Maharashtra', '555-0101', 150.00, 'dr-sarah-johnson', 'https://example.com/sarah.jpg'),
        (2, 'Neurology', 'MD, PhD', 12, 'Brain & Spine Institute', '456 Brain Ave', 'San Francisco', 'CA', '555-0102', 200.00, 'dr-michael-chen', 'https://example.com/michael.jpg'),
        (3, 'Pediatrics', 'MD, FAAP', 10, 'Kids Health Clinic', '789 Kids Rd', 'Chicago', 'IL', '555-0103', 120.00, 'dr-emily-rodriguez', 'https://example.com/emily.jpg'),
        (4, 'Orthopedics', 'MS, DNB', 8, 'Bone & Joint Center', '321 Bone St', 'New York', 'NY', '555-0104', 180.00, 'dr-david-wilson', 'https://example.com/david.jpg'),
        (5, 'Dermatology', 'MD', FAAD', 6, 'Skin Care Clinic', '654 Skin Ave', 'Los Angeles', 'CA', '555-0105', 100.00, 'dr-lisa-anderson', 'https://example.com/lisa.jpg');
        RAISE NOTICE 'Inserted 5 sample doctor profiles';
    END IF;
    
END;
$$;

-- Create supporting tables if they don't exist
DO $$
BEGIN
    -- Create comments table if it doesn't exist
    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        parent_id INTEGER REFERENCES comments(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_comments_active ON comments(is_active);
    RAISE NOTICE 'Ensured comments table exists';
END;
$$;

-- Create Appointment table if it doesn't exist
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS "Appointment" (
        id SERIAL PRIMARY KEY,
        "doctorId" INTEGER NOT NULL,
        "userId" INTEGER,
        appointment_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status TEXT DEFAULT 'AVAILABLE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_appointment_doctor ON "Appointment"("doctorId");
    CREATE INDEX IF NOT EXISTS idx_appointment_date ON "Appointment"(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointment_status ON "Appointment"(status);
    RAISE NOTICE 'Ensured Appointment table exists';
END;
$$;

-- Create Department table if it doesn't exist
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS "Department" (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        "hospitalId" INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_department_hospital ON "Department"("hospitalId");
    RAISE NOTICE 'Ensured Department table exists';
END;
$$;

-- Create HospitalDoctor table if it doesn't exist
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS "HospitalDoctor" (
        id SERIAL PRIMARY KEY,
        "hospitalId" INTEGER NOT NULL,
        "doctorId" INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_hospital_doctor_hospital ON "HospitalDoctor"("hospitalId");
    CREATE INDEX IF NOT EXISTS idx_hospital_doctor_doctor ON "HospitalDoctor"("doctorId");
    RAISE NOTICE 'Ensured HospitalDoctor table exists';
END;
$$;

COMMIT;

-- Report completion
DO $$
BEGIN
    RAISE NOTICE 'Database schema fix completed successfully!';
    RAISE NOTICE 'Tables are now ready for real data fetching';
END;
$$;
