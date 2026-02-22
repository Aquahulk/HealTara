-- Fix the failing index (remove CURRENT_DATE function from index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_date_status 
ON appointments(appointment_date, status) 
WHERE status = 'AVAILABLE';

-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('doctors', 'hospitals', 'appointments', 'users', 'doctor_profiles')
ORDER BY table_name;

-- Verify indexes were created
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN ('doctors', 'hospitals', 'appointments') 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Show sample data
SELECT 'Doctors' as table_name, COUNT(*) as count FROM doctors
UNION ALL
SELECT 'Hospitals', COUNT(*) FROM hospitals
UNION ALL  
SELECT 'Appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'Users', COUNT(*) FROM users
ORDER BY table_name;
