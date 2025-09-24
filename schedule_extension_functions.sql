-- Schedule Extension System - Database Functions
-- Language School Management System

-- =====================================================
-- 1. EXTENSION FUNCTION (Core Functionality)
-- =====================================================

CREATE OR REPLACE FUNCTION extend_schedules_by_one_week()
RETURNS INT AS $$
DECLARE
  inserted_count INT := 0;
BEGIN
  -- Single query: Find last week per template and insert next week
  WITH last_weeks AS (
    SELECT DISTINCT
      ss.template_id,
      ss.student_id,
      ss.teacher_id,
      ss.day_of_week,
      ss.time_slot,
      MAX(ss.week_start_date) as last_week_date
    FROM student_schedules ss
    JOIN schedule_templates tpl ON ss.template_id = tpl.id
    WHERE tpl.is_active = TRUE
      AND ss.is_active = TRUE
      AND ss.week_start_date >= get_current_week_start()
    GROUP BY ss.template_id, ss.student_id, ss.teacher_id, ss.day_of_week, ss.time_slot
  )
  INSERT INTO student_schedules (
    student_id, teacher_id, day_of_week, time_slot, week_start_date,
    is_recurring, template_id, lesson_type, attendance_status, is_active,
    created_at, updated_at
  )
  SELECT 
    lw.student_id, lw.teacher_id, lw.day_of_week, lw.time_slot,
    lw.last_week_date + INTERVAL '7 days' as new_week_date,
    TRUE, lw.template_id, 'scheduled', 'scheduled', TRUE,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM last_weeks lw
  WHERE NOT EXISTS (
    SELECT 1 FROM student_schedules ss2
    WHERE ss2.student_id = lw.student_id 
      AND ss2.teacher_id = lw.teacher_id 
      AND ss2.day_of_week = lw.day_of_week 
      AND ss2.time_slot = lw.time_slot 
      AND ss2.week_start_date = lw.last_week_date + INTERVAL '7 days'
  );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. REMINDER FUNCTION (Simple Count)
-- =====================================================

CREATE OR REPLACE FUNCTION count_schedules_needing_extension()
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT ss.student_id, ss.teacher_id, ss.day_of_week, ss.time_slot)
    FROM student_schedules ss
    JOIN schedule_templates tpl ON ss.template_id = tpl.id
    WHERE tpl.is_active = TRUE
      AND ss.is_active = TRUE
      AND ss.week_start_date >= get_current_week_start()
      AND (ss.week_start_date - get_current_week_start()) / 7 <= 2
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. HELPER FUNCTION (Get Current Week Start)
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
  RETURN get_week_start(CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. HELPER FUNCTION (Get Week Start for Any Date)
-- =====================================================

CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  -- Calculate Monday of the week containing input_date
  -- Monday = 0, Sunday = 6
  RETURN input_date - (EXTRACT(DOW FROM input_date)::INTEGER - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 5. TEST FUNCTIONS (For Development/Testing)
-- =====================================================

-- Function to test extension without actually extending
CREATE OR REPLACE FUNCTION test_extension_candidates()
RETURNS TABLE(
  student_id INT,
  teacher_id INT,
  day_of_week INT,
  time_slot VARCHAR,
  last_week_date DATE,
  new_week_date DATE,
  template_id INT
) AS $$
BEGIN
  RETURN QUERY
  WITH last_weeks AS (
    SELECT DISTINCT
      ss.template_id,
      ss.student_id,
      ss.teacher_id,
      ss.day_of_week,
      ss.time_slot,
      MAX(ss.week_start_date) as last_week_date
    FROM student_schedules ss
    JOIN schedule_templates tpl ON ss.template_id = tpl.id
    WHERE tpl.is_active = TRUE
      AND ss.is_active = TRUE
      AND ss.week_start_date >= get_current_week_start()
    GROUP BY ss.template_id, ss.student_id, ss.teacher_id, ss.day_of_week, ss.time_slot
  )
  SELECT 
    lw.student_id,
    lw.teacher_id,
    lw.day_of_week,
    lw.time_slot,
    lw.last_week_date,
    lw.last_week_date + INTERVAL '7 days' as new_week_date,
    lw.template_id
  FROM last_weeks lw
  WHERE NOT EXISTS (
    SELECT 1 FROM student_schedules ss2
    WHERE ss2.student_id = lw.student_id 
      AND ss2.teacher_id = lw.teacher_id 
      AND ss2.day_of_week = lw.day_of_week 
      AND ss2.time_slot = lw.time_slot 
      AND ss2.week_start_date = lw.last_week_date + INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get detailed reminder information
CREATE OR REPLACE FUNCTION get_extension_reminder_details()
RETURNS TABLE(
  student_id INT,
  teacher_id INT,
  student_name VARCHAR,
  teacher_name VARCHAR,
  day_of_week INT,
  time_slot VARCHAR,
  last_week_date DATE,
  weeks_remaining INT
) AS $$
BEGIN
  RETURN QUERY
  WITH last_weeks AS (
    SELECT DISTINCT
      ss.template_id,
      ss.student_id,
      ss.teacher_id,
      s.name as student_name,
      t.name as teacher_name,
      ss.day_of_week,
      ss.time_slot,
      MAX(ss.week_start_date) as last_week_date,
      (MAX(ss.week_start_date) - get_current_week_start()) / 7 as weeks_remaining
    FROM student_schedules ss
    JOIN schedule_templates tpl ON ss.template_id = tpl.id
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE tpl.is_active = TRUE
      AND ss.is_active = TRUE
      AND ss.week_start_date >= get_current_week_start()
    GROUP BY ss.template_id, ss.student_id, ss.teacher_id, s.name, t.name, ss.day_of_week, ss.time_slot
  )
  SELECT 
    lw.student_id,
    lw.teacher_id,
    lw.student_name,
    lw.teacher_name,
    lw.day_of_week,
    lw.time_slot,
    lw.last_week_date,
    lw.weeks_remaining::INT
  FROM last_weeks lw
  WHERE lw.weeks_remaining <= 2
  ORDER BY lw.weeks_remaining ASC, lw.last_week_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. USAGE EXAMPLES
-- =====================================================

-- Example 1: Extend all schedules by one week
-- SELECT extend_schedules_by_one_week();

-- Example 2: Check how many schedules need extension
-- SELECT count_schedules_needing_extension();

-- Example 3: See what would be extended (test mode)
-- SELECT * FROM test_extension_candidates();

-- Example 4: Get detailed reminder information
-- SELECT * FROM get_extension_reminder_details();

-- Example 5: Check current week start
-- SELECT get_current_week_start();

-- =====================================================
-- 7. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION extend_schedules_by_one_week() IS 'Extends all active schedule templates by adding one week after the last existing week for each unique pattern';
COMMENT ON FUNCTION count_schedules_needing_extension() IS 'Returns count of schedule patterns that have 2 weeks or less remaining';
COMMENT ON FUNCTION get_current_week_start() IS 'Returns the Monday date of the current week';
COMMENT ON FUNCTION get_week_start(DATE) IS 'Returns the Monday date of the week containing the input date';
COMMENT ON FUNCTION test_extension_candidates() IS 'Shows what schedules would be extended without actually extending them (for testing)';
COMMENT ON FUNCTION get_extension_reminder_details() IS 'Returns detailed information about schedules needing extension (for debugging)';
