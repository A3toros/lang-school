-- ======= Fix Date Types Migration =======
-- Convert TIMESTAMP columns to DATE to avoid timezone issues

-- 1. Clean up all test data first
DELETE FROM schedule_history;
DELETE FROM student_schedules;
DELETE FROM schedule_templates;
DELETE FROM student_lessons;
DELETE FROM lesson_reports;
DELETE FROM student_teachers;
DELETE FROM students;
DELETE FROM teachers;
DELETE FROM users WHERE role IN ('teacher', 'admin');

-- 2. Drop dependent views first
DROP VIEW IF EXISTS upcoming_schedule_view CASCADE;
DROP VIEW IF EXISTS weekly_schedule CASCADE;
DROP VIEW IF EXISTS lesson_statistics CASCADE;
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;

-- 3. Convert student_schedules.week_start_date from TIMESTAMP to DATE
ALTER TABLE student_schedules
  ALTER COLUMN week_start_date TYPE DATE USING week_start_date::DATE;

-- 4. Convert schedule_templates date columns from TIMESTAMP to DATE
ALTER TABLE schedule_templates
  ALTER COLUMN start_date TYPE DATE USING start_date::DATE;

ALTER TABLE schedule_templates
  ALTER COLUMN end_date TYPE DATE USING end_date::DATE;

-- 5. Update get_week_start function to return DATE instead of TIMESTAMP
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  -- Calculate Monday of the week containing input_date
  -- Monday = 0, Sunday = 6
  RETURN input_date - (EXTRACT(DOW FROM input_date)::INTEGER - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Update get_current_week_start function to return DATE
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
  RETURN get_week_start(CURRENT_DATE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Update delete_future_lesson function to work with DATE
CREATE OR REPLACE FUNCTION delete_future_lesson(
    schedule_id_param INTEGER,
    deleted_by_user_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    schedule_rec RECORD;
BEGIN
    SELECT * INTO schedule_rec
    FROM student_schedules
    WHERE id = schedule_id_param;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- If lesson is in the past (before current week), do nothing
    IF schedule_rec.week_start_date < get_current_week_start() THEN
        INSERT INTO schedule_history(
            schedule_id,
            action,
            old_teacher_id,
            changed_by,
            change_date,
            notes
        ) VALUES (
            schedule_rec.id,
            'deleted',
            schedule_rec.teacher_id,
            deleted_by_user_id,
            CURRENT_TIMESTAMP,
            'Attempt to delete past lesson, preserved'
        );
        RETURN TRUE;
    END IF;

    -- Log deletion BEFORE deleting the record
    INSERT INTO schedule_history(
        schedule_id,
        action,
        old_teacher_id,
        changed_by,
        change_date,
        notes
    ) VALUES (
        schedule_rec.id,
        'deleted',
        schedule_rec.teacher_id,
        deleted_by_user_id,
        CURRENT_TIMESTAMP,
        'Future lesson deleted'
    );

    -- If lesson is in the future, remove it entirely
    DELETE FROM student_schedules
    WHERE id = schedule_rec.id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Update create_occurrences_from_template function to work with DATE
CREATE OR REPLACE FUNCTION create_occurrences_from_template(p_template_id INT, p_weeks_ahead INT DEFAULT 12)
RETURNS VOID AS $$
DECLARE
    tpl RECORD;
    gen_start DATE;
    gen_end DATE;
    wk DATE;
    week_start DATE;
BEGIN
    SELECT * INTO tpl FROM schedule_templates WHERE id = p_template_id;
    IF NOT FOUND THEN
        RAISE NOTICE 'Template % not found', p_template_id;
        RETURN;
    END IF;

    -- Only create if template is active
    IF NOT tpl.is_active THEN
        RAISE NOTICE 'Template % is not active - skipping', p_template_id;
        RETURN;
    END IF;

    -- start generation at max(template.start_date, current week start)
    gen_start := GREATEST(tpl.start_date, get_current_week_start());
    gen_end := (gen_start + (p_weeks_ahead * INTERVAL '7 days'))::DATE;
    
    IF tpl.end_date IS NOT NULL AND tpl.end_date < gen_end THEN
        gen_end := tpl.end_date;
    END IF;

    wk := gen_start;
    WHILE wk <= gen_end LOOP
        week_start := get_week_start(wk);
        
        -- Insert occurrence if not exists (avoid duplicates)
        INSERT INTO student_schedules (
            student_id, teacher_id, day_of_week, time_slot, week_start_date, 
            is_recurring, end_date, original_teacher_id, template_id, 
            lesson_type, attendance_status, is_active, created_at, updated_at
        ) SELECT 
            tpl.student_id, tpl.teacher_id, tpl.day_of_week, tpl.time_slot, week_start,
            TRUE, tpl.end_date, tpl.teacher_id, tpl.id,
            'scheduled', 'scheduled', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM student_schedules ss
            WHERE ss.student_id = tpl.student_id
              AND ss.teacher_id = tpl.teacher_id
              AND ss.day_of_week = tpl.day_of_week
              AND ss.time_slot = tpl.time_slot
              AND ss.week_start_date = week_start
              AND ss.template_id = tpl.id
        );
        
        wk := wk + INTERVAL '7 days';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Update schedule_lesson_date function to work with DATE
CREATE OR REPLACE FUNCTION schedule_lesson_date(p_week_start DATE, p_day_of_week INTEGER)
RETURNS DATE AS $$
BEGIN
    RETURN (p_week_start + (p_day_of_week * INTERVAL '1 day'))::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. Recreate the views with DATE types
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
WHERE ss.week_start_date >= get_current_week_start()
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
WHERE ss.week_start_date >= get_current_week_start()
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
WHERE ss.week_start_date >= get_current_week_start()
GROUP BY ss.teacher_id, t.name, DATE_TRUNC('month', ss.week_start_date)::DATE;
