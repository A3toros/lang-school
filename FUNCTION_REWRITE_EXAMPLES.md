# Function Rewrite Examples

## Overview
This document provides specific examples of how to rewrite existing functions to use the new database functions and improved patterns.

## 1. Rewrite `functions/schedules.js`

### 1.1 Create Schedule Function

**BEFORE (Current Implementation):**
```javascript
async function createSchedule(event, user) {
  const client = await getPool().connect()
  
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { student_id, teacher_id, day_of_week, time_slot, week_start_date } = JSON.parse(event.body)

    await client.query('BEGIN')

    // Direct conflict checking
    await checkSchedulingConflicts(client, student_id, teacher_id, day_of_week, time_slot, week_start_date, 1)

    // Create multiple lessons
    const createdSchedules = await createMultipleLessons(
      client, student_id, teacher_id, day_of_week, time_slot, week_start_date, 1
    )

    // Create template
    const templateResult = await createScheduleTemplateInternal(
      client, student_id, teacher_id, day_of_week, time_slot, 1, week_start_date
    )

    await client.query('COMMIT')
    return successResponse({ schedules: createdSchedules })
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(500, 'Failed to create schedule')
  } finally {
    client.release()
  }
}
```

**AFTER (Enhanced Implementation):**
```javascript
async function createSchedule(event, user) {
  const client = await getPool().connect()
  
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { student_id, teacher_id, day_of_week, time_slot, week_start_date, end_date } = JSON.parse(event.body)

    if (!student_id || !teacher_id || day_of_week === undefined || !time_slot || !week_start_date) {
      return errorResponse(400, 'Missing required fields')
    }

    await client.query('BEGIN')

    // Validate student and teacher exist
    const studentCheck = await client.query('SELECT id FROM students WHERE id = $1 AND is_active = TRUE', [student_id])
    if (studentCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(404, 'Student not found or inactive')
    }

    const teacherCheck = await client.query('SELECT id FROM teachers WHERE id = $1 AND is_active = TRUE', [teacher_id])
    if (teacherCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(404, 'Teacher not found or inactive')
    }

    // Create template (trigger automatically creates occurrences)
    const templateResult = await client.query(`
      INSERT INTO schedule_templates (
        student_id, teacher_id, day_of_week, time_slot, 
        lessons_per_week, start_date, end_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING *
    `, [student_id, teacher_id, day_of_week, time_slot, 1, week_start_date, end_date])

    const template = templateResult.rows[0]

    // Get generated occurrences
    const occurrencesResult = await client.query(`
      SELECT ss.*, s.name as student_name, t.name as teacher_name,
             schedule_lesson_date(ss.week_start_date, ss.day_of_week) as lesson_date
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.template_id = $1 
      ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot
    `, [template.id])

    // Log template creation
    await client.query(`
      INSERT INTO schedule_history (schedule_id, action, old_teacher_id, new_teacher_id, changed_by, change_date, notes)
      SELECT ss.id, 'created', NULL, ss.teacher_id, $1, CURRENT_TIMESTAMP, 'Template created via API'
      FROM student_schedules ss WHERE ss.template_id = $2
    `, [user.userId, template.id])

    await client.query('COMMIT')
    
    return successResponse({
      template: template,
      occurrences: occurrencesResult.rows,
      totalOccurrences: occurrencesResult.rows.length
    }, 201)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Create schedule error:', error)
    return errorResponse(500, 'Failed to create schedule: ' + error.message)
  } finally {
    client.release()
  }
}
```

### 1.2 Delete Schedule Function

**BEFORE (Current Implementation):**
```javascript
async function deleteSchedule(event, user) {
  try {
    const scheduleId = parseInt(event.path.split('/')[3])
    
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    // Direct delete
    const result = await query('DELETE FROM student_schedules WHERE id = $1', [scheduleId])
    
    if (result.rowCount === 0) {
      return errorResponse(404, 'Schedule not found')
    }

    return successResponse({ message: 'Schedule deleted successfully' })
  } catch (error) {
    console.error('Delete schedule error:', error)
    return errorResponse(500, 'Failed to delete schedule')
  }
}
```

**AFTER (Enhanced Implementation):**
```javascript
async function deleteSchedule(event, user) {
  const client = await getPool().connect()
  
  try {
    const scheduleId = parseInt(event.path.split('/')[3])
    
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    await client.query('BEGIN')

    // Get schedule details
    const scheduleCheck = await client.query(`
      SELECT template_id, week_start_date, is_active, attendance_status
      FROM student_schedules WHERE id = $1
    `, [scheduleId])

    if (scheduleCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(404, 'Schedule not found')
    }

    const schedule = scheduleCheck.rows[0]

    // Check if it's a past occurrence
    const currentWeekStart = new Date()
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1)
    currentWeekStart.setHours(0, 0, 0, 0)

    if (new Date(schedule.week_start_date) < currentWeekStart) {
      await client.query('ROLLBACK')
      return errorResponse(400, 'Cannot delete past occurrences - they are archived for audit')
    }

    if (schedule.template_id) {
      // Cancel entire template and future occurrences
      await client.query('SELECT cancel_template_and_future_occurrences($1, $2, $3)', [
        schedule.template_id, 
        user.userId, 
        'Deleted by admin'
      ])
    } else {
      // Soft delete single occurrence
      await client.query(`
        UPDATE student_schedules 
        SET is_active = FALSE, 
            lesson_type = CASE WHEN attendance_status = 'scheduled' THEN 'cancelled' ELSE lesson_type END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [scheduleId])

      // Log cancellation
      await client.query(`
        INSERT INTO schedule_history (schedule_id, action, old_teacher_id, new_teacher_id, changed_by, change_date, notes)
        VALUES ($1, 'cancelled', (SELECT teacher_id FROM student_schedules WHERE id = $1), NULL, $2, CURRENT_TIMESTAMP, 'Single occurrence cancelled by admin')
      `, [scheduleId, user.userId])
    }

    await client.query('COMMIT')
    
    return successResponse({ 
      message: 'Schedule cancelled successfully',
      scheduleId: scheduleId
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Delete schedule error:', error)
    return errorResponse(500, 'Failed to delete schedule: ' + error.message)
  } finally {
    client.release()
  }
}
```

### 1.3 Mark Attendance Function

**BEFORE (Current Implementation):**
```javascript
async function markAttendance(event, user) {
  try {
    const scheduleId = parseInt(event.path.split('/')[3])
    const { status, date } = JSON.parse(event.body || '{}')

    if (!['completed', 'absent', 'absent_warned'].includes(status)) {
      return errorResponse(400, 'Invalid status')
    }

    // Check ownership for teachers
    const scheduleRes = await query('SELECT student_id, teacher_id, time_slot FROM student_schedules WHERE id = $1', [scheduleId])
    if (scheduleRes.rows.length === 0) return errorResponse(404, 'Schedule not found')
    if (user.role === 'teacher' && scheduleRes.rows[0].teacher_id !== user.teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const client = await getPool().connect()
    try {
      await client.query('BEGIN')

      await client.query(
        'UPDATE student_schedules SET attendance_status = $1, attendance_date = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [status, date, scheduleId]
      )

      const { student_id, time_slot } = scheduleRes.rows[0]

      if (status === 'completed') {
        // upsert student_lessons entry
        await client.query(
          'INSERT INTO student_lessons (student_id, lesson_date, time_slot) VALUES ($1, $2, $3) ON CONFLICT (student_id, lesson_date, time_slot) DO NOTHING',
          [student_id, date, time_slot]
        )
      } else {
        // remove from student_lessons if existed
        await client.query(
          'DELETE FROM student_lessons WHERE student_id = $1 AND lesson_date = $2 AND time_slot = $3',
          [student_id, date, time_slot]
        )
      }

      await client.query('COMMIT')
      return successResponse({ message: 'Attendance updated' })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Mark attendance error:', error)
    return errorResponse(500, 'Failed to mark attendance')
  }
}
```

**AFTER (Enhanced Implementation):**
```javascript
async function markAttendance(event, user) {
  const client = await getPool().connect()
  
  try {
    const scheduleId = parseInt(event.path.split('/')[3])
    const { status, date } = JSON.parse(event.body || '{}')

    if (!['completed', 'absent', 'absent_warned'].includes(status)) {
      return errorResponse(400, 'Invalid status')
    }

    await client.query('BEGIN')

    // Check permissions and get schedule details
    const scheduleCheck = await client.query(`
      SELECT teacher_id, student_id, time_slot, is_active, attendance_status
      FROM student_schedules WHERE id = $1
    `, [scheduleId])

    if (scheduleCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(404, 'Schedule not found')
    }

    const schedule = scheduleCheck.rows[0]

    // Teachers can only mark their own students' attendance
    if (user.role === 'teacher' && schedule.teacher_id !== user.teacherId) {
      await client.query('ROLLBACK')
      return errorResponse(403, 'Forbidden')
    }

    // Check if schedule is active
    if (!schedule.is_active) {
      await client.query('ROLLBACK')
      return errorResponse(400, 'Cannot mark attendance for inactive schedule')
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0]

    if (status === 'completed') {
      // Use database function for atomic completion
      try {
        await client.query('SELECT mark_schedule_completed($1, $2)', [scheduleId, user.userId])
      } catch (dbError) {
        await client.query('ROLLBACK')
        
        if (dbError.message.includes('is inactive')) {
          return errorResponse(400, 'Cannot complete inactive schedule')
        } else if (dbError.message.includes('not found')) {
          return errorResponse(404, 'Schedule not found')
        } else {
          throw dbError
        }
      }
    } else {
      // Safe update for absent/warned
      await client.query(`
        UPDATE student_schedules 
        SET attendance_status = $1, attendance_date = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [status, attendanceDate, scheduleId])

      // Log attendance change
      await client.query(`
        INSERT INTO schedule_history (schedule_id, action, old_teacher_id, new_teacher_id, changed_by, change_date, notes)
        VALUES ($1, 'updated', $2, $2, $3, CURRENT_TIMESTAMP, 'Attendance marked as $4')
      `, [scheduleId, schedule.teacher_id, user.userId, status])
    }

    await client.query('COMMIT')
    
    return successResponse({ 
      message: 'Attendance updated successfully',
      scheduleId: scheduleId
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Mark attendance error:', error)
    return errorResponse(500, 'Failed to mark attendance: ' + error.message)
  } finally {
    client.release()
  }
}
```

## 2. Rewrite `functions/attendance.js`

### 2.1 Get Attendance Function

**BEFORE (Current Implementation):**
```javascript
async function getAttendance(event, user) {
  try {
    const { teacher_id, student_id, status, date_from, date_to, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    let queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.attendance_status IN ('completed', 'absent', 'absent_warned')
        AND s.is_active = true
        AND t.is_active = true
    `
    // ... filters and pagination
}
```

**AFTER (Enhanced Implementation):**
```javascript
async function getAttendance(event, user) {
  try {
    const { teacher_id, student_id, status, date_from, date_to, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    let queryText = `
      SELECT 
        ss.id,
        ss.student_id,
        ss.teacher_id,
        ss.day_of_week,
        ss.time_slot,
        ss.week_start_date,
        ss.attendance_status,
        ss.attendance_date,
        ss.lesson_type,
        ss.is_active,
        s.name as student_name,
        t.name as teacher_name,
        schedule_lesson_date(ss.week_start_date, ss.day_of_week) as lesson_date,
        CASE ss.day_of_week
          WHEN 0 THEN 'Monday'
          WHEN 1 THEN 'Tuesday'
          WHEN 2 THEN 'Wednesday'
          WHEN 3 THEN 'Thursday'
          WHEN 4 THEN 'Friday'
          WHEN 5 THEN 'Saturday'
          WHEN 6 THEN 'Sunday'
        END as day_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.attendance_status IN ('completed', 'absent', 'absent_warned')
        AND s.is_active = true
        AND t.is_active = true
    `
    
    let params = []
    let paramCount = 0

    // Add filters
    if (teacher_id) {
      queryText += ` AND ss.teacher_id = $${++paramCount}`
      params.push(teacher_id)
    }

    if (student_id) {
      queryText += ` AND ss.student_id = $${++paramCount}`
      params.push(student_id)
    }

    if (status) {
      queryText += ` AND ss.attendance_status = $${++paramCount}`
      params.push(status)
    }

    if (date_from) {
      queryText += ` AND schedule_lesson_date(ss.week_start_date, ss.day_of_week) >= $${++paramCount}`
      params.push(date_from)
    }

    if (date_to) {
      queryText += ` AND schedule_lesson_date(ss.week_start_date, ss.day_of_week) <= $${++paramCount}`
      params.push(date_to)
    }

    // Permission check for teachers
    if (user.role === 'teacher') {
      queryText += ` AND ss.teacher_id = $${++paramCount}`
      params.push(user.teacherId)
    }

    queryText += ` ORDER BY ss.attendance_date DESC, ss.week_start_date, ss.day_of_week, ss.time_slot`
    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit || 50, offset)

    const result = await query(queryText, params)
    
    return successResponse({ 
      attendance: result.rows,
      total: result.rows.length,
      page: page || 1,
      limit: limit || 50
    })
  } catch (error) {
    console.error('Get attendance error:', error)
    return errorResponse(500, 'Failed to fetch attendance records')
  }
}
```

## 3. Rewrite `functions/students.js`

### 3.1 Get Student Schedule Function

**BEFORE (Current Implementation):**
```javascript
async function getStudentSchedule(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])
    
    // Permission check
    if (user.role === 'teacher') {
      const studentCheck = await query('SELECT teacher_id FROM students WHERE id = $1', [studentId])
      if (studentCheck.rows.length === 0 || studentCheck.rows[0].teacher_id !== user.teacherId) {
        return errorResponse(403, 'Forbidden')
      }
    }

    const queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.student_id = $1
      ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot
    `

    const result = await query(queryText, [studentId])
    return successResponse({ schedules: result.rows })
  } catch (error) {
    console.error('Get student schedule error:', error)
    return errorResponse(500, 'Failed to fetch student schedule')
  }
}
```

**AFTER (Enhanced Implementation):**
```javascript
async function getStudentSchedule(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])
    const { include_history = 'false' } = event.queryStringParameters || {}
    
    // Permission check
    if (user.role === 'teacher') {
      const studentCheck = await query('SELECT teacher_id FROM students WHERE id = $1', [studentId])
      if (studentCheck.rows.length === 0 || studentCheck.rows[0].teacher_id !== user.teacherId) {
        return errorResponse(403, 'Forbidden')
      }
    }

    let queryText = `
      SELECT 
        usv.id,
        usv.student_id,
        usv.teacher_id,
        usv.day_of_week,
        usv.time_slot,
        usv.week_start_date,
        usv.attendance_status,
        usv.lesson_type,
        usv.is_active,
        usv.student_name,
        usv.teacher_name,
        usv.lesson_date,
        usv.day_name
      FROM upcoming_schedule_view usv
      WHERE usv.student_id = $1
    `

    let params = [studentId]

    // If not including history, only show future/current schedules
    if (include_history !== 'true') {
      queryText += ` AND usv.week_start_date >= DATE_TRUNC('week', CURRENT_DATE)`
    }

    queryText += ` ORDER BY usv.week_start_date, usv.day_of_week, usv.time_slot`

    const result = await query(queryText, params)
    
    // Separate active and inactive schedules
    const activeSchedules = result.rows.filter(s => s.is_active)
    const inactiveSchedules = result.rows.filter(s => !s.is_active)
    
    return successResponse({ 
      schedules: result.rows,
      activeSchedules: activeSchedules,
      inactiveSchedules: inactiveSchedules,
      total: result.rows.length
    })
  } catch (error) {
    console.error('Get student schedule error:', error)
    return errorResponse(500, 'Failed to fetch student schedule')
  }
}
```

## 4. Rewrite `functions/teachers.js`

### 4.1 Get Teacher Schedule Function

**BEFORE (Current Implementation):**
```javascript
async function getTeacherSchedule(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    
    // Permission check
    if (user.role === 'teacher' && teacherId !== user.teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.teacher_id = $1
      ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot
    `

    const result = await query(queryText, [teacherId])
    return successResponse({ schedules: result.rows })
  } catch (error) {
    console.error('Get teacher schedule error:', error)
    return errorResponse(500, 'Failed to fetch teacher schedule')
  }
}
```

**AFTER (Enhanced Implementation):**
```javascript
async function getTeacherSchedule(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    const { week_start, include_history = 'false' } = event.queryStringParameters || {}
    
    // Permission check
    if (user.role === 'teacher' && teacherId !== user.teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    let queryText = `
      SELECT 
        usv.id,
        usv.student_id,
        usv.teacher_id,
        usv.day_of_week,
        usv.time_slot,
        usv.week_start_date,
        usv.attendance_status,
        usv.lesson_type,
        usv.is_active,
        usv.student_name,
        usv.teacher_name,
        usv.lesson_date,
        usv.day_name
      FROM upcoming_schedule_view usv
      WHERE usv.teacher_id = $1
    `

    let params = [teacherId]

    // Filter by week if specified
    if (week_start) {
      queryText += ` AND usv.week_start_date = $${++paramCount}`
      params.push(week_start)
    } else if (include_history !== 'true') {
      // Default to current and future weeks
      queryText += ` AND usv.week_start_date >= DATE_TRUNC('week', CURRENT_DATE)`
    }

    queryText += ` ORDER BY usv.week_start_date, usv.day_of_week, usv.time_slot`

    const result = await query(queryText, params)
    
    // Group by week for better organization
    const schedulesByWeek = result.rows.reduce((acc, schedule) => {
      const weekKey = schedule.week_start_date
      if (!acc[weekKey]) {
        acc[weekKey] = []
      }
      acc[weekKey].push(schedule)
      return acc
    }, {})
    
    return successResponse({ 
      schedules: result.rows,
      schedulesByWeek: schedulesByWeek,
      total: result.rows.length
    })
  } catch (error) {
    console.error('Get teacher schedule error:', error)
    return errorResponse(500, 'Failed to fetch teacher schedule')
  }
}
```

## Key Benefits of These Rewrites

### 1. **Data Integrity**
- All operations use database functions where appropriate
- Atomic operations prevent data corruption
- Comprehensive error handling

### 2. **Performance**
- Use of database views for optimized queries
- Proper indexing and query optimization
- Reduced database round trips

### 3. **Audit Trail**
- All changes logged in `schedule_history`
- Complete tracking of who made what changes when
- Better debugging and compliance

### 4. **User Experience**
- Clear distinction between active and inactive schedules
- Better error messages and status handling
- Consistent data structure across all endpoints

### 5. **Maintainability**
- Cleaner code with better separation of concerns
- Consistent error handling patterns
- Easier to test and debug

These rewrites maintain the existing API structure while providing significant improvements in data integrity, performance, and user experience.
