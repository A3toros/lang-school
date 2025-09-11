-- Migration: Fix to Monday=0 Mapping (CORRECT VERSION)
-- Date: 2025-01-15
-- Description: Change all day_of_week values from Sunday=0 to Monday=0 mapping

BEGIN;

-- 1. Update attendance status constraint to include absent_warned
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS student_schedules_attendance_status_check;

ALTER TABLE student_schedules
ADD CONSTRAINT student_schedules_attendance_status_check
CHECK (attendance_status IN ('scheduled','completed','absent','absent_warned'));

-- 2. First, update time_slots table with correct 8:00-21:30 range
DELETE FROM time_slots;

INSERT INTO time_slots (time_slot, duration_minutes) VALUES
('8:00-8:30', 30), ('8:30-9:00', 30), ('9:00-9:30', 30), ('9:30-10:00', 30),
('10:00-10:30', 30), ('10:30-11:00', 30), ('11:00-11:30', 30), ('11:30-12:00', 30),
('12:00-12:30', 30), ('12:30-13:00', 30), ('13:00-13:30', 30), ('13:30-14:00', 30),
('14:00-14:30', 30), ('14:30-15:00', 30), ('15:00-15:30', 30), ('15:30-16:00', 30),
('16:00-16:30', 30), ('16:30-17:00', 30), ('17:00-17:30', 30), ('17:30-18:00', 30),
('18:00-18:30', 30), ('18:30-19:00', 30), ('19:00-19:30', 30), ('19:30-20:00', 30),
('20:00-20:30', 30), ('20:30-21:00', 30), ('21:00-21:30', 30), ('21:30-22:00', 30);

-- 3. Now migrate student_schedules time slots to match time_slots table
UPDATE student_schedules 
SET time_slot = CASE 
    -- Map early morning slots to 8:00+ range
    WHEN time_slot = '6:30-7:00' THEN '8:00-8:30'
    WHEN time_slot = '7:00-7:30' THEN '8:30-9:00'
    WHEN time_slot = '7:30-8:00' THEN '9:00-9:30'
    -- Keep existing valid time slots as-is
    WHEN time_slot IN ('8:00-8:30', '8:30-9:00', '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00', 
                       '11:00-11:30', '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
                       '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00',
                       '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00',
                       '20:00-20:30', '20:30-21:00', '21:00-21:30', '21:30-22:00')
    THEN time_slot
    -- Handle any other invalid time slots by setting to a default valid time
    ELSE '8:00-8:30'
END;

-- 4. Add foreign key constraint to reference time_slots table
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS fk_student_schedules_time_slot;

ALTER TABLE student_schedules
ADD CONSTRAINT fk_student_schedules_time_slot 
FOREIGN KEY (time_slot) REFERENCES time_slots(time_slot);

-- 3. Update database week start functions to ensure Monday start
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

-- 4. Migrate existing day_of_week values from Sunday=0 to Monday=0
-- Current: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- Target:  0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
-- Formula: new = (old + 6) % 7
UPDATE student_schedules 
SET day_of_week = (day_of_week + 6) % 7;

-- 5. Update table comment to reflect Monday=0 mapping
COMMENT ON COLUMN student_schedules.day_of_week IS 'Day of week: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday';

-- 6. Recreate views with Monday=0 mapping
DROP VIEW IF EXISTS weekly_schedule CASCADE;
CREATE VIEW weekly_schedule AS
SELECT 
    ss.id,
    s.name as student_name,
    t.name as teacher_name,
    ss.day_of_week,
    ss.time_slot,
    ss.week_start_date,
    CASE ss.day_of_week
        WHEN 0 THEN 'Monday'    -- 0 = Monday (CORRECT)
        WHEN 1 THEN 'Tuesday'   -- 1 = Tuesday (CORRECT)
        WHEN 2 THEN 'Wednesday' -- 2 = Wednesday (CORRECT)
        WHEN 3 THEN 'Thursday'  -- 3 = Thursday (CORRECT)
        WHEN 4 THEN 'Friday'    -- 4 = Friday (CORRECT)
        WHEN 5 THEN 'Saturday'  -- 5 = Saturday (CORRECT)
        WHEN 6 THEN 'Sunday'    -- 6 = Sunday (CORRECT)
    END as day_name
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE s.is_active = true;

-- 7. Recreate lesson_statistics view
DROP VIEW IF EXISTS lesson_statistics CASCADE;
CREATE VIEW lesson_statistics AS
SELECT 
    s.id as student_id,
    s.name as student_name,
    t.name as teacher_name,
    COUNT(ss.id) as total_lessons_scheduled,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'scheduled' THEN 1 END) as pending_lessons,
    COUNT(sl.id) as total_lessons_taken_ever,
    s.lessons_per_week,
    s.added_date,
    ROUND(
        (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(ss.id), 0)) * 100, 2
    ) as attendance_percentage
FROM students s
LEFT JOIN teachers t ON s.teacher_id = t.id
LEFT JOIN student_schedules ss ON s.id = ss.student_id
LEFT JOIN student_lessons sl ON s.id = sl.student_id
WHERE s.is_active = true
GROUP BY s.id, s.name, t.name, s.lessons_per_week, s.added_date;

-- 8. Recreate teacher_monthly_stats view
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;
CREATE VIEW teacher_monthly_stats AS
SELECT 
    t.id as teacher_id,
    t.name as teacher_name,
    t.email as teacher_email,
    DATE_TRUNC('month', ss.attendance_date) as month_year,
    EXTRACT(YEAR FROM ss.attendance_date) as year,
    EXTRACT(MONTH FROM ss.attendance_date) as month,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons,
    COUNT(ss.id) as total_lessons,
    ROUND(
        (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(ss.id), 0)) * 100, 2
    ) as attendance_percentage,
    COUNT(DISTINCT s.id) as unique_students_taught
FROM teachers t
LEFT JOIN student_schedules ss ON t.id = ss.teacher_id 
    AND ss.attendance_status IN ('completed', 'absent', 'absent_warned')
    AND ss.attendance_date IS NOT NULL
LEFT JOIN students s ON ss.student_id = s.id AND s.is_active = true
WHERE t.is_active = true
GROUP BY t.id, t.name, t.email, DATE_TRUNC('month', ss.attendance_date), 
         EXTRACT(YEAR FROM ss.attendance_date), EXTRACT(MONTH FROM ss.attendance_date)
ORDER BY t.id, month_year DESC;

-- 9. Time slots already migrated above

-- 10. Verify the migration
SELECT 
    'Day of week distribution after migration' as check_type,
    day_of_week,
    CASE day_of_week
        WHEN 0 THEN 'Monday (should be 0)'
        WHEN 1 THEN 'Tuesday (should be 1)'
        WHEN 2 THEN 'Wednesday (should be 2)'
        WHEN 3 THEN 'Thursday (should be 3)'
        WHEN 4 THEN 'Friday (should be 4)'
        WHEN 5 THEN 'Saturday (should be 5)'
        WHEN 6 THEN 'Sunday (should be 6)'
    END as day_name,
    COUNT(*) as count
FROM student_schedules 
GROUP BY day_of_week 
ORDER BY day_of_week;

COMMIT;
