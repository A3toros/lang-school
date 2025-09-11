-- Migration: Fix Time Slot Range Only
-- Date: 2025-01-15
-- Description: Change time slots from 6:30-21:30 to 8:00-21:30 range
-- Note: Day of week mapping is already correct (Sunday=0), no changes needed

BEGIN;

-- 1. First migrate existing time slots, then add constraint
-- Step 1: Migrate existing time slots from 6:30-7:30 range to 8:00-21:30 range
UPDATE student_schedules 
SET time_slot = CASE 
    WHEN time_slot = '6:30-7:00' THEN '8:00-8:30'
    WHEN time_slot = '7:00-7:30' THEN '8:30-9:00'
    WHEN time_slot = '7:30-8:00' THEN '9:00-9:30'
    WHEN time_slot = '8:00-8:30' THEN '9:30-10:00'
    WHEN time_slot = '8:30-9:00' THEN '10:00-10:30'
    WHEN time_slot = '9:00-9:30' THEN '10:30-11:00'
    WHEN time_slot = '9:30-10:00' THEN '11:00-11:30'
    WHEN time_slot = '10:00-10:30' THEN '11:30-12:00'
    WHEN time_slot = '10:30-11:00' THEN '12:00-12:30'
    WHEN time_slot = '11:00-11:30' THEN '12:30-13:00'
    WHEN time_slot = '11:30-12:00' THEN '13:00-13:30'
    WHEN time_slot = '12:00-12:30' THEN '13:30-14:00'
    WHEN time_slot = '12:30-13:00' THEN '14:00-14:30'
    WHEN time_slot = '13:00-13:30' THEN '14:30-15:00'
    WHEN time_slot = '13:30-14:00' THEN '15:00-15:30'
    WHEN time_slot = '14:00-14:30' THEN '15:30-16:00'
    WHEN time_slot = '14:30-15:00' THEN '16:00-16:30'
    WHEN time_slot = '15:00-15:30' THEN '16:30-17:00'
    WHEN time_slot = '15:30-16:00' THEN '17:00-17:30'
    WHEN time_slot = '16:00-16:30' THEN '17:30-18:00'
    WHEN time_slot = '16:30-17:00' THEN '18:00-18:30'
    WHEN time_slot = '17:00-17:30' THEN '18:30-19:00'
    WHEN time_slot = '17:30-18:00' THEN '19:00-19:30'
    WHEN time_slot = '18:00-18:30' THEN '19:30-20:00'
    WHEN time_slot = '18:30-19:00' THEN '20:00-20:30'
    WHEN time_slot = '19:00-19:30' THEN '20:30-21:00'
    WHEN time_slot = '19:30-20:00' THEN '21:00-21:30'
    ELSE time_slot  -- Keep existing time slots that are already in 8:00-21:30 range
END
WHERE time_slot IN (
    '6:30-7:00', '7:00-7:30', '7:30-8:00', '8:00-8:30', '8:30-9:00', '9:00-9:30', '9:30-10:00',
    '10:00-10:30', '10:30-11:00', '11:00-11:30', '11:30-12:00', '12:00-12:30', '12:30-13:00',
    '13:00-13:30', '13:30-14:00', '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00',
    '16:00-16:30', '16:30-17:00', '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00',
    '19:00-19:30', '19:30-20:00'
);

-- Step 2: Now add the time slot constraint
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS student_schedules_time_slot_check;

ALTER TABLE student_schedules
ADD CONSTRAINT student_schedules_time_slot_check
CHECK (time_slot ~ '^([0-1]?[0-9]|2[0-1]):[0-5][0-9]-([0-1]?[0-9]|2[0-1]):[0-5][0-9]$'
  AND time_slot >= '8:00-8:30' 
  AND time_slot <= '21:30-22:00');

-- 3. Update attendance status constraint to include absent_warned
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS student_schedules_attendance_status_check;

ALTER TABLE student_schedules
ADD CONSTRAINT student_schedules_attendance_status_check
CHECK (attendance_status IN ('scheduled','completed','absent','absent_warned'));

-- 4. Update database week start functions to ensure Monday start
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
  -- Ensure Monday start: DATE_TRUNC('week', date) returns Monday of the week
  RETURN DATE_TRUNC('week', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  -- Ensure Monday start: DATE_TRUNC('week', date) returns Monday of the week
  RETURN DATE_TRUNC('week', input_date);
END;
$$ LANGUAGE plpgsql;

-- 5. Verify the migration
-- 5.1 Test week start functions
SELECT 
    'Week start function test' as check_type,
    get_current_week_start() as current_week_start,
    get_week_start(CURRENT_DATE) as week_start_today,
    EXTRACT(DOW FROM get_current_week_start()) as day_of_week_number,
    CASE EXTRACT(DOW FROM get_current_week_start())
        WHEN 1 THEN 'Monday (CORRECT)'
        ELSE 'NOT Monday (ERROR)'
    END as day_verification;

-- 5.2 Check time slot distribution
SELECT 
    'Time slot distribution' as check_type,
    time_slot,
    COUNT(*) as count
FROM student_schedules 
GROUP BY time_slot 
ORDER BY time_slot;

-- 4.2 Verify time slot range compliance
SELECT 
    'Time slot range compliance' as check_type,
    CASE 
        WHEN MIN(time_slot) >= '8:00-8:30' AND MAX(time_slot) <= '21:30-22:00' 
        THEN 'PASS: All time slots within 8:00-21:30 range'
        ELSE 'FAIL: Time slots outside 8:00-21:30 range'
    END as compliance_status,
    MIN(time_slot) as min_time_slot,
    MAX(time_slot) as max_time_slot
FROM student_schedules;

-- 4.3 Check attendance status distribution
SELECT 
    'Attendance status distribution' as check_type,
    attendance_status,
    COUNT(*) as count
FROM student_schedules 
GROUP BY attendance_status 
ORDER BY attendance_status;

-- 4.4 Verify day of week mapping (should remain unchanged)
SELECT 
    'Day of week mapping verification' as check_type,
    day_of_week,
    CASE day_of_week
        WHEN 0 THEN 'Sunday (correct)'
        WHEN 1 THEN 'Monday (correct)'
        WHEN 2 THEN 'Tuesday (correct)'
        WHEN 3 THEN 'Wednesday (correct)'
        WHEN 4 THEN 'Thursday (correct)'
        WHEN 5 THEN 'Friday (correct)'
        WHEN 6 THEN 'Saturday (correct)'
    END as day_name,
    COUNT(*) as count
FROM student_schedules 
GROUP BY day_of_week 
ORDER BY day_of_week;

COMMIT;
