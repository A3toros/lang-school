# Date Logic Trace Analysis - Admin to Teacher Flow

## Overview
This document traces the complete date logic flow from admin schedule management to teacher report submission and back, identifying all date-related issues and inconsistencies.

## 1. Database Schema Date Fields

### Core Date Fields
```sql
-- student_schedules table
week_start_date DATE NOT NULL,           -- Week start (Monday)
attendance_date DATE,                    -- When attendance was marked
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

-- lesson_reports table  
lesson_date DATE NOT NULL,               -- Date of the lesson
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

-- students table
added_date DATE NOT NULL,                -- When student was added
```

### Date Constraints and Checks
```sql
-- Attendance status includes absent_warned
CHECK (attendance_status IN ('scheduled','completed','absent','absent_warned'))

-- Day of week mapping (Monday = 0)
day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6)
```

## 2. Admin Schedule Management Flow

### 2.1 Schedule Creation (Admin)
**File**: `src/components/admin/ScheduleTable.jsx`

```javascript
// Current week calculation
const getWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)  // Monday = 1
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

// Schedule data sent to backend
const scheduleData = {
  teacher_id: 5,
  student_id: 52,
  day_of_week: 0,                    // Monday = 0
  time_slot: '7:00-7:30',
  week_start_date: '2025-09-11'      // Monday of current week
}
```

**Issues Found**:
1. **Day of Week Inconsistency**: Frontend uses Monday=0, but database schema shows Sunday=0 in some places
2. **Date Format**: Uses 'YYYY-MM-DD' string format consistently

### 2.2 Backend Schedule Creation
**File**: `functions/schedules.js`

```javascript
// Creates student_schedules record
const result = await query(`
  INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status)
  VALUES ($1, $2, $3, $4, $5, 'scheduled')
`, [student_id, teacher_id, day_of_week, time_slot, week_start_date])
```

**Issues Found**:
1. **No Date Validation**: Backend doesn't validate if week_start_date is actually a Monday
2. **No Timezone Handling**: All dates assumed to be in local timezone

## 3. Teacher Schedule View Flow

### 3.1 Schedule Fetching (Teacher)
**File**: `src/pages/TeacherPage.jsx`

```javascript
// Current week calculation (same as admin)
const getWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

// API call
const response = await apiService.getTeacherSchedule(user.teacherId, currentWeek)
```

### 3.2 Backend Schedule Retrieval
**File**: `functions/teachers.js`

```javascript
// Query for teacher schedule
const result = await query(`
  SELECT ss.*, s.name as student_name, s.id as student_id
  FROM student_schedules ss
  JOIN students s ON ss.student_id = s.id
  WHERE ss.teacher_id = $1 AND ss.week_start_date = $2
  ORDER BY ss.day_of_week, ss.time_slot
`, [teacherId, weekStart])
```

**Issues Found**:
1. **Date Comparison**: Direct string comparison without timezone consideration
2. **No Date Range Validation**: Doesn't check if week_start_date is valid

## 4. Report Submission Flow

### 4.1 Report Creation (Teacher)
**File**: `src/pages/TeacherPage.jsx`

```javascript
// Report data structure
const pendingReport = {
  student_id: 52,
  lesson_date: '2025-09-11',        // Current week (Monday)
  time_slot: '8:00-8:30',
  comment: 'Great lesson!'
}

// Lesson key generation for tracking
const lessonKey = `${pendingReport.student_id}-${currentWeek}-${pendingReport.time_slot}`
// Result: "52-2025-09-11-8:00-8:30"
```

### 4.2 Backend Report Creation
**File**: `functions/reports.js`

```javascript
// Report insertion
const result = await query(`
  INSERT INTO lesson_reports (teacher_id, student_id, lesson_date, time_slot, comment)
  VALUES ($1, $2, $3, $4, $5)
`, [teacherId, studentId, lessonDate, timeSlot, comment])
```

**Issues Found**:
1. **Date Storage**: lesson_date stored as DATE type (no time component)
2. **No Validation**: Doesn't verify lesson_date matches week_start_date

## 5. Report Retrieval and Matching

### 5.1 Report Fetching (Teacher)
**File**: `src/pages/TeacherPage.jsx`

```javascript
// Fetch reports for current week
const response = await apiService.getReports({
  teacher_id: user.teacherId,
  date_from: currentWeek,           // '2025-09-11'
  date_to: getWeekEnd(currentWeek)  // '2025-09-17'
})

// Generate report keys
const reportKeys = currentWeekReports.map(report => {
  const key = `${report.student_id}-${currentWeek}-${report.time_slot}`
  return key
})
```

### 5.2 Backend Report Query
**File**: `functions/reports.js`

```javascript
// Date filtering in SQL
if (date_from) {
  queryText += ` AND lr.lesson_date::date >= $${++paramCount}::date`
  params.push(date_from)
}
if (date_to) {
  queryText += ` AND lr.lesson_date::date <= $${++paramCount}::date`
  params.push(date_to)
}
```

**Issues Found**:
1. **Type Casting**: Uses `::date` casting which may cause timezone issues
2. **Date Range Logic**: Inclusive range may include/exclude boundary dates incorrectly

## 6. Critical Issues Identified

### 6.1 Day of Week Mapping Inconsistency - CRITICAL ISSUE
**Problem**: Database schema has conflicting day mappings throughout the file

#### Original Schema (Lines 63, 359-360, 462-463)
```sql
-- Table definition
day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.

-- View definitions
CASE ss.day_of_week
    WHEN 0 THEN 'Sunday'    -- 0 = Sunday
    WHEN 1 THEN 'Monday'    -- 1 = Monday
    WHEN 2 THEN 'Tuesday'
    -- ...
END
```

#### Migration Attempt (Line 696)
```sql
-- Attempts to convert Sunday=0 to Monday=0
UPDATE student_schedules
SET day_of_week = (day_of_week + 6) % 7;
```

#### But Sample Data Still Uses Sunday=0 (Lines 316-324, 525-532)
```sql
CASE 
    WHEN s.id % 7 = 0 THEN 1  -- Monday (but this is WRONG if 0=Sunday)
    WHEN s.id % 7 = 1 THEN 2  -- Tuesday
    -- ...
    ELSE 0  -- Sunday
END
```

#### Updated View (Lines 715-723) - CORRECT
```sql
CASE ss.day_of_week
    WHEN 0 THEN 'Monday'    -- 0 = Monday (CORRECT)
    WHEN 1 THEN 'Tuesday'   -- 1 = Tuesday
    -- ...
    WHEN 6 THEN 'Sunday'    -- 6 = Sunday
END
```

**Impact**: 
- Frontend uses Monday=0 (correct)
- Some database views use Sunday=0 (incorrect)
- Sample data generation is inconsistent
- This causes schedule display and matching issues

### 6.2 Date Format Inconsistency
**Problem**: Mixed date formats throughout the system
```javascript
// Frontend uses ISO date strings
const currentWeek = '2025-09-11'

// Database stores as DATE type
lesson_date DATE NOT NULL

// But some queries use timestamp comparison
lr.lesson_date::date >= $date_from::date
```

### 6.3 Timezone Handling
**Problem**: No explicit timezone handling
- All dates assumed to be in local timezone
- No UTC conversion
- Potential issues with daylight saving time changes

### 6.4 Week Start Calculation
**Problem**: Different week start calculations
```javascript
// Frontend calculation
const diff = d.getDate() - day + (day === 0 ? -6 : 1)

// Database function
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN DATE_TRUNC('week', input_date) + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
```

**Impact**: May produce different results for edge cases.

## 7. Report Key Matching Issues

### 7.1 Key Generation Logic
```javascript
// Report key (from existing reports)
const reportKey = `${report.student_id}-${report.lesson_date}-${report.time_slot}`
// Example: "52-2025-09-10T17:00:00.000Z-8:00-8:30"

// Lesson key (from current schedule)
const lessonKey = `${scheduleItem.student_id}-${currentWeek}-${timeSlot}`
// Example: "52-2025-09-11-8:00-8:30"
```

**Problem**: Different date formats cause key mismatch.

### 7.2 Date Conversion Issues
```javascript
// Attempted fix in fetchExistingReports
const lessonDate = new Date(report.lesson_date)
const weekStartDate = getWeekStart(lessonDate)
const key = `${report.student_id}-${weekStartDate}-${report.time_slot}`
```

**Problem**: `getWeekStart()` may not handle timezone correctly.

## 8. Button State Management Issues

### 8.1 Report Tracking Logic
```javascript
// hasReport check
const hasReport = lessonsWithReports.has(lessonKey)

// Button disabling
disabled={hasReport}
```

**Problem**: If lesson keys don't match due to date format issues, buttons remain clickable when they shouldn't.

## 9. Recommended Fixes

### 9.1 Fix Database Schema Day of Week Mapping - URGENT
```sql
-- 1. Fix the sample data generation (lines 316-324, 525-532)
-- Current WRONG code:
CASE 
    WHEN s.id % 7 = 0 THEN 1  -- Monday (WRONG - this makes 0=Sunday)
    WHEN s.id % 7 = 1 THEN 2  -- Tuesday
    -- ...
    ELSE 0  -- Sunday
END

-- Should be:
CASE 
    WHEN s.id % 7 = 0 THEN 0  -- Monday (CORRECT - 0=Monday)
    WHEN s.id % 7 = 1 THEN 1  -- Tuesday
    -- ...
    ELSE 6  -- Sunday
END

-- 2. Fix the old view definitions (lines 359-360, 462-463)
-- Current WRONG code:
CASE ss.day_of_week
    WHEN 0 THEN 'Sunday'    -- WRONG
    WHEN 1 THEN 'Monday'
    -- ...
END

-- Should be:
CASE ss.day_of_week
    WHEN 0 THEN 'Monday'    -- CORRECT
    WHEN 1 THEN 'Tuesday'
    -- ...
    WHEN 6 THEN 'Sunday'
END

-- 3. Update table comment (line 63)
-- Current: -- 0=Sunday, 1=Monday, etc.
-- Should be: -- 0=Monday, 1=Tuesday, etc.
```

### 9.2 Standardize Date Formats
```javascript
// Use consistent date format throughout
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0]
}
```

### 9.3 Fix Report Key Generation
```javascript
// Use consistent date format for both keys
const generateLessonKey = (studentId, weekStart, timeSlot) => {
  return `${studentId}-${weekStart}-${timeSlot}`
}

// For reports, convert lesson_date to week_start_date
const reportWeekStart = getWeekStart(report.lesson_date)
const reportKey = generateLessonKey(report.student_id, reportWeekStart, report.time_slot)
```

### 9.4 Add Date Validation
```javascript
// Validate week_start_date is actually a Monday
const isValidWeekStart = (dateString) => {
  const date = new Date(dateString)
  return date.getDay() === 1 // Monday
}
```

### 9.5 Fix Database Date Queries
```sql
-- Use proper date comparison without casting
WHERE lr.lesson_date >= $1::date 
  AND lr.lesson_date <= $2::date
```

## 10. Testing Scenarios

### 10.1 Edge Cases to Test
1. **Week Boundary**: Lessons scheduled on Sunday (day 6) of one week
2. **Timezone Changes**: Daylight saving time transitions
3. **Month Boundary**: Lessons spanning month changes
4. **Year Boundary**: Lessons spanning year changes
5. **Leap Year**: February 29th handling

### 10.2 Data Consistency Tests
1. **Report Key Matching**: Verify all report keys match lesson keys
2. **Button States**: Verify buttons are disabled after report submission
3. **Week Navigation**: Verify week changes update all date references
4. **Schedule Creation**: Verify new schedules use correct week_start_date

## 11. Implementation Priority

1. **High Priority**: Fix day of week mapping inconsistency
2. **High Priority**: Fix report key generation and matching
3. **Medium Priority**: Standardize date formats
4. **Medium Priority**: Add date validation
5. **Low Priority**: Implement timezone handling

## 12. Conclusion

The main issues are:
1. **Day of week mapping inconsistency** between frontend and database
2. **Date format mismatches** in report key generation
3. **Lack of date validation** throughout the system
4. **No timezone handling** for edge cases

These issues cause the "grayed out lessons" problem where lessons appear as reported when they shouldn't, and buttons remain clickable when they should be disabled.
