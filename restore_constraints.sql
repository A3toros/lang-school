-- ======= Restore Foreign Key Constraints and Clean Up Schema =======
-- Date: 2025-01-15
-- Description: Restore foreign key constraints and clean up database schema

BEGIN;

-- 1. Drop any views that might be causing issues
DROP VIEW IF EXISTS student_schedule_view CASCADE;
DROP VIEW IF EXISTS upcoming_schedule_view CASCADE;
DROP VIEW IF EXISTS weekly_schedule CASCADE;
DROP VIEW IF EXISTS lesson_statistics CASCADE;
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;

-- 2. Drop any constraints that involve the column
ALTER TABLE student_schedules DROP CONSTRAINT IF EXISTS unique_schedule;
ALTER TABLE student_schedules DROP CONSTRAINT IF EXISTS fk_student_schedules_time_slot;

-- 3. Drop the existing foreign key constraint if it exists
ALTER TABLE schedule_history DROP CONSTRAINT IF EXISTS schedule_history_schedule_id_fkey;

-- 4. Recreate the foreign key constraint with RESTRICT (not CASCADE)
ALTER TABLE schedule_history
ADD CONSTRAINT schedule_history_schedule_id_fkey
FOREIGN KEY (schedule_id)
REFERENCES student_schedules(id)
ON DELETE RESTRICT;

-- 5. Create trigger function for logging schedule deletions
CREATE OR REPLACE FUNCTION log_schedule_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO schedule_history(schedule_id, action, old_teacher_id, changed_by, change_date, notes)
  VALUES (OLD.id, 'deleted', OLD.teacher_id, current_user::integer, CURRENT_TIMESTAMP, 'Deleted via trigger');
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for logging schedule deletions
DROP TRIGGER IF EXISTS student_schedules_delete_trigger ON student_schedules;
CREATE TRIGGER student_schedules_delete_trigger
AFTER DELETE ON student_schedules
FOR EACH ROW
EXECUTE FUNCTION log_schedule_delete();

-- 7. Recreate the views with proper structure
CREATE VIEW upcoming_schedule_view AS
SELECT
    ss.id,
    ss.student_id,
    s.name as student_name,
    ss.teacher_id,
    t.name as teacher_name,
    ss.day_of_week,
    ss.time_slot,
    ss.week_start_date,
    ss.attendance_status,
    ss.lesson_type,
    ss.is_active,
    ss.created_at,
    ss.updated_at
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.week_start_date >= DATE_TRUNC('week', CURRENT_DATE)::DATE
  AND ss.is_active = true;

CREATE VIEW weekly_schedule AS
SELECT
    ss.id,
    ss.student_id,
    s.name as student_name,
    ss.teacher_id,
    t.name as teacher_name,
    ss.day_of_week,
    ss.time_slot,
    ss.week_start_date,
    ss.attendance_status,
    ss.lesson_type,
    ss.is_active
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true;

CREATE VIEW lesson_statistics AS
SELECT
    ss.teacher_id,
    t.name as teacher_name,
    ss.week_start_date,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.week_start_date >= DATE_TRUNC('week', CURRENT_DATE)::DATE
GROUP BY ss.teacher_id, t.name, ss.week_start_date;

CREATE VIEW teacher_monthly_stats AS
SELECT
    ss.teacher_id,
    t.name as teacher_name,
    DATE_TRUNC('month', ss.week_start_date)::DATE as month_start,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.week_start_date >= DATE_TRUNC('week', CURRENT_DATE)::DATE
GROUP BY ss.teacher_id, t.name, DATE_TRUNC('month', ss.week_start_date)::DATE;

-- 8. Add back the time_slots foreign key constraint
ALTER TABLE student_schedules
ADD CONSTRAINT fk_student_schedules_time_slot 
FOREIGN KEY (time_slot) REFERENCES time_slots(time_slot);

-- 9. Add back the unique constraint for student_schedules
ALTER TABLE student_schedules
ADD CONSTRAINT unique_schedule 
UNIQUE(student_id, teacher_id, day_of_week, time_slot, week_start_date);

COMMIT;

-- 10. Verify the constraints are properly restored
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confrelid::regclass as referenced_table,
    confkey as referenced_columns
FROM pg_constraint 
WHERE conrelid = 'schedule_history'::regclass
AND conname = 'schedule_history_schedule_id_fkey';
