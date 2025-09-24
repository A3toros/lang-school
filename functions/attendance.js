require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders, getPool  } = require('./utils/database.js')

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  const { path } = event
  const method = event.httpMethod

  try {
    // Verify authentication for all routes
    let user
    try {
      user = verifyToken(event)
    } catch (error) {
      return errorResponse(401, 'Unauthorized')
    }

    // Route to appropriate handler
    if (path === '/api/attendance' && method === 'GET') {
      return await getAttendance(event, user)
    } else if (path === '/api/attendance/mark' && method === 'POST') {
      return await markAttendance(event, user)
    } else if (path.match(/^\/api\/attendance\/\d+$/) && method === 'PUT') {
      return await updateAttendance(event, user)
    } else if (path.match(/^\/api\/attendance\/teacher\/\d+$/) && method === 'GET') {
      return await getTeacherAttendance(event, user)
    } else if (path.match(/^\/api\/attendance\/student\/\d+$/) && method === 'GET') {
      return await getStudentAttendance(event, user)
    } else if (path === '/api/attendance/stats' && method === 'GET') {
      return await getAttendanceStats(event, user)
    } else if (path.match(/^\/api\/attendance\/week\/.+$/) && method === 'GET') {
      return await getWeeklyAttendance(event, user)
    } else if (path.match(/^\/api\/attendance\/month\/\d+\/\d+$/) && method === 'GET') {
      return await getMonthlyAttendance(event, user)
    } else if (path === '/api/attendance/bulk-mark' && method === 'POST') {
      return await bulkMarkAttendance(event, user)
    } else if (path === '/api/attendance/export' && method === 'GET') {
      return await exportAttendance(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Attendance API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// REWRITTEN getAttendance function - Use upcoming_schedule_view for active records
async function getAttendance(event, user) {
  try {
    const { teacher_id, student_id, status, date_from, date_to, page, limit, include_history = 'false' } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    let queryText
    let params = []
    let paramCount = 0

    // For future calendar queries, show only current and future weeks
    if (include_history !== 'true') {
      queryText = `
        SELECT 
          ss.id, s.id as student_id, s.name as student_name, 
          t.id as teacher_id, t.name as teacher_name,
          ss.day_of_week, ss.time_slot, ss.week_start_date::text,
          ss.attendance_status, ss.lesson_type,
          CASE WHEN ss.attendance_status = 'completed' THEN 'completed'
               WHEN ss.attendance_status = 'absent' THEN 'absent'
               WHEN ss.attendance_status = 'absent_warned' THEN 'absent_warned'
               ELSE 'scheduled'
          END as status
        FROM student_schedules ss
        JOIN students s ON ss.student_id = s.id
        JOIN teachers t ON ss.teacher_id = t.id
        WHERE ss.week_start_date >= get_current_week_start()
      `

      // Add filters for upcoming_schedule_view
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
        queryText += ` AND ss.week_start_date >= $${++paramCount}`
        params.push(date_from)
      }

      if (date_to) {
        queryText += ` AND ss.week_start_date <= $${++paramCount}`
        params.push(date_to)
      }

      // Filter by teacher if user is a teacher
      if (user.role === 'teacher') {
        queryText += ` AND ss.teacher_id = $${++paramCount}`
        params.push(user.teacherId)
      }

      queryText += ` ORDER BY ss.week_start_date DESC, ss.time_slot LIMIT $${++paramCount} OFFSET $${++paramCount}`
      params.push(limit, offset)
    } else {
      // For historical queries, use student_schedules with is_active filter
      queryText = `
        SELECT ss.*, s.name as student_name, t.name as teacher_name,
               CASE WHEN ss.attendance_status = 'completed' THEN 'completed'
                    WHEN ss.attendance_status = 'absent' THEN 'absent'
                    WHEN ss.attendance_status = 'absent_warned' THEN 'absent_warned'
                    ELSE 'scheduled'
               END as status
        FROM student_schedules ss
        JOIN students s ON ss.student_id = s.id
        JOIN teachers t ON ss.teacher_id = t.id
        WHERE s.is_active = true
          AND t.is_active = true
      `

      // Add filters for historical data
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
        queryText += ` AND ss.attendance_date >= $${++paramCount}`
        params.push(date_from)
      }

      if (date_to) {
        queryText += ` AND ss.attendance_date <= $${++paramCount}`
        params.push(date_to)
      }

      // Filter by teacher if user is a teacher
      if (user.role === 'teacher') {
        queryText += ` AND ss.teacher_id = $${++paramCount}`
        params.push(user.teacherId)
      }

      queryText += ` ORDER BY ss.attendance_date DESC, ss.time_slot LIMIT $${++paramCount} OFFSET $${++paramCount}`
      params.push(limit, offset)
    }

    const result = await query(queryText, params)
    return successResponse({ attendance: result.rows })
  } catch (error) {
    console.error('Get attendance error:', error)
    return errorResponse(500, 'Failed to fetch attendance records')
  }
}

// REWRITTEN markAttendance function - Use mark_schedule_completed for completion
async function markAttendance(event, user) {
  const client = await getPool().connect()
  
  try {
    const { schedule_id, status, attendance_date } = JSON.parse(event.body)

    if (!schedule_id || !status) {
      return errorResponse(400, 'schedule_id and status are required')
    }

    if (!['completed', 'absent', 'absent_warned', 'scheduled'].includes(status)) {
      return errorResponse(400, 'Invalid status. Must be completed, absent, absent_warned, or scheduled')
    }

    await client.query('BEGIN')

    // Check permissions and get schedule details
    const scheduleCheck = await client.query(
      'SELECT teacher_id, student_id, time_slot, is_active FROM student_schedules WHERE id = $1',
      [schedule_id]
    )

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

    const attendanceDate = attendance_date || new Date().toISOString().split('T')[0]

    if (status === 'completed') {
      // Use atomic database function for completion (idempotent)
      await client.query('SELECT mark_schedule_completed($1, $2)', [schedule_id, user.userId])
    } else {
      // Safe update for absent/warned (consistency trigger handles lesson_type)
      const queryText = `
        UPDATE student_schedules 
        SET attendance_status = $1, attendance_date = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND is_active = TRUE
        RETURNING *
      `
      
      const result = await client.query(queryText, [status, attendanceDate, schedule_id])
      
    }

    await client.query('COMMIT')
    return successResponse({ message: 'Attendance updated successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Mark attendance error:', error)
    return errorResponse(500, 'Failed to mark attendance')
  } finally {
    client.release()
  }
}

// Update attendance status
async function updateAttendance(event, user) {
  try {
    const attendanceId = parseInt(event.path.split('/')[3])
    const { status, attendance_date } = JSON.parse(event.body)

    if (!status) {
      return errorResponse(400, 'status is required')
    }

    if (!['completed', 'absent', 'absent_warned', 'scheduled'].includes(status)) {
      return errorResponse(400, 'Invalid status. Must be completed, absent, absent_warned, or scheduled')
    }

    // Check permissions
    const scheduleCheck = await query(
      'SELECT teacher_id, student_id FROM student_schedules WHERE id = $1',
      [attendanceId]
    )

    if (scheduleCheck.rows.length === 0) {
      return errorResponse(404, 'Attendance record not found')
    }

    const schedule = scheduleCheck.rows[0]

    // Teachers can only update their own students' attendance
    if (user.role === 'teacher' && schedule.teacher_id !== user.teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      UPDATE student_schedules 
      SET attendance_status = $1, attendance_date = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `
    
    const result = await query(queryText, [status, attendance_date, attendanceId])
    return successResponse({ attendance: result.rows[0] })
  } catch (error) {
    console.error('Update attendance error:', error)
    return errorResponse(500, 'Failed to update attendance')
  }
}

// Get teacher's attendance records
async function getTeacherAttendance(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[4])
    const { period } = event.queryStringParameters || {}

    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    let queryText = `
      SELECT ss.*, s.name as student_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      WHERE ss.teacher_id = $1 AND ss.attendance_status IN ('completed', 'absent', 'absent_warned')
        AND s.is_active = true
    `
    let params = [teacherId]

    if (period) {
      const [startDate, endDate] = period.split(',')
      queryText += ` AND ss.attendance_date BETWEEN $2 AND $3`
      params.push(startDate, endDate)
    }

    queryText += ` ORDER BY ss.attendance_date DESC, ss.time_slot`

    const result = await query(queryText, params)
    return successResponse({ attendance: result.rows })
  } catch (error) {
    console.error('Get teacher attendance error:', error)
    return errorResponse(500, 'Failed to fetch teacher attendance')
  }
}

// Get student's attendance records
async function getStudentAttendance(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[4])
    const { period } = event.queryStringParameters || {}

    // Check permissions
    if (user.role === 'teacher') {
      const studentCheck = await query(
        'SELECT teacher_id FROM students WHERE id = $1',
        [studentId]
      )
      
      if (studentCheck.rows.length === 0) {
        return errorResponse(404, 'Student not found')
      }
      
      if (studentCheck.rows[0].teacher_id !== user.teacherId) {
        return errorResponse(403, 'Forbidden')
      }
    }

    let queryText = `
      SELECT ss.*, t.name as teacher_name
      FROM student_schedules ss
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.student_id = $1 AND ss.attendance_status IN ('completed', 'absent', 'absent_warned')
    `
    let params = [studentId]

    if (period) {
      const [startDate, endDate] = period.split(',')
      queryText += ` AND ss.attendance_date BETWEEN $2 AND $3`
      params.push(startDate, endDate)
    }

    queryText += ` ORDER BY ss.attendance_date DESC, ss.time_slot`

    const result = await query(queryText, params)
    return successResponse({ attendance: result.rows })
  } catch (error) {
    console.error('Get student attendance error:', error)
    return errorResponse(500, 'Failed to fetch student attendance')
  }
}

// Get attendance statistics
async function getAttendanceStats(event, user) {
  try {
    const { teacher_id, student_id, period } = event.queryStringParameters || {}

    let queryText = `
      SELECT 
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as warned_lessons,
        COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END) as total_lessons
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE s.is_active = true AND t.is_active = true
    `
    let params = []
    let paramCount = 0

    if (teacher_id) {
      queryText += ` AND ss.teacher_id = $${++paramCount}`
      params.push(teacher_id)
    }

    if (student_id) {
      queryText += ` AND ss.student_id = $${++paramCount}`
      params.push(student_id)
    }

    if (period) {
      const [startDate, endDate] = period.split(',')
      queryText += ` AND ss.attendance_date BETWEEN $${++paramCount} AND $${++paramCount}`
      params.push(startDate, endDate)
    }

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND ss.teacher_id = $${++paramCount}`
      params.push(user.teacherId)
    }

    const result = await query(queryText, params)
    return successResponse({ stats: result.rows[0] })
  } catch (error) {
    console.error('Get attendance stats error:', error)
    return errorResponse(500, 'Failed to fetch attendance statistics')
  }
}

// Get weekly attendance
async function getWeeklyAttendance(event, user) {
  try {
    const date = event.path.split('/')[4]
    const weekStart = getWeekStart(date)

    let queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.week_start_date = $1 AND ss.attendance_status IN ('completed', 'absent', 'absent_warned')
        AND s.is_active = true AND t.is_active = true
    `
    let params = [weekStart]

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND ss.teacher_id = $2`
      params.push(user.teacherId)
    }

    queryText += ` ORDER BY ss.day_of_week, ss.time_slot`

    const result = await query(queryText, params)
    return successResponse({ 
      attendance: result.rows,
      week_start: weekStart,
      week_end: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
  } catch (error) {
    console.error('Get weekly attendance error:', error)
    return errorResponse(500, 'Failed to fetch weekly attendance')
  }
}

// Get monthly attendance
async function getMonthlyAttendance(event, user) {
  try {
    const year = parseInt(event.path.split('/')[4])
    const month = parseInt(event.path.split('/')[5])

    let queryText = `
      SELECT 
        DATE_TRUNC('day', ss.attendance_date) as date,
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent,
        COUNT(ss.id) as total
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE EXTRACT(YEAR FROM ss.attendance_date) = $1 
        AND EXTRACT(MONTH FROM ss.attendance_date) = $2
        AND ss.attendance_status IN ('completed', 'absent', 'absent_warned')
        AND s.is_active = true AND t.is_active = true
    `
    let params = [year, month]

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND ss.teacher_id = $3`
      params.push(user.teacherId)
    }

    queryText += ` GROUP BY DATE_TRUNC('day', ss.attendance_date) ORDER BY date`

    const result = await query(queryText, params)
    return successResponse({ attendance: result.rows })
  } catch (error) {
    console.error('Get monthly attendance error:', error)
    return errorResponse(500, 'Failed to fetch monthly attendance')
  }
}

// Bulk mark attendance
async function bulkMarkAttendance(event, user) {
  try {
    const { attendance_updates } = JSON.parse(event.body)

    if (!Array.isArray(attendance_updates)) {
      return errorResponse(400, 'attendance_updates must be an array')
    }

    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')

      for (const update of attendance_updates) {
        const { schedule_id, status, attendance_date } = update

        // Check permissions for each update
        const scheduleCheck = await client.query(
          'SELECT teacher_id FROM student_schedules WHERE id = $1',
          [schedule_id]
        )

        if (scheduleCheck.rows.length === 0) continue

        const schedule = scheduleCheck.rows[0]

        // Teachers can only update their own students' attendance
        if (user.role === 'teacher' && schedule.teacher_id !== user.teacherId) {
          continue
        }

        await client.query(
          'UPDATE student_schedules SET attendance_status = $1, attendance_date = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [status, attendance_date || new Date().toISOString().split('T')[0], schedule_id]
        )
      }

      await client.query('COMMIT')
      return successResponse({ message: 'Attendance updated successfully' })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Bulk mark attendance error:', error)
    return errorResponse(500, 'Failed to update attendance')
  }
}

// Export attendance data
async function exportAttendance(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { period } = event.queryStringParameters || {}

    let queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.attendance_status IN ('completed', 'absent', 'absent_warned')
        AND s.is_active = true AND t.is_active = true
    `
    let params = []

    if (period) {
      const [startDate, endDate] = period.split(',')
      queryText += ` AND ss.attendance_date BETWEEN $1 AND $2`
      params.push(startDate, endDate)
    }

    queryText += ` ORDER BY ss.attendance_date DESC, ss.time_slot`

    const result = await query(queryText, params)
    return successResponse({ attendance: result.rows })
  } catch (error) {
    console.error('Export attendance error:', error)
    return errorResponse(500, 'Failed to export attendance data')
  }
}
