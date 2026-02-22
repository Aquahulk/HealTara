-- ============================================================================
// 🏥 NEON DATABASE SETUP - Create Missing Tables
// ============================================================================
-- Run this first to create the basic database structure
// ============================================================================

-- Check if tables exist and create them if needed

-- Create doctors table if it doesn't exist
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    specialization VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    experience INTEGER DEFAULT 0,
    consultation_fee DECIMAL(10,2),
    hospital_id UUID REFERENCES hospitals(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create hospitals table if it doesn't exist
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    user_id UUID REFERENCES users(id),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE', -- AVAILABLE, BOOKED, CANCELLED
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create doctor_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS doctor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID UNIQUE NOT NULL REFERENCES doctors(id),
    profile_image TEXT,
    bio TEXT,
    education TEXT,
    experience_years INTEGER,
    consultation_fee DECIMAL(10,2),
    available_days TEXT[], -- Array of available days
    available_time_start TIME,
    available_time_end TIME,
    slug VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data if tables are empty
INSERT INTO hospitals (name, email, city, state) 
SELECT 'City General Hospital', 'info@cityhospital.com', 'Mumbai', 'Maharashtra'
WHERE NOT EXISTS (SELECT 1 FROM hospitals LIMIT 1);

INSERT INTO doctors (name, email, specialization, city, state, experience, consultation_fee)
SELECT 'Dr. John Smith', 'john.smith@example.com', 'Cardiology', 'Mumbai', 'Maharashtra', 10, 1500.00
WHERE NOT EXISTS (SELECT 1 FROM doctors LIMIT 1);

-- Now create the performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_doctor_date_status 
ON appointments(doctor_id, appointment_date, status) 
WHERE status IN ('AVAILABLE', 'BOOKED');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_date_status 
ON appointments(appointment_date, status) 
WHERE status = 'AVAILABLE' AND appointment_date >= CURRENT_DATE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doctors_specialization_active 
ON doctors(specialization, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitals_city_state_active 
ON hospitals(city, state, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user_date 
ON appointments(user_id, appointment_date DESC) 
WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doctors_search 
ON doctors(name, specialization, city) 
WHERE is_active = true;

-- Create some sample appointments
INSERT INTO appointments (doctor_id, appointment_date, start_time, end_time, status)
SELECT 
    d.id,
    CURRENT_DATE + INTERVAL '1 day',
    '09:00:00',
    '09:30:00',
    'AVAILABLE'
FROM doctors d
WHERE NOT EXISTS (SELECT 1 FROM appointments LIMIT 1)
LIMIT 5;

-- Show table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('doctors', 'hospitals', 'appointments', 'users', 'doctor_profiles')
ORDER BY table_name, ordinal_position;

-- Show indexes created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('doctors', 'hospitals', 'appointments', 'users', 'doctor_profiles')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
