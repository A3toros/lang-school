-- Dynamic lessons_per_week Implementation
-- This migration makes lessons_per_week a dynamic counter that automatically
-- tracks the actual number of lessons per week for each student

-- 1. Fix constraint conflicts and set proper default
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_lessons_per_week_check;
ALTER TABLE students ADD CONSTRAINT students_lessons_per_week_check 
CHECK (lessons_per_week >= 0);

ALTER TABLE students 
ALTER COLUMN lessons_per_week SET DEFAULT 0;

-- 2. Update existing NULL values to 0
UPDATE students 
SET lessons_per_week = 0 
WHERE lessons_per_week IS NULL;

-- 3. Create function to update lessons_per_week
CREATE OR REPLACE FUNCTION update_student_lessons_per_week()
RETURNS TRIGGER AS $$
DECLARE
  target_student_id INTEGER;
BEGIN
  -- Get the student_id from NEW or OLD record
  target_student_id := COALESCE(NEW.student_id, OLD.student_id);
  
  -- Update lessons_per_week for the student
  UPDATE students 
  SET lessons_per_week = (
    SELECT COUNT(*) 
    FROM student_schedules 
    WHERE student_id = target_student_id
      AND attendance_status IN ('completed', 'absent', 'absent_warned')
      AND week_start_date >= CURRENT_DATE - INTERVAL '7 days'
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = target_student_id;
  
  -- Return the record that caused the trigger
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on student_schedules table
DROP TRIGGER IF EXISTS update_lessons_per_week_trigger ON student_schedules;
CREATE TRIGGER update_lessons_per_week_trigger
  AFTER INSERT OR UPDATE OR DELETE ON student_schedules
  FOR EACH ROW EXECUTE FUNCTION update_student_lessons_per_week();

-- 5. Initialize lessons_per_week for all existing students
UPDATE students 
SET lessons_per_week = (
  SELECT COUNT(*) 
  FROM student_schedules 
  WHERE student_id = students.id
    AND attendance_status IN ('completed', 'absent', 'absent_warned')
    AND week_start_date >= CURRENT_DATE - INTERVAL '7 days'
),
updated_at = CURRENT_TIMESTAMP;

-- 6. Add comment explaining the dynamic behavior
COMMENT ON COLUMN students.lessons_per_week IS 'Dynamic counter of actual lessons per week (last 7 days). Auto-updated by database trigger when student_schedules change.';
