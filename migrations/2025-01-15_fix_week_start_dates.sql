-- Migration: Fix week_start_date values to be correct Monday dates
-- Date: 2025-01-15
-- Description: Update all week_start_date values to be the Monday of their respective weeks

BEGIN;

-- 1. Update all week_start_date values to be the Monday of their respective weeks
-- This will fix any incorrect week_start_date values that are not Mondays
UPDATE student_schedules 
SET week_start_date = DATE_TRUNC('week', week_start_date)::DATE;

-- 2. Verify the fix by showing the distribution of week_start_date values
-- This should show only Monday dates
SELECT 
    'Week start dates after fix' as check_type,
    week_start_date,
    EXTRACT(DOW FROM week_start_date) as day_of_week,
    CASE EXTRACT(DOW FROM week_start_date)
        WHEN 1 THEN 'Monday (CORRECT)'
        WHEN 2 THEN 'Tuesday (WRONG)'
        WHEN 3 THEN 'Wednesday (WRONG)'
        WHEN 4 THEN 'Thursday (WRONG)'
        WHEN 5 THEN 'Friday (WRONG)'
        WHEN 6 THEN 'Saturday (WRONG)'
        WHEN 0 THEN 'Sunday (WRONG)'
    END as day_name,
    COUNT(*) as schedule_count
FROM student_schedules 
GROUP BY week_start_date 
ORDER BY week_start_date;

-- 3. Show any remaining non-Monday dates (should be 0 after the fix)
SELECT 
    'Non-Monday dates (should be 0)' as check_type,
    week_start_date,
    EXTRACT(DOW FROM week_start_date) as day_of_week,
    COUNT(*) as schedule_count
FROM student_schedules 
WHERE EXTRACT(DOW FROM week_start_date) != 1  -- 1 = Monday in PostgreSQL
GROUP BY week_start_date 
ORDER BY week_start_date;

COMMIT;
