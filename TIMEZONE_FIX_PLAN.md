# Timezone Fix Plan

## Problem
Backend returns `week_start_date` as timestamp `2025-09-21T17:00:00.000Z` instead of date string `"2025-09-22"` due to PostgreSQL timezone conversion.

## Solution
Cast `week_start_date` to text in SQL SELECT queries that return data to frontend.

## Files to Fix

### 1. functions/schedules.js
**Status: ✅ COMPLETED**
- Line 95: `ss.week_start_date::text` in getSchedules()
- Line 139: `ss.week_start_date::text` in getSchedules() historical
- Line 215: `ss.week_start_date::text` in getWeeklySchedule()
- Line 1027: `ss.week_start_date::text` in getTeacherSchedules()
- Line 1072: `ss.week_start_date::text` in getStudentSchedules()
- Line 1099: `ss.week_start_date::text` in getMonthlySchedules()

### 2. functions/teachers.js
**Status: ❌ PENDING**
- Line 641: `ss.week_start_date::text` in getTeacherSchedule()
- Line 661: `ss.week_start_date::text` in getTeacherSchedule() (future weeks)
- Line 771: `ls.week_start_date::text` in getTeacherMonthlyStats()

### 3. functions/students.js
**Status: ❌ PENDING**
- Line 647: `ss.week_start_date::text` in getStudentSchedule()
- Line 665: `ss.week_start_date::text` in getStudentSchedule() (future weeks)
- Line 1227: `ws.week_start_date::text` in getStudentMonthlyStats()

### 4. functions/dashboard.js
**Status: ❌ PENDING**
- Line 187: `ss.week_start_date::text` in getUpcomingLessons()
- Line 343: `ss.week_start_date::text` in getUpcomingLessons() (admin)
- Line 360: `ss.week_start_date::text` in getUpcomingLessons() (teacher)

### 5. functions/attendance.js
**Status: ❌ PENDING**
- Line 73: `ss.week_start_date::text` in getAttendanceRecords()

## Implementation Strategy

### Option 1: Minimal SQL Changes (Recommended)
Replace `ss.week_start_date` with `ss.week_start_date::text` in SELECT queries only.

**Example:**
```sql
-- Before
SELECT ss.*, s.name as student_name

-- After  
SELECT ss.id, ss.student_id, ss.teacher_id, ss.day_of_week, ss.time_slot, 
       ss.week_start_date::text, ss.attendance_status, ss.lesson_type,
       ss.attendance_date, ss.created_at, ss.updated_at, ss.is_recurring,
       ss.end_date, ss.original_teacher_id, ss.recurrence_pattern, ss.template_id,
       ss.primary_teacher_id, ss.is_active,
       s.name as student_name
```

### Option 2: JavaScript Processing (Alternative)
Keep SQL unchanged, process in JavaScript:
```javascript
const processedRows = result.rows.map(row => ({
  ...row,
  week_start_date: row.week_start_date ? new Date(row.week_start_date).toISOString().split('T')[0] : row.week_start_date
}))
```

## Testing Plan
1. Test each API endpoint returns correct date format
2. Verify frontend receives `"2025-09-22"` instead of `"2025-09-21T17:00:00.000Z"`
3. Confirm date comparisons still work correctly
4. Test schedule creation/updates still work

## Files NOT to Change
- WHERE clauses (these work correctly with date strings)
- INSERT/UPDATE queries (these work correctly with date strings)
- COUNT queries (these don't return week_start_date to frontend)
- Frontend code (already handles date strings correctly)
