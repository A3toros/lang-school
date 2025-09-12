# Revised Schedule Enhancement Plan - Rewrite Existing Functions

## Overview
This document outlines the plan to enhance the current schedule management system by **rewriting existing functions** to use the new database functions and improved data integrity patterns, rather than adding new endpoints.

## Current Function Analysis

### Existing Functions to Rewrite

#### 1. **functions/schedules.js** - Main Schedule Management
**Current Endpoints:**
- `GET /api/schedules` - Get schedules with filters
- `GET /api/schedules/week/{date}` - Get weekly schedule  
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/{id}` - Update schedule
- `DELETE /api/schedules/{id}` - Delete schedule
- `POST /api/schedules/bulk` - Bulk update schedules
- `GET /api/schedules/conflicts` - Get scheduling conflicts
- `GET /api/schedules/teacher/{id}` - Get teacher schedules
- `GET /api/schedules/student/{id}` - Get student schedules
- `POST /api/schedules/{id}/attendance` - Mark attendance
- `POST /api/schedule-templates` - Create template
- `GET /api/schedule-templates` - List templates
- `POST /api/schedules/generate-recurring` - Generate recurring

#### 2. **functions/attendance.js** - Attendance Management
**Current Endpoints:**
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/mark` - Mark attendance
- `PUT /api/attendance/{id}` - Update attendance
- `GET /api/attendance/teacher/{id}` - Get teacher attendance
- `GET /api/attendance/student/{id}` - Get student attendance
- `GET /api/attendance/stats` - Get attendance stats
- `GET /api/attendance/week/{date}` - Get weekly attendance
- `GET /api/attendance/month/{year}/{month}` - Get monthly attendance
- `POST /api/attendance/bulk-mark` - Bulk mark attendance
- `GET /api/attendance/export` - Export attendance

#### 3. **functions/students.js** - Student Schedule Functions
**Current Functions:**
- `getStudentSchedule()` - Get student schedule
- `getStudentLessons()` - Get student lessons

#### 4. **functions/teachers.js** - Teacher Schedule Functions  
**Current Functions:**
- `getTeacherSchedule()` - Get teacher schedule
- `getTeacherStats()` - Get teacher statistics

## Rewrite Strategy

### Phase 1: Database Migration (Week 1)
1. Apply the SQL enhancement script
2. Verify all new functions and triggers work
3. Test with existing data

### Phase 2: Rewrite Core Functions (Week 2-3)

#### 2.1 Rewrite `functions/schedules.js`

**Key Changes:**
- Replace direct SQL updates with database functions
- Use `upcoming_schedule_view` for active schedules
- Implement proper soft delete with `is_active` flag
- Add template management using new functions

**Functions to Rewrite:**

```javascript
// OLD: Direct SQL updates
async function createSchedule(event, user) {
  // Direct INSERT into student_schedules
  await client.query('INSERT INTO student_schedules...')
}

// NEW: Use template-based approach
async function createSchedule(event, user) {
  // Create template first, trigger generates occurrences
  const templateResult = await client.query(`
    INSERT INTO schedule_templates (student_id, teacher_id, day_of_week, time_slot, start_date, end_date)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [student_id, teacher_id, day_of_week, time_slot, week_start_date, end_date])
  
  // Get generated occurrences
  const occurrences = await client.query(`
    SELECT * FROM student_schedules WHERE template_id = $1
  `, [templateResult.rows[0].id])
  
  return successResponse({ template: templateResult.rows[0], occurrences: occurrences.rows })
}
```

```javascript
// OLD: Direct DELETE
async function deleteSchedule(event, user) {
  await client.query('DELETE FROM student_schedules WHERE id = $1', [scheduleId])
}

// NEW: Soft delete with template cancellation
async function deleteSchedule(event, user) {
  // Check if it's a template-based schedule
  const schedule = await client.query('SELECT template_id FROM student_schedules WHERE id = $1', [scheduleId])
  
  if (schedule.rows[0].template_id) {
    // Cancel entire template
    await client.query('SELECT cancel_template_and_future_occurrences($1, $2, $3)', 
      [schedule.rows[0].template_id, user.userId, 'Deleted by admin'])
  } else {
    // Soft delete single occurrence
    await client.query(`
      UPDATE student_schedules 
      SET is_active = FALSE, lesson_type = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [scheduleId])
  }
}
```

```javascript
// OLD: Direct attendance marking
async function markAttendance(event, user) {
  await client.query(`
    UPDATE student_schedules 
    SET attendance_status = $1, attendance_date = $2
    WHERE id = $3
  `, [status, date, scheduleId])
}

// NEW: Use database function for completion
async function markAttendance(event, user) {
  const { schedule_id, status } = JSON.parse(event.body)
  
  if (status === 'completed') {
    // Use atomic database function
    await client.query('SELECT mark_schedule_completed($1, $2)', [schedule_id, user.userId])
  } else {
    // Safe update for other statuses
    await client.query(`
      UPDATE student_schedules 
      SET attendance_status = $1, attendance_date = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND is_active = TRUE
    `, [status, new Date().toISOString().split('T')[0], schedule_id])
  }
}
```

#### 2.2 Rewrite `functions/attendance.js`

**Key Changes:**
- Use `upcoming_schedule_view` for active records
- Implement proper permission checks
- Use database functions for completion
- Add proper error handling

```javascript
// OLD: Query all schedules
async function getAttendance(event, user) {
  const queryText = `
    SELECT ss.*, s.name as student_name, t.name as teacher_name
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE ss.attendance_status IN ('completed', 'absent', 'absent_warned')
  `
}

// NEW: Use view and proper filtering
async function getAttendance(event, user) {
  const queryText = `
    SELECT usv.*, 
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

#### 2.3 Rewrite `functions/students.js` and `functions/teachers.js`

**Key Changes:**
- Use `upcoming_schedule_view` for active schedules
- Use `student_lessons` for historical data
- Implement proper permission checks

```javascript
// OLD: Direct query
async function getStudentSchedule(event, user) {
  const queryText = `
    SELECT ss.*, s.name as student_name, t.name as teacher_name
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE ss.student_id = $1
  `
}

// NEW: Use view for active, separate query for history
async function getStudentSchedule(event, user) {
  // Active schedules
  const activeQuery = `
    SELECT * FROM upcoming_schedule_view 
    WHERE student_id = $1
  `
  
  // Historical data (if needed)
  const historyQuery = `
    SELECT ss.*, s.name as student_name, t.name as teacher_name
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE ss.student_id = $1 AND ss.week_start_date < DATE_TRUNC('week', CURRENT_DATE)
  `
}
```

### Phase 3: Frontend Updates (Week 3-4)

#### 3.1 Update API Service Calls
**No new endpoints needed** - just update existing calls to work with enhanced responses:

```javascript
// Existing API calls work the same, but with enhanced data
const response = await apiService.getSchedules({
  teacher_id: user.teacherId,
  week_start: currentWeek
})

// Response now includes is_active flag and better data structure
response.schedules.forEach(schedule => {
  if (schedule.is_active) {
    // Show active schedule
  } else {
    // Show as cancelled/inactive
  }
})
```

#### 3.2 Update Schedule Components
**Minimal changes needed** - existing components work with enhanced data:

```jsx
// Existing component with minor updates
const ScheduleItem = ({ schedule }) => {
  const isActive = schedule.is_active
  const isCompleted = schedule.attendance_status === 'completed'
  const isPast = schedule.week_start_date < getCurrentWeekStart()
  
  return (
    <div className={`schedule-item ${!isActive ? 'inactive' : ''}`}>
      {/* Existing UI with enhanced status handling */}
      {isActive && !isCompleted && !isPast && (
        <button onClick={() => handleMarkCompleted(schedule.id)}>
          Mark Completed
        </button>
      )}
    </div>
  )
}
```

### Phase 4: Background Jobs (Week 4)

#### 4.1 Add Template Extension Job
```javascript
// functions/jobs/extendTemplates.js
exports.handler = async (event, context) => {
  try {
    const client = await getPool().connect()
    await client.query('SELECT extend_all_templates(12)')
    return { statusCode: 200, body: 'Success' }
  } catch (error) {
    console.error('Template extension failed:', error)
    return { statusCode: 500, body: 'Failed' }
  }
}
```

#### 4.2 Add Data Reconciliation Job
```javascript
// functions/jobs/reconcileLedger.js
exports.handler = async (event, context) => {
  try {
    const client = await getPool().connect()
    
    // Find completed schedules without ledger entries
    const missingEntries = await client.query(`
      SELECT ss.id, ss.student_id, ss.week_start_date, ss.day_of_week, ss.time_slot
      FROM student_schedules ss
      LEFT JOIN student_lessons sl ON (
        ss.student_id = sl.student_id AND
        sl.lesson_date = schedule_lesson_date(ss.week_start_date, ss.day_of_week) AND
        sl.time_slot = ss.time_slot
      )
      WHERE ss.attendance_status = 'completed' AND sl.id IS NULL
    `)
    
    // Create missing entries
    for (const entry of missingEntries.rows) {
      const lessonDate = await client.query(
        'SELECT schedule_lesson_date($1, $2) as lesson_date',
        [entry.week_start_date, entry.day_of_week]
      )
      
      await client.query(`
        INSERT INTO student_lessons (student_id, lesson_date, time_slot)
        VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
      `, [entry.student_id, lessonDate.rows[0].lesson_date, entry.time_slot])
    }
    
    return { statusCode: 200, body: 'Success' }
  } catch (error) {
    console.error('Ledger reconciliation failed:', error)
    return { statusCode: 500, body: 'Failed' }
  }
}
```

## Implementation Steps

### Step 1: Database Migration
1. Apply `migrations/2025-01-15_schedule_enhancement.sql`
2. Verify all functions work with existing data
3. Test triggers and constraints

### Step 2: Rewrite Functions (Priority Order)
1. **schedules.js** - Core schedule management
2. **attendance.js** - Attendance marking
3. **students.js** - Student schedule queries
4. **teachers.js** - Teacher schedule queries

### Step 3: Update Frontend
1. Update API service to handle enhanced responses
2. Update components to show active/inactive status
3. Add template management UI (optional)

### Step 4: Add Background Jobs
1. Template extension job
2. Data reconciliation job
3. Monitoring and alerting

## Benefits of This Approach

### 1. **Minimal Disruption**
- Existing API endpoints remain the same
- Frontend changes are minimal
- Users see improved functionality without learning new interfaces

### 2. **Better Data Integrity**
- All operations use database functions
- Atomic operations prevent data corruption
- Comprehensive audit trails

### 3. **Improved Performance**
- Database views optimize queries
- Proper indexing improves response times
- Background jobs handle heavy operations

### 4. **Enhanced User Experience**
- Clear distinction between active and historical data
- Better error handling and user feedback
- Consistent data across all views

## Migration Checklist

### Database
- [ ] Apply SQL migration script
- [ ] Verify all functions work
- [ ] Test triggers and constraints
- [ ] Validate data integrity

### Backend
- [ ] Rewrite `schedules.js` functions
- [ ] Rewrite `attendance.js` functions  
- [ ] Rewrite `students.js` functions
- [ ] Rewrite `teachers.js` functions
- [ ] Add background jobs
- [ ] Test all endpoints

### Frontend
- [ ] Update API service calls
- [ ] Update schedule components
- [ ] Add status indicators
- [ ] Test all functionality

### Testing
- [ ] Unit tests for all functions
- [ ] Integration tests for workflows
- [ ] End-to-end tests for user flows
- [ ] Performance testing

## Conclusion

This revised approach focuses on **enhancing existing functionality** rather than adding new endpoints. By rewriting the current functions to use the new database functions and patterns, we get:

- **Better data integrity** through atomic operations
- **Improved performance** through optimized queries
- **Enhanced user experience** with better status handling
- **Minimal disruption** to existing workflows
- **Comprehensive audit trails** for all operations

The existing API structure remains the same, making this a seamless upgrade for users while providing significant improvements under the hood.
