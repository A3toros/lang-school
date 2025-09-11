# Dynamic lessons_per_week Implementation

## Current State
- `lessons_per_week` in `students` table is currently a static field
- Not being used effectively for scheduling limits
- Should be a **dynamic counter** of actual lessons per week
- Must align with corrected attendance status logic (see ATTENDANCE_STATUS_LOGIC_ANALYSIS.md)

## New Logic

### 1. Initial Value
- **New students**: `lessons_per_week = 0`
- **Existing students**: Calculate current actual lessons per week

### 2. Auto-Update Triggers
**When lesson is ADDED** (teacher marks as completed/absent):
- Recalculate total count for current week

**When lesson is REMOVED** (cancelled or deleted):
- Recalculate total count for current week

**When lesson status changes**:
- Recalculate total count for current week
- Uses same logic as attendance statistics (see ATTENDANCE_STATUS_LOGIC_ANALYSIS.md)

**What Counts as Lessons**:
- ✅ `completed` - Student showed up (+1 hour)
- ✅ `absent` - Student didn't show up (+1 hour) 
- ✅ `absent_warned` - Student didn't show up + warning (+0 hours)
- ❌ `scheduled` - Not yet marked by teacher
- ❌ `cancelled` - Lesson was cancelled
- ❌ `template` - Just a pattern

### 3. Implementation Strategy

#### Option A: Database Triggers (Recommended)
```sql
-- Trigger on student_schedules INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION update_student_lessons_per_week()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate actual lessons per week for the student
  UPDATE students 
  SET lessons_per_week = (
    SELECT COUNT(*) 
    FROM student_schedules 
    WHERE student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND attendance_status IN ('completed', 'absent', 'absent_warned')
      AND week_start_date = DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day'
  )
  WHERE id = COALESCE(NEW.student_id, OLD.student_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lessons_per_week_trigger
  AFTER INSERT OR UPDATE OR DELETE ON student_schedules
  FOR EACH ROW EXECUTE FUNCTION update_student_lessons_per_week();
```

#### Option B: Application-Level Updates
- Update `lessons_per_week` in every function that modifies `student_schedules`
- More control but requires updating multiple functions

### 4. Functions to Update

1. **functions/schedules.js**:
   - `createSchedule()` - When lesson is created
   - `deleteSchedule()` - When lesson is deleted
   - `updateScheduleStatus()` - When status changes

2. **functions/attendance.js**:
   - `markAttendance()` - When teacher marks attendance
   - `updateAttendanceStatus()` - When status changes

### 5. New Student Logic
```sql
-- Set new students to 0 lessons per week
UPDATE students 
SET lessons_per_week = 0 
WHERE lessons_per_week IS NULL OR lessons_per_week = 0;
```

### 6. Migration for Existing Students
```sql
-- Calculate current actual lessons per week for existing students
UPDATE students 
SET lessons_per_week = (
  SELECT COUNT(*) 
  FROM student_schedules 
  WHERE student_id = students.id
    AND attendance_status IN ('completed', 'absent', 'absent_warned')
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day'
);
```

### 7. Usage in Scheduling
- Can use `lessons_per_week` as a **soft limit** for scheduling
- Show warning if trying to schedule more than current count
- But allow unlimited scheduling (as per current requirements)

### 8. Benefits
- **Real-time accuracy**: Always reflects actual lessons per week
- **Useful for reporting**: Shows actual teaching load
- **Scheduling guidance**: Helps teachers see current load
- **Analytics**: Better insights into student engagement

## Implementation Steps

1. **Create database trigger** for auto-updates
2. **Update new student creation** to set `lessons_per_week = 0`
3. **Migrate existing students** to current actual count
4. **Test the trigger** with sample data
5. **Update frontend** to show dynamic `lessons_per_week`
6. **Add validation** (optional) for scheduling limits

## Database Schema Update
```sql
-- Ensure lessons_per_week defaults to 0
ALTER TABLE students 
ALTER COLUMN lessons_per_week SET DEFAULT 0;

-- Update existing NULL values
UPDATE students 
SET lessons_per_week = 0 
WHERE lessons_per_week IS NULL;
```
