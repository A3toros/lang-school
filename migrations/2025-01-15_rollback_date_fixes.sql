-- Rollback: Date Logic Fixes
-- Date: 2025-01-15
-- Description: Rollback date logic changes if issues occur

BEGIN;

-- 1. Rollback attendance status constraint
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS student_schedules_attendance_status_check;

ALTER TABLE student_schedules
ADD CONSTRAINT student_schedules_attendance_status_check
CHECK (attendance_status IN ('scheduled','completed','absent'));

-- 2. Rollback day_of_week values (if migrated)
-- UPDATE student_schedules 
-- SET day_of_week = (day_of_week + 1) % 7;

-- 3. Restore original table comment
COMMENT ON COLUMN student_schedules.day_of_week IS 'Day of week: 0=Sunday, 1=Monday, etc.';

-- 4. Restore original views
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

-- Restore other views as needed...

COMMIT;
