# Attendance Status Logic Analysis

## Current System Overview

The system has **two separate tracking mechanisms**:

1. **`student_schedules`** - Planning/scheduling data (what's planned)
2. **`student_lessons`** - Actual lessons taken (what happened)

## Attendance Status Types

### In `student_schedules` table:
- **`scheduled`** - Lesson is planned but hasn't happened yet
- **`completed`** - Student showed up and lesson happened
- **`absent`** - Student didn't show up (lesson was planned but student was absent)
- **`absent_warned`** - Student didn't show up + got a warning (still absent, just with warning)

### In `student_lessons` table:
- **Separate records** - Only created when lessons actually happen
- **Not linked to schedules** - Independent tracking system

## Current Logic Issues

### 1. Inconsistent Counting Logic

**Problem**: Different queries handle `absent_warned` differently:

```sql
-- Some queries include absent_warned in totals:
WHERE attendance_status IN ('completed', 'absent', 'absent_warned')

-- Other queries exclude absent_warned from totals:
WHERE attendance_status IN ('completed', 'absent')
```

### 2. What Should Be Counted?

**The Question**: Should `absent_warned` be counted in statistics?

**Current Inconsistency**:
- **Analytics queries**: Include `absent_warned` in totals
- **Dashboard queries**: Exclude `absent_warned` from totals  
- **Attendance queries**: Mixed - some include, some exclude

### 3. Business Logic Analysis

**Arguments FOR counting `absent_warned`**:
- It's still a lesson that was planned and scheduled
- Teacher still had to prepare and show up
- It represents actual teaching activity (even if student didn't show)
- Warning is just a status, not a different type of lesson

**Arguments AGAINST counting `absent_warned`**:
- Student didn't actually attend
- It's more of an administrative action than a lesson
- Might skew attendance statistics

## Current Database Schema

### `student_schedules` table:
```sql
CREATE TABLE student_schedules (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  teacher_id INTEGER REFERENCES teachers(id),
  day_of_week INTEGER NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  week_start_date DATE NOT NULL,
  attendance_status VARCHAR(20) DEFAULT 'scheduled',
  lesson_type VARCHAR(20) DEFAULT 'scheduled' CHECK (lesson_type IN ('scheduled', 'completed', 'cancelled', 'template')),
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `student_lessons` table:
```sql
CREATE TABLE student_lessons (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  lesson_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Current Query Patterns

### 1. Teacher Statistics
```sql
-- Current: Excludes cancelled/template, includes absent_warned
COUNT(CASE WHEN ss.lesson_type IN ('scheduled', 'completed') THEN ss.id END) as total_lessons
COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons
COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
```

### 2. Student Statistics  
```sql
-- Current: Uses student_lessons table (actual lessons taken)
COUNT(sl.id) as total_lessons
```

### 3. Attendance Rate Calculations
```sql
-- Current: Mixed - some include absent_warned, some don't
ROUND(
  (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
   NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent') THEN 1 END), 0)) * 100, 2
) as attendance_rate
```

## The Core Question

**What should the system count as "lessons"?**

### Option A: Count All Scheduled Lessons
- Include: `scheduled`, `completed`, `absent`, `absent_warned`
- Exclude: `cancelled`, `template`
- Logic: "If it was planned and teacher showed up, it's a lesson"

### Option B: Count Only Completed Lessons
- Include: `completed` only
- Exclude: `scheduled`, `absent`, `absent_warned`, `cancelled`, `template`
- Logic: "Only count lessons that actually happened"

### Option C: Count Lessons with Student Interaction
- Include: `completed`, `absent`, `absent_warned`
- Exclude: `scheduled`, `cancelled`, `template`
- Logic: "Count lessons where teacher and student were both involved"

## Current Inconsistencies Found

1. **Teacher stats**: Uses `lesson_type` filter (Option A)
2. **Student stats**: Uses `student_lessons` table (Option B)
3. **Attendance rates**: Mixed between Option A and C
4. **Analytics**: Mixed between Option A and C

## CORRECTED Business Logic (From User Requirements)

**Only count lessons that teacher has marked in their cabinet**:

### ✅ COUNT in total_lessons:
- **`completed`** = Teacher marked as completed (+1 hour to student & teacher)
- **`absent`** = Teacher marked as absent (+1 hour to student & teacher)  
- **`absent_warned`** = Teacher marked as warned (+0 hours to both)

### ❌ DON'T COUNT in total_lessons:
- **`scheduled`** = Not yet marked by teacher (don't count until marked)
- **`cancelled`** = Lesson was cancelled (don't count)
- **`template`** = Just a pattern (don't count)

### Hour Calculation:
- **`completed`** = +1 hour to student, +1 hour to teacher
- **`absent`** = +1 hour to student, +1 hour to teacher
- **`absent_warned`** = +0 hours to student, +0 hours to teacher

**Implementation**:
```sql
-- Count only lessons marked by teacher
COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END) as total_lessons

-- Hours calculation
COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent') THEN 1 END) as billable_hours

-- Attendance rate based on teacher-marked lessons
ROUND(
  (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
   NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN 1 END), 0)) * 100, 2
) as attendance_rate
```

## Files That Need Updates

1. **functions/teachers.js** - Teacher statistics
2. **functions/students.js** - Student statistics (currently uses student_lessons)
3. **functions/analytics.js** - Analytics queries
4. **functions/dashboard.js** - Dashboard statistics
5. **functions/attendance.js** - Attendance tracking

## Dynamic lessons_per_week Integration

### Current State
- `lessons_per_week` is currently a static field in `students` table
- Should be a **dynamic counter** that automatically tracks actual lessons per week
- Must align with the corrected attendance status logic

### New Dynamic Logic

**Auto-Update Triggers** (Database Level):
- **When lesson is ADDED**: Recalculate count for current week
- **When lesson is REMOVED**: Recalculate count for current week  
- **When lesson status changes**: Recalculate count for current week

**What Counts as "Lessons Per Week"**:
```sql
-- Count only lessons marked by teacher in current week
COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') 
           AND ss.week_start_date = DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day'
           THEN ss.id END) as lessons_per_week
```

**Implementation**:
```sql
-- Database trigger function
CREATE OR REPLACE FUNCTION update_student_lessons_per_week()
RETURNS TRIGGER AS $$
DECLARE
  target_student_id INTEGER;
BEGIN
  target_student_id := COALESCE(NEW.student_id, OLD.student_id);
  
  UPDATE students 
  SET lessons_per_week = (
    SELECT COUNT(*) 
    FROM student_schedules 
    WHERE student_id = target_student_id
      AND attendance_status IN ('completed', 'absent', 'absent_warned')
      AND week_start_date = DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day'
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = target_student_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on student_schedules changes
CREATE TRIGGER update_lessons_per_week_trigger
  AFTER INSERT OR UPDATE OR DELETE ON student_schedules
  FOR EACH ROW EXECUTE FUNCTION update_student_lessons_per_week();
```

### Benefits of Dynamic lessons_per_week

1. **Real-time accuracy**: Always reflects actual lessons per week
2. **Consistent with attendance logic**: Uses same counting rules as statistics
3. **Automatic updates**: No manual maintenance required
4. **Scheduling guidance**: Teachers can see current load
5. **Analytics accuracy**: Better insights into student engagement

### Integration Points

- **New students**: Start with `lessons_per_week = 0`
- **Scheduling**: Can use as soft limit (show warning, but allow unlimited)
- **Statistics**: Aligns with corrected attendance status counting
- **Reporting**: Shows actual teaching load per student

## Next Steps

1. ✅ **Business logic decided**: Use corrected logic (count teacher-marked lessons)
2. **Apply dynamic lessons_per_week trigger** to database
3. **Update all queries** to be consistent with corrected logic
4. **Test the changes** with sample data
5. **Update frontend** to show dynamic lessons_per_week
6. **Document the final logic** and implementation
