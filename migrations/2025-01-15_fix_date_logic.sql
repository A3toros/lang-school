-- Migration: Fix Date Logic Inconsistencies
-- Date: 2025-01-15
-- Description: Fix day of week mapping and date constraints

BEGIN;

-- 1. Update attendance status constraint to include absent_warned
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS student_schedules_attendance_status_check;

ALTER TABLE student_schedules
ADD CONSTRAINT student_schedules_attendance_status_check
CHECK (attendance_status IN ('scheduled','completed','absent','absent_warned'));

-- 1.1 Update time slot constraint to reflect 8:00-21:30 range
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS student_schedules_time_slot_check;

ALTER TABLE student_schedules
ADD CONSTRAINT student_schedules_time_slot_check
CHECK (time_slot ~ '^([0-1]?[0-9]|2[0-1]):[0-5][0-9]-([0-1]?[0-9]|2[0-1]):[0-5][0-9]$'
  AND time_slot >= '8:00-8:30' 
  AND time_slot <= '21:30-22:00');

-- 2. Day of week mapping verification
-- Based on verification results, database already uses Sunday=0 mapping correctly
-- No migration needed for day_of_week values
-- Verification shows: 0=Sunday(30), 1=Monday(6), 2=Tuesday(32), 3=Wednesday(5), 4=Thursday(31), 5=Friday(5), 6=Saturday(5)

-- 3. Update table comment to reflect correct mapping
COMMENT ON COLUMN student_schedules.day_of_week IS 'Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';

-- 4. Recreate views with correct day mapping
DROP VIEW IF EXISTS weekly_schedule CASCADE;
CREATE VIEW weekly_schedule AS
SELECT 
    ss.id,
    s.id as student_id,
    s.name as student_name,
    t.id as teacher_id,
    t.name as teacher_name,
    ss.day_of_week,
    ss.time_slot,
    ss.week_start_date,
    CASE ss.day_of_week
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE s.is_active = true;

-- 5. Recreate lesson_statistics view
DROP VIEW IF EXISTS lesson_statistics CASCADE;
CREATE VIEW lesson_statistics AS
SELECT 
    s.id as student_id,
    s.name as student_name,
    t.id as teacher_id,
    t.name as teacher_name,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons,
    ROUND(
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::decimal / 
        NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed','absent','absent_warned') THEN 1 END), 0) * 100, 
        2
    ) as attendance_rate
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE s.is_active = true
GROUP BY s.id, s.name, t.id, t.name;

-- 6. Recreate teacher_monthly_stats view
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;
CREATE VIEW teacher_monthly_stats AS
SELECT 
    t.id as teacher_id,
    t.name as teacher_name,
    EXTRACT(YEAR FROM ss.attendance_date) as year,
    EXTRACT(MONTH FROM ss.attendance_date) as month,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons,
    ROUND(
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::decimal / 
        NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed','absent','absent_warned') THEN 1 END), 0) * 100, 
        2
    ) as attendance_rate
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.attendance_date IS NOT NULL
GROUP BY t.id, t.name, EXTRACT(YEAR FROM ss.attendance_date), EXTRACT(MONTH FROM ss.attendance_date);

-- 7. Migrate existing time slots from 6:30-7:30 range to 8:00-21:30 range
-- Map old time slots to new time slots
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

-- 8. Update sample data generation (if needed)
-- Delete existing sample data
DELETE FROM student_schedules WHERE id > 0;

-- Insert corrected sample data
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
    (SELECT get_current_week_start())
FROM students s
WHERE s.is_active = true;

-- Insert additional sample data for next week
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
    (SELECT get_current_week_start() + INTERVAL '7 days')
FROM students s
WHERE s.is_active = true;

-- 8. Verify the migration
SELECT 
    'Day of week distribution' as check_type,
    day_of_week,
    CASE day_of_week
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name,
    COUNT(*) as count
FROM student_schedules 
GROUP BY day_of_week 
ORDER BY day_of_week;

-- 9. Check attendance status distribution
SELECT 
    'Attendance status distribution' as check_type,
    attendance_status,
    COUNT(*) as count
FROM student_schedules 
GROUP BY attendance_status 
ORDER BY attendance_status;

-- 10. Check time slot distribution
SELECT 
    'Time slot distribution' as check_type,
    time_slot,
    COUNT(*) as count
FROM student_schedules 
GROUP BY time_slot 
ORDER BY time_slot;

-- 11. Verify time slot range compliance
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

COMMIT;
