-- Migration: Fix Frontend Date Mapping
-- Date: 2025-01-15
-- Description: Ensure frontend uses Sunday=0 mapping to match database

-- This migration ensures the database is ready for frontend changes
-- The frontend will be updated to use Sunday=0 mapping

BEGIN;

-- 1. Verify current day mapping
SELECT 
    'Current day mapping verification' as check_type,
    day_of_week,
    CASE day_of_week
        WHEN 0 THEN 'Sunday (should be 0)'
        WHEN 1 THEN 'Monday (should be 1)'
        WHEN 2 THEN 'Tuesday (should be 2)'
        WHEN 3 THEN 'Wednesday (should be 3)'
        WHEN 4 THEN 'Thursday (should be 4)'
        WHEN 5 THEN 'Friday (should be 5)'
        WHEN 6 THEN 'Saturday (should be 6)'
    END as day_name,
    COUNT(*) as count
FROM student_schedules 
GROUP BY day_of_week 
ORDER BY day_of_week;

-- 2. Check if any data needs migration
SELECT 
    'Data migration check' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'No data to migrate'
        WHEN MIN(day_of_week) = 0 AND MAX(day_of_week) = 6 THEN 'Data already uses Sunday=0 mapping'
        ELSE 'Data needs migration from Monday=0 to Sunday=0'
    END as migration_status
FROM student_schedules;

-- 3. If migration is needed, uncomment the following:
-- UPDATE student_schedules 
-- SET day_of_week = (day_of_week + 6) % 7;

COMMIT;
