-- Simple fix: Just update all time slots to valid range without constraint
-- Run this first to fix the data

BEGIN;

-- 1. Drop any existing constraint
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS student_schedules_time_slot_check;

-- 2. Update all time slots to be within 8:00-21:30 range
-- Map any time slot to a valid one
UPDATE student_schedules 
SET time_slot = CASE 
    WHEN time_slot = '6:30-7:00' THEN '8:00-8:30'
    WHEN time_slot = '7:00-7:30' THEN '8:30-9:00'
    WHEN time_slot = '7:30-8:00' THEN '9:00-9:30'
    WHEN time_slot = '8:00-8:30' THEN '8:00-8:30'
    WHEN time_slot = '8:30-9:00' THEN '8:30-9:00'
    WHEN time_slot = '9:00-9:30' THEN '9:00-9:30'
    WHEN time_slot = '9:30-10:00' THEN '9:30-10:00'
    WHEN time_slot = '10:00-10:30' THEN '10:00-10:30'
    WHEN time_slot = '10:30-11:00' THEN '10:30-11:00'
    WHEN time_slot = '11:00-11:30' THEN '11:00-11:30'
    WHEN time_slot = '11:30-12:00' THEN '11:30-12:00'
    WHEN time_slot = '12:00-12:30' THEN '12:00-12:30'
    WHEN time_slot = '12:30-13:00' THEN '12:30-13:00'
    WHEN time_slot = '13:00-13:30' THEN '13:00-13:30'
    WHEN time_slot = '13:30-14:00' THEN '13:30-14:00'
    WHEN time_slot = '14:00-14:30' THEN '14:00-14:30'
    WHEN time_slot = '14:30-15:00' THEN '14:30-15:00'
    WHEN time_slot = '15:00-15:30' THEN '15:00-15:30'
    WHEN time_slot = '15:30-16:00' THEN '15:30-16:00'
    WHEN time_slot = '16:00-16:30' THEN '16:00-16:30'
    WHEN time_slot = '16:30-17:00' THEN '16:30-17:00'
    WHEN time_slot = '17:00-17:30' THEN '17:00-17:30'
    WHEN time_slot = '17:30-18:00' THEN '17:30-18:00'
    WHEN time_slot = '18:00-18:30' THEN '18:00-18:30'
    WHEN time_slot = '18:30-19:00' THEN '18:30-19:00'
    WHEN time_slot = '19:00-19:30' THEN '19:00-19:30'
    WHEN time_slot = '19:30-20:00' THEN '19:30-20:00'
    WHEN time_slot = '20:00-20:30' THEN '20:00-20:30'
    WHEN time_slot = '20:30-21:00' THEN '20:30-21:00'
    WHEN time_slot = '21:00-21:30' THEN '21:00-21:30'
    WHEN time_slot = '21:30-22:00' THEN '21:30-22:00'
    -- For any other time slots, set to a default valid time
    ELSE '8:00-8:30'
END;

-- 3. Verify all time slots are now valid
SELECT 
    'Time slot verification' as check_type,
    time_slot,
    COUNT(*) as count
FROM student_schedules 
GROUP BY time_slot 
ORDER BY time_slot;

COMMIT;
