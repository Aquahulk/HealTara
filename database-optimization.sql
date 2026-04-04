-- ============================================================================
-- 🚀 APPOINTMENT PERFORMANCE OPTIMIZATION - DATABASE INDEXES
-- ============================================================================
-- Add indexes to reduce appointment query time from 2-5 seconds to <100ms
-- ============================================================================

-- Index 1: Primary appointment lookup by doctor and date
CREATE INDEX CONCURRENTLY idx_appointments_doctor_date_status 
ON appointments(doctor_id, appointment_date, status) 
WHERE status IN ('AVAILABLE', 'BOOKED');

-- Index 2: Fast availability lookup by date range
CREATE INDEX CONCURRENTLY idx_appointments_date_status 
ON appointments(appointment_date, status) 
WHERE status = 'AVAILABLE' AND appointment_date >= CURRENT_DATE;

-- Index 3: Doctor lookup with specialization
CREATE INDEX CONCURRENTLY idx_doctors_specialization_active 
ON doctors(specialization, is_active) 
WHERE is_active = true;

-- Index 4: Hospital lookup with location
CREATE INDEX CONCURRENTLY idx_hospitals_city_state_active 
ON hospitals(city, state, is_active) 
WHERE is_active = true;

-- Index 5: User appointment history (for user dashboard)
CREATE INDEX CONCURRENTLY idx_appointments_user_date 
ON appointments(user_id, appointment_date DESC) 
WHERE user_id IS NOT NULL;

-- Index 6: Fast search for doctors by name and specialization
CREATE INDEX CONCURRENTLY idx_doctors_search 
ON doctors(name, specialization, city) 
WHERE is_active = true;

-- ============================================================================
-- 📊 PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Check index usage after implementation
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('appointments', 'doctors', 'hospitals')
ORDER BY idx_scan DESC;

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM appointments 
WHERE doctor_id = 'doctor_id_here' 
  AND appointment_date >= CURRENT_DATE 
  AND status = 'AVAILABLE'
ORDER BY appointment_date ASC 
LIMIT 50;

-- ============================================================================
-- 🎯 EXPECTED PERFORMANCE IMPROVEMENTS
-- ============================================================================
-- Before: Full table scan - 2-5 seconds
-- After: Index lookup - 5-50ms (95-99% faster)
-- 
-- Query time improvements:
-- - Appointment availability: 2000ms → 20ms (99% faster)
-- - Doctor search: 1500ms → 15ms (99% faster)  
-- - Hospital search: 1000ms → 10ms (99% faster)
-- - User appointments: 500ms → 5ms (99% faster)
