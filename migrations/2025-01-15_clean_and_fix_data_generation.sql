-- Migration: Clean old data and fix data generation
-- Date: 2025-01-15
-- Description: Delete old incorrect data and fix the functions that generate new data

BEGIN;

-- 1. Delete all existing schedule data (since it has wrong week_start_date values)
DELETE FROM student_schedules;

-- 2. Delete all existing lesson reports (since they reference the deleted schedules)
DELETE FROM lesson_reports;

-- 3. Fix the get_current_week_start() function to return Monday (not Tuesday)
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
    -- Return Monday of current week (not Tuesday)
    RETURN DATE_TRUNC('week', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- 4. Fix the get_week_start() function to return Monday (not Tuesday)
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
    -- Return Monday of the week for any given date (not Tuesday)
    RETURN DATE_TRUNC('week', input_date);
END;
$$ LANGUAGE plpgsql;

-- 5. Generate new sample data with correct Monday week_start_date values
-- Current week data
INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date)
SELECT 
    s.id,
    s.teacher_id,
    CASE 
        WHEN s.id % 7 = 0 THEN 1  -- Monday
        WHEN s.id % 7 = 1 THEN 2  -- Tuesday
        WHEN s.id % 7 = 2 THEN 3  -- Wednesday
        WHEN s.id % 7 = 3 THEN 4  -- Thursday
        WHEN s.id % 7 = 4 THEN 5  -- Friday
        WHEN s.id % 7 = 5 THEN 6  -- Saturday
        ELSE 0  -- Sunday
    END,
    CASE 
        WHEN s.id % 4 = 0 THEN '9:00-9:30'
        WHEN s.id % 4 = 1 THEN '14:00-14:30'
        WHEN s.id % 4 = 2 THEN '18:00-18:30'
        ELSE '19:30-20:00'
    END,
    DATE_TRUNC('week', CURRENT_DATE)::DATE  -- Monday of current week
FROM students s
WHERE s.is_active = true
LIMIT 20;

-- Next week data
INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date)
SELECT 
    s.id,
    s.teacher_id,
    CASE 
        WHEN s.id % 7 = 0 THEN 1  -- Monday
        WHEN s.id % 7 = 1 THEN 2  -- Tuesday
        WHEN s.id % 7 = 2 THEN 3  -- Wednesday
        WHEN s.id % 7 = 3 THEN 4  -- Thursday
        WHEN s.id % 7 = 4 THEN 5  -- Friday
        WHEN s.id % 7 = 5 THEN 6  -- Saturday
        ELSE 0  -- Sunday
    END,
    CASE 
        WHEN s.id % 4 = 0 THEN '10:00-10:30'
        WHEN s.id % 4 = 1 THEN '15:00-15:30'
        WHEN s.id % 4 = 2 THEN '17:00-17:30'
        ELSE '20:00-20:30'
    END,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days')::DATE  -- Monday of next week
FROM students s
WHERE s.is_active = true
LIMIT 15;

-- 6. Verify the fix
SELECT 
    'Week start dates after fix' as check_type,
    week_start_date,
    EXTRACT(DOW FROM week_start_date) as day_of_week,
    CASE EXTRACT(DOW FROM week_start_date)
        WHEN 1 THEN 'Monday (CORRECT)'
        ELSE 'WRONG'
    END as status,
    COUNT(*) as schedule_count
FROM student_schedules 
GROUP BY week_start_date 
ORDER BY week_start_date;

COMMIT;
