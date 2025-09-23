-- Fix lesson_statistics view to include all lessons (not just current/future)
-- This will allow monthly stats to show historical data

-- Drop the existing view
DROP VIEW IF EXISTS lesson_statistics CASCADE;

-- Recreate the view without the date restriction
CREATE VIEW lesson_statistics AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    ss.week_start_date,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, ss.week_start_date
ORDER BY ss.teacher_id, ss.week_start_date;

-- Also update the teacher_monthly_stats view to be consistent
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;

CREATE VIEW teacher_monthly_stats AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    DATE_TRUNC('month', ss.week_start_date)::DATE as month_start,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, DATE_TRUNC('month', ss.week_start_date)::DATE
ORDER BY ss.teacher_id, month_start;

-- Grant permissions to the app user
GRANT SELECT ON lesson_statistics TO your_app_user;
GRANT SELECT ON teacher_monthly_stats TO your_app_user;

-- Test the view to make sure it works
SELECT 
    teacher_id,
    teacher_name,
    week_start_date,
    total_lessons,
    completed_lessons,
    absent_lessons
FROM lesson_statistics 
WHERE EXTRACT(YEAR FROM week_start_date) = 2025 
  AND EXTRACT(MONTH FROM week_start_date) = 9
ORDER BY teacher_id, week_start_date
LIMIT 10;
