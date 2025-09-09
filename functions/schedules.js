const { verifyToken, errorResponse, successResponse, query, getCurrentWeekStart, getWeekStart } = require('./utils/database')

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: require('./utils/database').corsHeaders,
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
    if (path === '/api/schedules' && method === 'GET') {
      return await getSchedules(event, user)
    } else if (path.match(/^\/api\/schedules\/week\/.+$/) && method === 'GET') {
      return await getWeeklySchedule(event, user)
    } else if (path === '/api/schedules' && method === 'POST') {
      return await createSchedule(event, user)
    } else if (path.match(/^\/api\/schedules\/\d+$/) && method === 'PUT') {
      return await updateSchedule(event, user)
    } else if (path.match(/^\/api\/schedules\/\d+$/) && method === 'DELETE') {
      return await deleteSchedule(event, user)
    } else if (path === '/api/schedules/bulk' && method === 'POST') {
      return await bulkUpdateSchedules(event, user)
    } else if (path === '/api/schedules/conflicts' && method === 'GET') {
      return await getScheduleConflicts(event, user)
    } else if (path.match(/^\/api\/schedules\/teacher\/\d+$/) && method === 'GET') {
      return await getTeacherSchedules(event, user)
    } else if (path.match(/^\/api\/schedules\/student\/\d+$/) && method === 'GET') {
      return await getStudentSchedules(event, user)
    } else if (path.match(/^\/api\/schedules\/month\/\d+\/\d+$/) && method === 'GET') {
      return await getMonthlySchedules(event, user)
    } else if (path === '/api/schedules/save-week' && method === 'POST') {
      return await saveWeekSchedule(event, user)
    } else if (path === '/api/schedules/discard-changes' && method === 'POST') {
      return await discardChanges(event, user)
    } else if (path === '/api/schedules/available-slots' && method === 'GET') {
      return await getAvailableSlots(event, user)
    } else if (path === '/api/schedules/reassign-student' && method === 'POST') {
      return await reassignStudent(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Schedules API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get schedules with filters
async function getSchedules(event, user) {
  try {
    const { teacher_id, student_id, week_start, day_of_week, time_slot } = event.queryStringParameters || {}

    let queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE s.is_active = true AND t.is_active = true
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

    if (week_start) {
      queryText += ` AND ss.week_start_date = $${++paramCount}`
      params.push(week_start)
    }

    if (day_of_week) {
      queryText += ` AND ss.day_of_week = $${++paramCount}`
      params.push(day_of_week)
    }

    if (time_slot) {
      queryText += ` AND ss.time_slot = $${++paramCount}`
      params.push(time_slot)
    }

    queryText += ` ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot`

    const result = await query(queryText, params)
    return successResponse({ schedules: result.rows })
  } catch (error) {
    console.error('Get schedules error:', error)
    return errorResponse(500, 'Failed to fetch schedules')
  }
}

// Get weekly schedule
async function getWeeklySchedule(event, user) {
  try {
    const date = event.path.split('/')[4]
    const weekStart = getWeekStart(date)

    let queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.week_start_date = $1 AND s.is_active = true AND t.is_active = true
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
      schedules: result.rows,
      week_start: weekStart,
      week_end: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
  } catch (error) {
    console.error('Get weekly schedule error:', error)
    return errorResponse(500, 'Failed to fetch weekly schedule')
  }
}

// Create schedule entry
async function createSchedule(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { student_id, teacher_id, day_of_week, time_slot, week_start_date } = JSON.parse(event.body)

    if (!student_id || !teacher_id || day_of_week === undefined || !time_slot || !week_start_date) {
      return errorResponse(400, 'Missing required fields')
    }

    // Check for conflicts
    const conflictCheck = await query(
      `SELECT id FROM student_schedules 
       WHERE teacher_id = $1 AND day_of_week = $2 AND time_slot = $3 AND week_start_date = $4`,
      [teacher_id, day_of_week, time_slot, week_start_date]
    )

    if (conflictCheck.rows.length > 0) {
      return errorResponse(400, 'Time slot conflict detected')
    }

    const queryText = `
      INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    
    const result = await query(queryText, [student_id, teacher_id, day_of_week, time_slot, week_start_date])
    return successResponse({ schedule: result.rows[0] }, 201)
  } catch (error) {
    console.error('Create schedule error:', error)
    return errorResponse(500, 'Failed to create schedule')
  }
}

// Update schedule entry
async function updateSchedule(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const scheduleId = parseInt(event.path.split('/')[3])
    const { student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status } = JSON.parse(event.body)

    const queryText = `
      UPDATE student_schedules 
      SET student_id = $1, teacher_id = $2, day_of_week = $3, time_slot = $4, 
          week_start_date = $5, attendance_status = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `
    
    const result = await query(queryText, [student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status, scheduleId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Schedule not found')
    }

    return successResponse({ schedule: result.rows[0] })
  } catch (error) {
    console.error('Update schedule error:', error)
    return errorResponse(500, 'Failed to update schedule')
  }
}

// Delete schedule entry
async function deleteSchedule(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const scheduleId = parseInt(event.path.split('/')[3])
    await query('DELETE FROM student_schedules WHERE id = $1', [scheduleId])
    return successResponse({ message: 'Schedule deleted successfully' })
  } catch (error) {
    console.error('Delete schedule error:', error)
    return errorResponse(500, 'Failed to delete schedule')
  }
}

// Bulk update schedules
async function bulkUpdateSchedules(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { schedules } = JSON.parse(event.body)

    if (!Array.isArray(schedules)) {
      return errorResponse(400, 'Schedules must be an array')
    }

    const client = await require('./utils/database').getPool().connect()
    
    try {
      await client.query('BEGIN')

      for (const schedule of schedules) {
        const { id, student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status } = schedule

        if (id) {
          // Update existing schedule
          await client.query(
            `UPDATE student_schedules 
             SET student_id = $1, teacher_id = $2, day_of_week = $3, time_slot = $4, 
                 week_start_date = $5, attendance_status = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7`,
            [student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status, id]
          )
        } else {
          // Create new schedule
          await client.query(
            `INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status || 'scheduled']
          )
        }
      }

      await client.query('COMMIT')
      return successResponse({ message: 'Schedules updated successfully' })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Bulk update schedules error:', error)
    return errorResponse(500, 'Failed to update schedules')
  }
}

// Check for schedule conflicts
async function getScheduleConflicts(event, user) {
  try {
    const { week_start } = event.queryStringParameters || {}
    const weekStart = week_start || getCurrentWeekStart()

    const queryText = `
      SELECT ss1.id as schedule1_id, ss2.id as schedule2_id,
             s1.name as student1_name, s2.name as student2_name,
             t.name as teacher_name, ss1.day_of_week, ss1.time_slot
      FROM student_schedules ss1
      JOIN student_schedules ss2 ON ss1.teacher_id = ss2.teacher_id 
        AND ss1.day_of_week = ss2.day_of_week 
        AND ss1.time_slot = ss2.time_slot
        AND ss1.week_start_date = ss2.week_start_date
        AND ss1.id != ss2.id
      JOIN students s1 ON ss1.student_id = s1.id
      JOIN students s2 ON ss2.student_id = s2.id
      JOIN teachers t ON ss1.teacher_id = t.id
      WHERE ss1.week_start_date = $1
    `
    
    const result = await query(queryText, [weekStart])
    return successResponse({ conflicts: result.rows })
  } catch (error) {
    console.error('Get schedule conflicts error:', error)
    return errorResponse(500, 'Failed to check conflicts')
  }
}

// Get teacher's schedules
async function getTeacherSchedules(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[4])
    const { week_start } = event.queryStringParameters || {}

    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const weekStart = week_start || getCurrentWeekStart()

    const queryText = `
      SELECT ss.*, s.name as student_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      WHERE ss.teacher_id = $1 AND ss.week_start_date = $2 AND s.is_active = true
      ORDER BY ss.day_of_week, ss.time_slot
    `
    
    const result = await query(queryText, [teacherId, weekStart])
    return successResponse({ schedules: result.rows })
  } catch (error) {
    console.error('Get teacher schedules error:', error)
    return errorResponse(500, 'Failed to fetch teacher schedules')
  }
}

// Get student's schedules
async function getStudentSchedules(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[4])
    const { week_start } = event.queryStringParameters || {}

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

    const weekStart = week_start || getCurrentWeekStart()

    const queryText = `
      SELECT ss.*, t.name as teacher_name
      FROM student_schedules ss
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.student_id = $1 AND ss.week_start_date = $2
      ORDER BY ss.day_of_week, ss.time_slot
    `
    
    const result = await query(queryText, [studentId, weekStart])
    return successResponse({ schedules: result.rows })
  } catch (error) {
    console.error('Get student schedules error:', error)
    return errorResponse(500, 'Failed to fetch student schedules')
  }
}

// Get monthly schedules
async function getMonthlySchedules(event, user) {
  try {
    const year = parseInt(event.path.split('/')[4])
    const month = parseInt(event.path.split('/')[5])

    let queryText = `
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE EXTRACT(YEAR FROM ss.week_start_date) = $1 
        AND EXTRACT(MONTH FROM ss.week_start_date) = $2
        AND s.is_active = true AND t.is_active = true
    `
    let params = [year, month]

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND ss.teacher_id = $3`
      params.push(user.teacherId)
    }

    queryText += ` ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot`

    const result = await query(queryText, params)
    return successResponse({ schedules: result.rows })
  } catch (error) {
    console.error('Get monthly schedules error:', error)
    return errorResponse(500, 'Failed to fetch monthly schedules')
  }
}

// Save entire week schedule
async function saveWeekSchedule(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { week_start_date, schedules } = JSON.parse(event.body)

    if (!week_start_date || !Array.isArray(schedules)) {
      return errorResponse(400, 'week_start_date and schedules array are required')
    }

    const client = await require('./utils/database').getPool().connect()
    
    try {
      await client.query('BEGIN')

      // Delete existing schedules for the week
      await client.query('DELETE FROM student_schedules WHERE week_start_date = $1', [week_start_date])

      // Insert new schedules
      for (const schedule of schedules) {
        const { student_id, teacher_id, day_of_week, time_slot, attendance_status } = schedule
        
        await client.query(
          `INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status || 'scheduled']
        )
      }

      await client.query('COMMIT')
      return successResponse({ message: 'Week schedule saved successfully' })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Save week schedule error:', error)
    return errorResponse(500, 'Failed to save week schedule')
  }
}

// Discard changes (placeholder - in real app this would restore from backup)
async function discardChanges(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    // In a real application, this would restore from a backup or revert changes
    return successResponse({ message: 'Changes discarded successfully' })
  } catch (error) {
    console.error('Discard changes error:', error)
    return errorResponse(500, 'Failed to discard changes')
  }
}

// Get available time slots
async function getAvailableSlots(event, user) {
  try {
    const { teacher_id, day_of_week, week_start_date } = event.queryStringParameters || {}

    if (!teacher_id || day_of_week === undefined || !week_start_date) {
      return errorResponse(400, 'teacher_id, day_of_week, and week_start_date are required')
    }

    // Get all possible time slots
    const timeSlots = [
      '6:30-7:00', '7:00-7:30', '7:30-8:00', '8:00-8:30', '8:30-9:00',
      '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00', '11:00-11:30',
      '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
      '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30',
      '16:30-17:00', '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00',
      '19:00-19:30', '19:30-20:00', '20:00-20:30', '20:30-21:00', '21:00-21:30',
      '21:30-22:00'
    ]

    // Get occupied time slots
    const occupiedQuery = `
      SELECT time_slot FROM student_schedules 
      WHERE teacher_id = $1 AND day_of_week = $2 AND week_start_date = $3
    `
    
    const occupiedResult = await query(occupiedQuery, [teacher_id, day_of_week, week_start_date])
    const occupiedSlots = occupiedResult.rows.map(row => row.time_slot)

    // Filter available slots
    const availableSlots = timeSlots.filter(slot => !occupiedSlots.includes(slot))

    return successResponse({ available_slots: availableSlots })
  } catch (error) {
    console.error('Get available slots error:', error)
    return errorResponse(500, 'Failed to fetch available slots')
  }
}

// Reassign student in schedule
async function reassignStudent(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { student_id, new_teacher_id, schedule_ids } = JSON.parse(event.body)

    if (!student_id || !new_teacher_id || !Array.isArray(schedule_ids)) {
      return errorResponse(400, 'student_id, new_teacher_id, and schedule_ids array are required')
    }

    // Update all specified schedule entries
    await query(
      'UPDATE student_schedules SET teacher_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)',
      [new_teacher_id, schedule_ids]
    )

    return successResponse({ message: 'Student reassigned successfully' })
  } catch (error) {
    console.error('Reassign student error:', error)
    return errorResponse(500, 'Failed to reassign student')
  }
}
