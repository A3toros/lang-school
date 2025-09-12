-- ======= Schedule Management Enhancement Migration =======
-- Date: 2025-01-15
-- Description: Enhanced schedule management with improved data integrity, audit trails, and business logic enforcement
-- Author: AI Assistant

BEGIN;

-- ======= 1) Defensive / idempotent schema changes =======

-- 1.1 Add is_active to student_schedules
ALTER TABLE student_schedules
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 1.2 Update schedule_history action constraint to include 'completed'
ALTER TABLE schedule_history
  DROP CONSTRAINT IF EXISTS schedule_history_action_check;

ALTER TABLE schedule_history
  ADD CONSTRAINT schedule_history_action_check
  CHECK (action IN ('created','updated','reassigned','cancelled','deleted','completed'));

-- 1.2 Add cancellation fields to schedule_templates
ALTER TABLE schedule_templates
  ADD COLUMN IF NOT EXISTS cancellation_date DATE,
  ADD COLUMN IF NOT EXISTS cancellation_note TEXT;

-- 1.3 Ensure unique constraint on student_lessons exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_lesson'
  ) THEN
    ALTER TABLE student_lessons
      ADD CONSTRAINT unique_student_lesson UNIQUE (student_id, lesson_date, time_slot);
  END IF;
END $$;

-- 1.4 Ensure consistent "status" usage:
-- We will treat attendance_status as authoritative for attendance lifecycle.
-- Keep lesson_type for classification (already exists). No change needed here,
-- but later code will update both in a controlled manner.

-- ======= 2) Triggers to protect past records (no deletes of past occurrences) =======

CREATE OR REPLACE FUNCTION protect_past_schedules_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- prevent hard delete of past occurrences
  IF OLD.week_start_date < DATE_TRUNC('week', CURRENT_DATE) THEN
    RAISE EXCEPTION 'Cannot delete past schedule occurrence id=% - keep for audit', OLD.id;
  END IF;

  -- For future schedules, we prefer soft-delete via is_active=false.
  -- If application attempts to delete, allow it (optional). Here we allow delete only for future records.
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_past_schedules_delete ON student_schedules;
CREATE TRIGGER trg_protect_past_schedules_delete
  BEFORE DELETE ON student_schedules
  FOR EACH ROW EXECUTE FUNCTION protect_past_schedules_before_delete();

-- ======= 3) Functions: creation, extension, cancel, complete =======

-- Utility: compute actual lesson_date from week_start_date + day_of_week
-- (day_of_week is integer with Monday=0)
CREATE OR REPLACE FUNCTION schedule_lesson_date(p_week_start DATE, p_day_of_week INTEGER)
RETURNS DATE AS $$
BEGIN
  RETURN (p_week_start + (p_day_of_week * INTERVAL '1 day'))::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3.1 Create occurrences for a single template for the next N weeks (idempotent)
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
  gen_start := GREATEST(tpl.start_date, DATE_TRUNC('week', CURRENT_DATE))::DATE;
  gen_end := (gen_start + (p_weeks_ahead * INTERVAL '7 days'))::DATE;

  IF tpl.end_date IS NOT NULL AND tpl.end_date < gen_end THEN
    gen_end := tpl.end_date;
  END IF;

  wk := gen_start;
  WHILE wk <= gen_end LOOP
    week_start := DATE_TRUNC('week', wk)::DATE;
    -- Insert occurrence if not exists (avoid duplicates)
    INSERT INTO student_schedules (
      student_id, teacher_id, day_of_week, time_slot, week_start_date,
      is_recurring, end_date, original_teacher_id, template_id, lesson_type, attendance_status,
      is_active, created_at, updated_at
    )
    SELECT tpl.student_id, tpl.teacher_id, tpl.day_of_week, tpl.time_slot, week_start,
           TRUE, tpl.end_date, tpl.teacher_id, tpl.id, 'scheduled', 'scheduled',
           TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM student_schedules ss
      WHERE ss.student_id = tpl.student_id
        AND ss.teacher_id = tpl.teacher_id
        AND ss.day_of_week = tpl.day_of_week
        AND ss.time_slot = tpl.time_slot
        AND ss.week_start_date = week_start
        -- If there's an existing cancelled/explicit row for the same template, do not override it.
        AND ss.template_id = tpl.id
    );

    wk := wk + INTERVAL '7 days';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Bulk extend all templates (call from cron/job)
CREATE OR REPLACE FUNCTION extend_all_templates(p_weeks_ahead INT DEFAULT 12)
RETURNS VOID AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM schedule_templates WHERE is_active = TRUE LOOP
    PERFORM create_occurrences_from_template(r.id, p_weeks_ahead);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3.3 Cancel template: deactivate template and soft-cancel future occurrences (idempotent)
CREATE OR REPLACE FUNCTION cancel_template_and_future_occurrences(
  p_template_id INT,
  p_cancelled_by INT,               -- user id
  p_note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_week_start DATE := DATE_TRUNC('week', CURRENT_DATE);
BEGIN
  -- Deactivate template and set cancellation date & note
  UPDATE schedule_templates
    SET is_active = FALSE, cancellation_date = current_week_start, cancellation_note = p_note, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_template_id;

  -- Soft-disable future occurrences, but do NOT modify past occurrences or completed occurrences
  UPDATE student_schedules ss
  SET is_active = FALSE,
      attendance_status = CASE WHEN ss.attendance_status = 'scheduled' THEN 'scheduled' ELSE ss.attendance_status END,
      lesson_type = CASE WHEN ss.attendance_status = 'scheduled' THEN 'cancelled' ELSE ss.lesson_type END,
      updated_at = CURRENT_TIMESTAMP
  WHERE ss.template_id = p_template_id
    AND ss.week_start_date >= current_week_start
    AND ss.lesson_type <> 'completed';  -- keep completed ones untouched

  -- Log history entries for affected future occurrences
  INSERT INTO schedule_history (schedule_id, action, old_teacher_id, new_teacher_id, changed_by, change_date, notes)
  SELECT ss.id, 'cancelled', ss.teacher_id, NULL, p_cancelled_by, CURRENT_TIMESTAMP, p_note
  FROM student_schedules ss
  WHERE ss.template_id = p_template_id
    AND ss.week_start_date >= current_week_start
    AND ss.lesson_type <> 'completed';

END;
$$ LANGUAGE plpgsql;

-- 3.4 Mark schedule occurrence as completed (idempotent).
-- This updates student_schedules and inserts into student_lessons (ledger).
CREATE OR REPLACE FUNCTION mark_schedule_completed(p_schedule_id INT, p_marked_by INT)
RETURNS VOID AS $$
DECLARE
  ss RECORD;
  lesson_dt DATE;
BEGIN
  SELECT * INTO ss FROM student_schedules WHERE id = p_schedule_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule % not found', p_schedule_id;
  END IF;

  IF ss.is_active = FALSE THEN
    RAISE EXCEPTION 'Schedule % is inactive and cannot be completed', p_schedule_id;
  END IF;

  -- compute lesson date (week_start_date + day_of_week days)
  lesson_dt := schedule_lesson_date(ss.week_start_date, ss.day_of_week);

  -- If already completed, bail out (idempotent)
  IF ss.attendance_status = 'completed' THEN
    RETURN;
  END IF;

  -- Update schedule occurrence
  UPDATE student_schedules
  SET attendance_status = 'completed',
      attendance_date = lesson_dt,
      lesson_type = 'completed',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_schedule_id;

  -- Insert canonical ledger entry (avoid duplicates)
  BEGIN
    INSERT INTO student_lessons (student_id, lesson_date, time_slot, created_at)
    VALUES (ss.student_id, lesson_dt, ss.time_slot, CURRENT_TIMESTAMP);
  EXCEPTION WHEN unique_violation THEN
    -- already exists in ledger (safe / idempotent)
    NULL;
  END;

  -- Add history record showing completion
  INSERT INTO schedule_history (schedule_id, action, old_teacher_id, new_teacher_id, changed_by, change_date, notes)
  VALUES (p_schedule_id, 'completed', ss.teacher_id, ss.teacher_id, p_marked_by, CURRENT_TIMESTAMP, 'Marked completed via mark_schedule_completed()');

END;
$$ LANGUAGE plpgsql;

-- ======= 4) Trigger: on schedule_templates insert, materialize near-term occurrences =======
-- Use AFTER INSERT trigger to create the first N weeks occurrences (e.g., 12).
CREATE OR REPLACE FUNCTION trg_schedule_template_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create occurrences for the next 12 weeks
  PERFORM create_occurrences_from_template(NEW.id, 12);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schedule_template_after_insert ON schedule_templates;
CREATE TRIGGER schedule_template_after_insert
  AFTER INSERT ON schedule_templates
  FOR EACH ROW EXECUTE FUNCTION trg_schedule_template_after_insert();

-- ======= 5) Prevent accidental direct updates that break invariants =======

-- 5.1 Optional trigger to enforce consistency: when marking attendance_status = 'completed', set lesson_type = 'completed' and ensure attendance_date is set
CREATE OR REPLACE FUNCTION enforce_schedule_status_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.attendance_status = 'completed' THEN
    NEW.lesson_type := 'completed';
    IF NEW.attendance_date IS NULL THEN
      NEW.attendance_date := schedule_lesson_date(NEW.week_start_date, NEW.day_of_week);
    END IF;
    NEW.is_active := TRUE; -- completed occurrences remain active in history
  END IF;

  IF NEW.attendance_status = 'absent' OR NEW.attendance_status = 'absent_warned' THEN
    -- ensure lesson_type not 'template' for attended statuses
    IF NEW.lesson_type IS NULL OR NEW.lesson_type = 'template' THEN
      NEW.lesson_type := 'scheduled';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_schedule_status_consistency ON student_schedules;
CREATE TRIGGER trg_enforce_schedule_status_consistency
  BEFORE INSERT OR UPDATE ON student_schedules
  FOR EACH ROW EXECUTE FUNCTION enforce_schedule_status_consistency();

-- ======= 6) Helpful view for backend/UI: upcoming schedule (active only) =======
DROP VIEW IF EXISTS upcoming_schedule_view;
CREATE VIEW upcoming_schedule_view AS
SELECT 
  ss.id,
  s.id as student_id,
  s.name as student_name,
  t.id as teacher_id,
  t.name as teacher_name,
  ss.day_of_week,
  ss.time_slot,
  ss.week_start_date,
  ss.attendance_status,
  ss.lesson_type,
  ss.template_id,
  ss.is_active,
  schedule_lesson_date(ss.week_start_date, ss.day_of_week) as lesson_date
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = TRUE
  AND ss.week_start_date >= DATE_TRUNC('week', CURRENT_DATE)
ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot;

-- ======= 7) Update existing records to set is_active = TRUE =======
UPDATE student_schedules SET is_active = TRUE WHERE is_active IS NULL;

-- ======= 8) Create indexes for performance =======
CREATE INDEX IF NOT EXISTS idx_student_schedules_is_active ON student_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_student_schedules_template_active ON student_schedules(template_id, is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON schedule_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_cancellation ON schedule_templates(cancellation_date);

-- ======= 9) Add comments for documentation =======
COMMENT ON COLUMN student_schedules.is_active IS 'Soft delete flag - FALSE means cancelled/inactive';
COMMENT ON COLUMN schedule_templates.cancellation_date IS 'Date when template was cancelled';
COMMENT ON COLUMN schedule_templates.cancellation_note IS 'Reason for template cancellation';
COMMENT ON FUNCTION schedule_lesson_date IS 'Calculate actual lesson date from week start and day of week';
COMMENT ON FUNCTION create_occurrences_from_template IS 'Idempotent function to create schedule occurrences from template';
COMMENT ON FUNCTION cancel_template_and_future_occurrences IS 'Safely cancel template and future occurrences, preserving past records';
COMMENT ON FUNCTION mark_schedule_completed IS 'Atomically mark schedule as completed and create ledger entry';
COMMENT ON VIEW upcoming_schedule_view IS 'Active upcoming schedule for UI display';

-- ======= 10) Safety notes: explicit commit not required; script end =======

COMMIT;

-- ======= Post-migration validation queries =======
-- Run these to verify the migration was successful:

-- Check that is_active column was added and populated
-- SELECT COUNT(*) as total_schedules, 
--        COUNT(*) FILTER (WHERE is_active = TRUE) as active_schedules,
--        COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_schedules
-- FROM student_schedules;

-- Check that new functions exist
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('schedule_lesson_date', 'create_occurrences_from_template', 'cancel_template_and_future_occurrences', 'mark_schedule_completed');

-- Check that triggers exist
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' 
-- AND trigger_name IN ('trg_protect_past_schedules_delete', 'schedule_template_after_insert', 'trg_enforce_schedule_status_consistency');

-- Check that view exists
-- SELECT table_name, table_type 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name = 'upcoming_schedule_view';

-- ======= 7) Optimized delete function for future lessons =======
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

    -- If lesson is in the past, do nothing
    IF schedule_rec.week_start_date < CURRENT_DATE THEN
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

    -- If lesson is in the future, remove it entirely
    DELETE FROM student_schedules
    WHERE id = schedule_rec.id;

    -- Optional: log deletion
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

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
