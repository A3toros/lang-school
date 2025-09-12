# Corrected Schedule Enhancement Plan - Following Tech Task Requirements

## Overview
This document outlines the plan to enhance the current schedule management system by **rewriting existing functions** to properly implement the specific technical requirements outlined in the tech task.

## Tech Task Requirements Analysis

### ✅ Database Schema Changes (Already in SQL)
1. **`is_active` added on `student_schedules`** - canonical flag for future calendar queries
2. **`schedule_templates` got `cancellation_date` and `cancellation_note`** - record admin cancellations
3. **Protective trigger prevents hard-deleting past `student_schedules` rows** - audit safety

### ✅ Database Functions (Already in SQL)
1. **`create_occurrences_from_template`** - rolling-horizon materialization
2. **`extend_all_templates`** - bulk template extension
3. **`cancel_template_and_future_occurrences`** - safely cancels future occurrences (keeps past)
4. **`mark_schedule_completed`** - idempotent, updates schedule + inserts ledger + logs history

### ✅ Database Triggers (Already in SQL)
1. **Trigger on `schedule_templates`** - inserts near-term occurrences automatically (12 weeks default)
2. **Consistency trigger** - keeps `lesson_type` and `attendance_status` synchronized
3. **Protective trigger** - prevents hard-deleting past rows

### ✅ Database Views (Already in SQL)
1. **`upcoming_schedule_view`** - filtered view for UI usage

## Required Function Rewrites

### 1. **functions/schedules.js** - Core Schedule Management

#### 1.1 `getSchedules()` - Use `is_active` Flag
**Current Issue:** Queries all schedules regardless of active status
**Required Change:** Use `is_active = TRUE` for future calendar queries

```javascript
// BEFORE: Queries all schedules
async function getSchedules(event, user) {
  const queryText = `
    SELECT ss.*, s.name as student_name, t.name as teacher_name
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE s.is_active = true AND t.is_active = true
  `
}

// AFTER: Use is_active flag for future calendar queries
async function getSchedules(event, user) {
  const { include_history = 'false' } = event.queryStringParameters || {}
  
  let queryText = `
    SELECT ss.*, s.name as student_name, t.name as teacher_name
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE s.is_active = true AND t.is_active = true
  `
  
  // For future calendar queries, only show active schedules
  if (include_history !== 'true') {
    queryText += ` AND ss.is_active = TRUE`
  }
  
  // For upcoming schedules, use the view
  if (include_history !== 'true') {
    queryText = `
      SELECT * FROM upcoming_schedule_view
      WHERE 1=1
    `
  }
}
```

#### 1.2 `createSchedule()` - Use Template-Based Approach
**Current Issue:** Direct insertion into `student_schedules`
**Required Change:** Create template, let trigger generate occurrences

```javascript
// BEFORE: Direct insertion
async function createSchedule(event, user) {
  await client.query('INSERT INTO student_schedules...')
}

// AFTER: Template-based with trigger
async function createSchedule(event, user) {
  const { student_id, teacher_id, day_of_week, time_slot, week_start_date, end_date } = JSON.parse(event.body)
  
  // Create template (trigger automatically creates 12 weeks of occurrences)
  const templateResult = await client.query(`
    INSERT INTO schedule_templates (
      student_id, teacher_id, day_of_week, time_slot, 
      lessons_per_week, start_date, end_date, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
    RETURNING *
  `, [student_id, teacher_id, day_of_week, time_slot, 1, week_start_date, end_date])
  
  // Get generated occurrences
  const occurrences = await client.query(`
    SELECT * FROM student_schedules WHERE template_id = $1
  `, [templateResult.rows[0].id])
  
  return successResponse({ 
    template: templateResult.rows[0], 
    occurrences: occurrences.rows 
  })
}
```

#### 1.3 `deleteSchedule()` - Use Soft Delete + Template Cancellation
**Current Issue:** Hard delete removes audit trail
**Required Change:** Use `cancel_template_and_future_occurrences` for templates, soft delete for single occurrences

```javascript
// BEFORE: Hard delete
async function deleteSchedule(event, user) {
  await client.query('DELETE FROM student_schedules WHERE id = $1', [scheduleId])
}

// AFTER: Soft delete with template cancellation
async function deleteSchedule(event, user) {
  const schedule = await client.query('SELECT template_id FROM student_schedules WHERE id = $1', [scheduleId])
  
  if (schedule.rows[0].template_id) {
    // Use database function to cancel template and future occurrences
    await client.query('SELECT cancel_template_and_future_occurrences($1, $2, $3)', [
      schedule.rows[0].template_id, 
      user.userId, 
      'Cancelled by admin'
    ])
  } else {
    // Soft delete single occurrence
    await client.query(`
      UPDATE student_schedules 
      SET is_active = FALSE, 
          lesson_type = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [scheduleId])
  }
}
```

#### 1.4 `markAttendance()` - Use `mark_schedule_completed` Function
**Current Issue:** Direct SQL updates without atomic operations
**Required Change:** Use `mark_schedule_completed` for completion, safe updates for other statuses

```javascript
// BEFORE: Direct SQL updates
async function markAttendance(event, user) {
  await client.query(`
    UPDATE student_schedules 
    SET attendance_status = $1, attendance_date = $2
    WHERE id = $3
  `, [status, date, scheduleId])
}

// AFTER: Use database function for completion
async function markAttendance(event, user) {
  const { schedule_id, status } = JSON.parse(event.body)
  
  if (status === 'completed') {
    // Use atomic database function (idempotent)
    await client.query('SELECT mark_schedule_completed($1, $2)', [schedule_id, user.userId])
  } else {
    // Safe update for absent/warned (consistency trigger handles lesson_type)
    await client.query(`
      UPDATE student_schedules 
      SET attendance_status = $1, attendance_date = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND is_active = TRUE
    `, [status, new Date().toISOString().split('T')[0], schedule_id])
  }
}
```

### 2. **functions/attendance.js** - Attendance Management

#### 2.1 `getAttendance()` - Use `upcoming_schedule_view`
**Current Issue:** Complex joins and filtering
**Required Change:** Use `upcoming_schedule_view` for active records

```javascript
// BEFORE: Complex joins
async function getAttendance(event, user) {
  const queryText = `
    SELECT ss.*, s.name as student_name, t.name as teacher_name
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE ss.attendance_status IN ('completed', 'absent', 'absent_warned')
  `
}

// AFTER: Use upcoming_schedule_view
async function getAttendance(event, user) {
  const queryText = `
    SELECT 
      usv.*,
      CASE WHEN usv.attendance_status = 'completed' THEN 'completed'
           WHEN usv.attendance_status = 'absent' THEN 'absent'
           WHEN usv.attendance_status = 'absent_warned' THEN 'absent_warned'
           ELSE 'scheduled'
      END as status
    FROM upcoming_schedule_view usv
    WHERE usv.attendance_status IN ('completed', 'absent', 'absent_warned')
  `
}
```

### 3. **functions/students.js** - Student Schedule Functions

#### 3.1 `getStudentSchedule()` - Use `is_active` Flag
**Current Issue:** Shows all schedules regardless of status
**Required Change:** Use `is_active` flag for future calendar queries

```javascript
// BEFORE: Shows all schedules
async function getStudentSchedule(event, user) {
  const queryText = `
    SELECT ss.*, s.name as student_name, t.name as teacher_name
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE ss.student_id = $1
  `
}

// AFTER: Use is_active flag and upcoming_schedule_view
async function getStudentSchedule(event, user) {
  const { include_history = 'false' } = event.queryStringParameters || {}
  
  let queryText
  let params = [studentId]
  
  if (include_history === 'true') {
    // Historical data - query all schedules
    queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.student_id = $1
    `
  } else {
    // Future calendar queries - use upcoming_schedule_view
    queryText = `
      SELECT * FROM upcoming_schedule_view
      WHERE student_id = $1
    `
  }
}
```

### 4. **functions/teachers.js** - Teacher Schedule Functions

#### 4.1 `getTeacherSchedule()` - Use `upcoming_schedule_view`
**Current Issue:** Complex queries for teacher schedules
**Required Change:** Use `upcoming_schedule_view` for active schedules

```javascript
// BEFORE: Complex joins
async function getTeacherSchedule(event, user) {
  const queryText = `
    SELECT ss.*, s.name as student_name, t.name as teacher_name
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE ss.teacher_id = $1
  `
}

// AFTER: Use upcoming_schedule_view
async function getTeacherSchedule(event, user) {
  const { include_history = 'false' } = event.queryStringParameters || {}
  
  if (include_history === 'true') {
    // Historical data
    queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.teacher_id = $1
    `
  } else {
    // Future calendar queries - use upcoming_schedule_view
    queryText = `
      SELECT * FROM upcoming_schedule_view
      WHERE teacher_id = $1
    `
  }
}
```

## Implementation Priority

### Phase 1: Database Migration (Week 1)
1. ✅ Apply SQL enhancement script (already provided)
2. ✅ Verify all functions work with existing data
3. ✅ Test triggers and constraints

### Phase 2: Rewrite Core Functions (Week 2-3)

#### Priority 1: `functions/schedules.js`
- [ ] `getSchedules()` - Use `is_active` flag and `upcoming_schedule_view`
- [ ] `createSchedule()` - Use template-based approach with trigger
- [ ] `deleteSchedule()` - Use `cancel_template_and_future_occurrences` and soft delete
- [ ] `markAttendance()` - Use `mark_schedule_completed` function

#### Priority 2: `functions/attendance.js`
- [ ] `getAttendance()` - Use `upcoming_schedule_view`
- [ ] `markAttendance()` - Use `mark_schedule_completed` function
- [ ] All other attendance functions - Update to use `is_active` flag

#### Priority 3: `functions/students.js` and `functions/teachers.js`
- [ ] `getStudentSchedule()` - Use `is_active` flag and `upcoming_schedule_view`
- [ ] `getTeacherSchedule()` - Use `is_active` flag and `upcoming_schedule_view`
- [ ] All other schedule functions - Update to use `is_active` flag

### Phase 3: Frontend Updates (Week 3-4)
- [ ] Update components to handle `is_active` flag
- [ ] Use `upcoming_schedule_view` for future calendar queries
- [ ] Show cancelled/inactive schedules appropriately
- [ ] Add template management UI (optional)

### Phase 4: Background Jobs (Week 4)
- [ ] Add `extend_all_templates` job for rolling horizon
- [ ] Add data reconciliation job
- [ ] Add monitoring and alerting

## Key Requirements Compliance

### ✅ `is_active` Flag Usage
- All future calendar queries use `is_active = TRUE`
- Historical queries can include inactive records
- Soft delete sets `is_active = FALSE`

### ✅ Template-Based Approach
- `createSchedule()` creates templates, trigger generates occurrences
- `deleteSchedule()` uses `cancel_template_and_future_occurrences` for templates
- Rolling horizon maintained with `extend_all_templates`

### ✅ Atomic Operations
- `mark_schedule_completed` used for completion (idempotent)
- Consistency trigger keeps `lesson_type` and `attendance_status` synchronized
- All operations logged in `schedule_history`

### ✅ Audit Safety
- Protective trigger prevents hard-deleting past rows
- Soft delete preserves historical data
- Comprehensive audit trail maintained

### ✅ UI Optimization
- `upcoming_schedule_view` used for future calendar queries
- `is_active` flag provides clear status indication
- Historical data accessible when needed

## Conclusion

This corrected plan properly implements all the technical requirements:

1. **Uses `is_active` flag** for canonical future calendar queries
2. **Implements template-based approach** with automatic occurrence generation
3. **Uses database functions** for atomic operations
4. **Preserves audit trail** with soft deletes and protective triggers
5. **Optimizes UI queries** with `upcoming_schedule_view`
6. **Maintains data consistency** with triggers and constraints

The existing API structure remains the same, but all functions are rewritten to properly use the new database functions and patterns as specified in the tech task.
