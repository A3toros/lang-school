require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders  } = require('./utils/database.js')
const { getPool } = require('./utils/database.js')
const crypto = require('crypto')

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
    } else if (path === '/api/schedules/extend' && method === 'POST') {
      return await extendSchedules(event, user)
    } else if (path === '/api/schedules/extension-reminder' && method === 'POST') {
      return await checkExtensionReminder(event, user)
    } else if (path === '/api/schedules/reassign-student' && method === 'POST') {
      return await reassignStudent(event, user)
    } else if (path.match(/^\/api\/schedules\/\d+\/attendance$/) && method === 'POST') {
      return await getStudentAttendanceAnalytics(event, user)
    } else if (path.match(/^\/api\/analytics\/teachers\/\d+\/attendance$/) && method === 'GET') {
      return await getTeacherAttendanceAnalytics(event, user)
    } else if (path === '/api/analytics/teachers/me/attendance' && method === 'GET') {
      return await getMyTeacherAttendanceAnalytics(event, user)
    } else if (path === '/api/schedule-templates' && method === 'POST') {
      return await createScheduleTemplate(event, user)
    } else if (path === '/api/schedule-templates' && method === 'GET') {
      return await listScheduleTemplates(event, user)
    } else if (path === '/api/schedules/generate-recurring' && method === 'POST') {
      return await generateRecurringFromTemplates(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Schedules API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get schedules with filters - REWRITTEN to use is_active flag and upcoming_schedule_view
async function getSchedules(event, user) {
  try {
    const { teacher_id, student_id, week_start, day_of_week, time_slot, include_history = 'false' } = event.queryStringParameters || {}

    let queryText
    let params = []
    let paramCount = 0

    // For future calendar queries, show only current and future weeks
    if (include_history !== 'true') {
      queryText = `
        SELECT ss.id, s.id as student_id, s.name as student_name, 
               t.id as teacher_id, t.name as teacher_name,
               ss.day_of_week, ss.time_slot, ss.week_start_date,
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

      // Add filters for student_schedules
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
        WHERE s.is_active = true AND t.is_active = true
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
    }

    const result = await query(queryText, params)

    // ETag based on max(updated_at) and row count
    const count = result.rows.length
    let maxUpdated = 'epoch'
    for (const r of result.rows) {
      const u = r.updated_at || r.updatedAt || r.updated || null
      if (u && String(u) > String(maxUpdated)) maxUpdated = String(u)
    }
    const etag = crypto.createHash('sha1').update(`${maxUpdated}|${count}`).digest('hex')
    const ifNoneMatch = event.headers['if-none-match'] || event.headers['If-None-Match']
    const headers = { ...corsHeaders, ETag: etag }
    if (ifNoneMatch && ifNoneMatch === etag) {
      return { statusCode: 304, headers, body: '' }
    }

    return successResponse({ schedules: result.rows }, 200, headers)
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

// REWRITTEN createSchedule function - Template-based approach with trigger
async function createSchedule(event, user) {
  const client = await getPool().connect()
  
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { student_id, teacher_id, day_of_week, time_slot, week_start_date, end_date } = JSON.parse(event.body)

    console.log('🔍 [CREATE_SCHEDULE] Received data:', {
      student_id,
      teacher_id,
      day_of_week,
      time_slot,
      week_start_date,
      end_date
    })

    if (!student_id || !teacher_id || day_of_week === undefined || !time_slot || !week_start_date) {
      return errorResponse(400, 'Missing required fields')
    }

    await client.query('BEGIN')

    // 1. Validate student and teacher exist and are active
    const studentQuery = await client.query('SELECT id FROM students WHERE id = $1 AND is_active = true', [student_id])
    if (studentQuery.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(404, 'Student not found or inactive')
    }

    const teacherQuery = await client.query('SELECT id FROM teachers WHERE id = $1 AND is_active = true', [teacher_id])
    if (teacherQuery.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(404, 'Teacher not found or inactive')
    }

    // 2. Check for conflicts
    await checkSchedulingConflicts(client, student_id, teacher_id, day_of_week, time_slot, week_start_date, 1)

    // 3. Create or update schedule template (trigger automatically creates 12 weeks of occurrences)
    console.log('🔍 [CREATE_SCHEDULE] Creating template with:', {
      student_id,
      teacher_id,
      day_of_week,
      time_slot,
      week_start_date,
      end_date: end_date || null
    })
    
    const templateResult = await client.query(`
      INSERT INTO schedule_templates (
        student_id, teacher_id, day_of_week, time_slot, 
        lessons_per_week, start_date, end_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      ON CONFLICT (student_id, teacher_id, day_of_week, time_slot, start_date)
      DO UPDATE SET 
        lessons_per_week = EXCLUDED.lessons_per_week,
        end_date = EXCLUDED.end_date,
        is_active = TRUE,  -- Always set to TRUE, not EXCLUDED.is_active
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [student_id, teacher_id, day_of_week, time_slot, 1, week_start_date, end_date || null])

    console.log('🔍 [CREATE_SCHEDULE] Template created/updated:', templateResult.rows[0])

    // 4. Get generated occurrences from the trigger (or create them if updating existing template)
    let occurrences = await client.query(`
      SELECT * FROM student_schedules WHERE template_id = $1
    `, [templateResult.rows[0].id])

    console.log('🔍 [CREATE_SCHEDULE] Initial occurrences found:', occurrences.rows.length)

    // If no occurrences exist (template was updated, not inserted), create them
    if (occurrences.rows.length === 0) {
      console.log('🔍 [CREATE_SCHEDULE] No occurrences found, creating them...')
      console.log('🔍 [CREATE_SCHEDULE] Using week_start_date for occurrence creation:', week_start_date)
      
      // Create a single occurrence for the specific week instead of using the template function
      const occurrenceResult = await client.query(`
        INSERT INTO student_schedules (
          student_id, teacher_id, day_of_week, time_slot, week_start_date,
          is_recurring, end_date, original_teacher_id, template_id,
          lesson_type, attendance_status, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        student_id, teacher_id, day_of_week, time_slot, week_start_date,
        true, end_date || null, teacher_id, templateResult.rows[0].id,
        'scheduled', 'scheduled', true, new Date(), new Date()
      ])
      
      console.log('🔍 [CREATE_SCHEDULE] Created single occurrence:', occurrenceResult.rows[0])
      occurrences = { rows: occurrenceResult.rows }
    }

    console.log('🔍 [CREATE_SCHEDULE] Final occurrences:', occurrences.rows.map(occ => ({
      id: occ.id,
      week_start_date: occ.week_start_date,
      day_of_week: occ.day_of_week,
      time_slot: occ.time_slot
    })))

    // 5. Log in schedule_history
    try {
      for (const schedule of occurrences.rows) {
        await client.query(
          `INSERT INTO schedule_history (schedule_id, action, old_teacher_id, new_teacher_id, changed_by, notes)
           VALUES ($1, 'created', NULL, $2, $3, 'Created via template-based approach')`,
          [schedule.id, teacher_id, user.userId]
        )
      }
    } catch (e) {
      // history table may not exist yet; ignore
    }

    await client.query('COMMIT')
    return successResponse({ 
      template: templateResult.rows[0],
      occurrences: occurrences.rows,
      total_lessons: occurrences.rows.length
    }, 201)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Create schedule error:', error)
    
    // Check for specific conflict errors and return user-friendly messages
    if (error.message.includes('Student already has a lesson at this time slot')) {
      return errorResponse(400, 'Student already has a lesson at this time slot')
    } else if (error.message.includes('Teacher is already booked at this time')) {
      return errorResponse(400, 'Teacher is already booked at this time')
    } else if (error.message.includes('Student is assigned to another teacher')) {
      return errorResponse(400, 'This student is already assigned to another teacher')
    } else if (error.message.includes('Student not found')) {
      return errorResponse(404, 'Student not found. Please refresh and try again')
    } else if (error.message.includes('Conflict')) {
      return errorResponse(400, 'There is a scheduling conflict. Please choose a different time slot')
    } else {
      return errorResponse(500, 'Failed to create schedule: ' + error.message)
    }
  } finally {
    client.release()
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



// Student analytics (date range, bucket=week|month)
async function getStudentAttendanceAnalytics(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[4])
    const { from, to, bucket = 'week' } = event.queryStringParameters || {}
    if (!from || !to) return errorResponse(400, 'from and to are required')

    // Teachers can only access their own students
    if (user.role === 'teacher') {
      const res = await query('SELECT teacher_id FROM students WHERE id = $1', [studentId])
      if (res.rows.length === 0) return errorResponse(404, 'Student not found')
      if (res.rows[0].teacher_id !== user.teacherId) return errorResponse(403, 'Forbidden')
    }

    const sql = `
      SELECT 
        date_trunc($1::text, attendance_date) AS bucket,
        COUNT(*) FILTER (WHERE attendance_status='completed') AS completed,
        COUNT(*) FILTER (WHERE attendance_status='absent') AS absent,
        COUNT(*) FILTER (WHERE attendance_status='absent_warned') AS warned,
        COUNT(*) FILTER (WHERE attendance_status IN ('completed','absent','absent_warned')) AS total
      FROM student_schedules
      WHERE student_id = $2
        AND attendance_date BETWEEN $3 AND $4
      GROUP BY 1
      ORDER BY 1;
    `
    const result = await query(sql, [bucket, studentId, from, to])
    return successResponse({ data: result.rows })
  } catch (error) {
    console.error('Student analytics error:', error)
    return errorResponse(500, 'Failed to fetch analytics')
  }
}

// Teacher analytics by teacherId (admin)
async function getTeacherAttendanceAnalytics(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[4])
    const { from, to, bucket = 'week' } = event.queryStringParameters || {}
    if (user.role !== 'admin') return errorResponse(403, 'Forbidden')
    if (!from || !to) return errorResponse(400, 'from and to are required')

    const sql = `
      SELECT 
        date_trunc($1::text, attendance_date) AS bucket,
        COUNT(*) FILTER (WHERE attendance_status='completed') AS completed,
        COUNT(*) FILTER (WHERE attendance_status='absent') AS absent,
        COUNT(*) FILTER (WHERE attendance_status='absent_warned') AS warned,
        COUNT(*) FILTER (WHERE attendance_status IN ('completed','absent','absent_warned')) AS total
      FROM student_schedules
      WHERE teacher_id = $2
        AND attendance_date BETWEEN $3 AND $4
      GROUP BY 1
      ORDER BY 1;
    `
    const result = await query(sql, [bucket, teacherId, from, to])
    return successResponse({ data: result.rows })
  } catch (error) {
    console.error('Teacher analytics error:', error)
    return errorResponse(500, 'Failed to fetch analytics')
  }
}

// Teacher self analytics (from JWT)
async function getMyTeacherAttendanceAnalytics(event, user) {
  try {
    if (user.role !== 'teacher') return errorResponse(403, 'Forbidden')
    const { from, to, bucket = 'week' } = event.queryStringParameters || {}
    if (!from || !to) return errorResponse(400, 'from and to are required')

    const sql = `
      SELECT 
        date_trunc($1::text, attendance_date) AS bucket,
        COUNT(*) FILTER (WHERE attendance_status='completed') AS completed,
        COUNT(*) FILTER (WHERE attendance_status='absent') AS absent,
        COUNT(*) FILTER (WHERE attendance_status='absent_warned') AS warned,
        COUNT(*) FILTER (WHERE attendance_status IN ('completed','absent','absent_warned')) AS total
      FROM student_schedules
      WHERE teacher_id = $2
        AND attendance_date BETWEEN $3 AND $4
      GROUP BY 1
      ORDER BY 1;
    `
    const result = await query(sql, [bucket, user.teacherId, from, to])
    return successResponse({ data: result.rows })
  } catch (error) {
    console.error('My teacher analytics error:', error)
    return errorResponse(500, 'Failed to fetch analytics')
  }
}
// Helper function to create multiple lessons
async function createMultipleLessons(client, studentId, teacherId, dayOfWeek, timeSlot, weekStart, lessonsPerWeek) {
  const createdSchedules = []
  
  try {
    if (lessonsPerWeek === 1) {
      // Single lesson - current logic
      const schedule = await createSingleLesson(client, studentId, teacherId, dayOfWeek, timeSlot, weekStart)
      createdSchedules.push(schedule)
    } else if (lessonsPerWeek <= 3) {
      // 2-3 lessons: sequential time slots on same day
      const timeSlots = await getSequentialTimeSlots(client, timeSlot, lessonsPerWeek)
      console.log('🔍 [CREATE_MULTIPLE] Time slots:', timeSlots)
      
      if (!timeSlots || timeSlots.length === 0) {
        throw new Error('No time slots available for sequential scheduling')
      }
      
      for (let i = 0; i < lessonsPerWeek; i++) {
        if (timeSlots[i]) {
          const schedule = await createSingleLesson(client, studentId, teacherId, dayOfWeek, timeSlots[i], weekStart)
          createdSchedules.push(schedule)
        }
      }
    } else if (lessonsPerWeek <= 7) {
      // 4-7 lessons: spread across 2-3 days
      const distribution = await getSpreadDistribution(client, dayOfWeek, lessonsPerWeek)
      console.log('🔍 [CREATE_MULTIPLE] Distribution:', distribution)
      
      if (!distribution || distribution.length === 0) {
        throw new Error('No distribution available for spread scheduling')
      }
      
      for (const { day, time } of distribution) {
        const schedule = await createSingleLesson(client, studentId, teacherId, day, time, weekStart)
        createdSchedules.push(schedule)
      }
    } else {
      // 8+ lessons: intensive schedule across multiple days
      const distribution = await getIntensiveDistribution(client, dayOfWeek, lessonsPerWeek)
      console.log('🔍 [CREATE_MULTIPLE] Intensive distribution:', distribution)
      
      if (!distribution || distribution.length === 0) {
        throw new Error('No distribution available for intensive scheduling')
      }
      
      for (const { day, time } of distribution) {
        const schedule = await createSingleLesson(client, studentId, teacherId, day, time, weekStart)
        createdSchedules.push(schedule)
      }
    }
  } catch (error) {
    console.error('❌ [CREATE_MULTIPLE] Error creating multiple lessons:', error)
    throw error
  }
  
  return createdSchedules
}

// Create a single lesson entry
async function createSingleLesson(client, studentId, teacherId, dayOfWeek, timeSlot, weekStart) {
  // Ensure weekStart is a Monday by using database function
  const weekStartResult = await client.query(
    'SELECT get_week_start($1) as monday_week_start',
    [weekStart]
  )
  const mondayWeekStart = weekStartResult.rows[0].monday_week_start

  // Auto-create student-teacher relationship if it doesn't exist
  const relationshipCheck = await client.query(`
    SELECT EXISTS(
      SELECT 1 FROM student_teachers 
      WHERE student_id = $1 AND teacher_id = $2 AND is_active = true
    ) as exists
  `, [studentId, teacherId])
  
  if (!relationshipCheck.rows[0].exists) {
    await client.query(`
      INSERT INTO student_teachers (student_id, teacher_id, assigned_by, assigned_date, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_DATE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (student_id, teacher_id) DO UPDATE
        SET is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP
    `, [studentId, teacherId, user.id])
  }

  const scheduleQuery = `
    INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date, lesson_type)
    VALUES ($1, $2, $3, $4, $5, 'scheduled')
    RETURNING *
  `
  
  const result = await client.query(scheduleQuery, [
    studentId, teacherId, dayOfWeek, timeSlot, mondayWeekStart
  ])
  
  return result.rows[0]
}

// Get sequential time slots (6:30, 7:00, 7:30)
async function getSequentialTimeSlots(client, startTimeSlot, count) {
  const timeSlots = await client.query(
    'SELECT time_slot FROM time_slots WHERE is_active = true ORDER BY time_slot'
  )
  
  const startIndex = timeSlots.rows.findIndex(ts => ts.time_slot === startTimeSlot)
  const sequentialSlots = []
  
  for (let i = 0; i < count; i++) {
    const index = startIndex + i
    if (index < timeSlots.rows.length) {
      sequentialSlots.push(timeSlots.rows[index].time_slot)
    }
  }
  
  return sequentialSlots
}

// Get spread distribution across days
async function getSpreadDistribution(client, startDay, lessonsPerWeek) {
  const days = [0, 1, 2, 3, 4, 5, 6] // Monday to Sunday
  const startIndex = days.indexOf(startDay)
  const distribution = []
  
  for (let i = 0; i < lessonsPerWeek; i++) {
    const dayIndex = (startIndex + i) % 7
    const day = days[dayIndex]
    const timeSlot = '6:30-7:00' // Default time slot
    distribution.push({ day, time: timeSlot })
  }
  
  return distribution
}

// Get intensive distribution for 8+ lessons
async function getIntensiveDistribution(client, startDay, lessonsPerWeek) {
  const days = [0, 1, 2, 3, 4, 5, 6] // Monday to Sunday
  const timeSlots = ['6:30-7:00', '7:00-7:30', '7:30-8:00', '8:00-8:30']
  const distribution = []
  
  let lessonCount = 0
  let dayIndex = days.indexOf(startDay)
  
  while (lessonCount < lessonsPerWeek) {
    const day = days[dayIndex % 7]
    const timeSlot = timeSlots[lessonCount % timeSlots.length]
    distribution.push({ day, time: timeSlot })
    
    lessonCount++
    if (lessonCount % 4 === 0) {
      dayIndex++ // Move to next day after 4 lessons
    }
  }
  
  return distribution
}

// Enhanced conflict detection using application-level validation
async function checkSchedulingConflicts(client, studentId, teacherId, dayOfWeek, timeSlot, weekStart, lessonsPerWeek) {
  // 1. Check if student already has lessons this week
  const existingLessons = await client.query(
    'SELECT COUNT(*) FROM student_schedules WHERE student_id = $1 AND week_start_date = $2',
    [studentId, weekStart]
  )
  
  const existingCount = parseInt(existingLessons.rows[0].count)
  console.log('🔍 [CONFLICT_CHECK] Existing lessons this week:', existingCount, 'Requested:', lessonsPerWeek)
  
  // 2. Note: Removed lessons_per_week validation - allow unlimited scheduling
  console.log('🔍 [CONFLICT_CHECK] Skipping lessons_per_week validation - allowing unlimited scheduling')
  
  // 3. Check for teacher double-booking
  await validateNoDoubleBooking(client, teacherId, dayOfWeek, timeSlot, weekStart)
  
  // 4. Check for time slot conflicts in the same week
  const timeSlotConflicts = await client.query(
    'SELECT COUNT(*) FROM student_schedules WHERE student_id = $1 AND day_of_week = $2 AND time_slot = $3 AND week_start_date = $4',
    [studentId, dayOfWeek, timeSlot, weekStart]
  )
  
  if (parseInt(timeSlotConflicts.rows[0].count) > 0) {
    throw new Error('Student already has a lesson at this time slot')
  }
}

// Note: validateLessonsPerWeek function removed - no more lesson limits

// Helper function to validate no double-booking
async function validateNoDoubleBooking(client, teacherId, dayOfWeek, timeSlot, weekStart) {
  const conflict = await client.query(
    'SELECT COUNT(*) FROM student_schedules WHERE teacher_id = $1 AND day_of_week = $2 AND time_slot = $3 AND week_start_date = $4',
    [teacherId, dayOfWeek, timeSlot, weekStart]
  )
  
  if (parseInt(conflict.rows[0].count) > 0) {
    throw new Error('Teacher is already booked at this time')
  }
}

// Create or update schedule template (internal function)
async function createScheduleTemplateInternal(client, studentId, teacherId, dayOfWeek, timeSlot, lessonsPerWeek, weekStart) {
  try {
    console.log('🔍 [CREATE_TEMPLATE] Creating template with params:', {
      studentId, teacherId, dayOfWeek, timeSlot, lessonsPerWeek, weekStart
    })
    
    const templateQuery = `
      INSERT INTO schedule_templates (student_id, teacher_id, day_of_week, time_slot, lessons_per_week, start_date, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (student_id, teacher_id, day_of_week, time_slot, start_date) 
      DO UPDATE SET 
        lessons_per_week = EXCLUDED.lessons_per_week,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `
    
    const result = await client.query(templateQuery, [
      studentId, teacherId, dayOfWeek, timeSlot, lessonsPerWeek, weekStart
    ])
    
    console.log('✅ [CREATE_TEMPLATE] Template created successfully:', result.rows)
    return result
  } catch (error) {
    console.error('❌ [CREATE_TEMPLATE] Error creating template:', error)
    throw error
  }
}

// Generate recurring schedules for future weeks
async function generateRecurringSchedules(client, studentId, teacherId, dayOfWeek, timeSlot, startWeek, weeksToGenerate) {
  try {
    console.log('🔍 [RECURRING] Generating recurring schedules:', {
      studentId, teacherId, dayOfWeek, timeSlot, startWeek, weeksToGenerate
    })
    
    let generatedCount = 0
    
    for (let i = 1; i <= weeksToGenerate; i++) {
      // Calculate next week start date using database function to ensure Monday
      const nextWeekResult = await client.query(
        'SELECT get_week_start($1 + INTERVAL \'7 days\' * $2) as week_start',
        [startWeek, i]
      )
      const nextWeekStart = nextWeekResult.rows[0].week_start
      
      // Check if schedule already exists for this week
      const existingCheck = await client.query(
        'SELECT id FROM student_schedules WHERE student_id = $1 AND teacher_id = $2 AND day_of_week = $3 AND time_slot = $4 AND week_start_date = $5',
        [studentId, teacherId, dayOfWeek, timeSlot, nextWeekStart]
      )
      
      if (existingCheck.rows.length === 0) {
        // Create recurring schedule for this week
        await client.query(
          `INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date, is_recurring, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [studentId, teacherId, dayOfWeek, timeSlot, nextWeekStart]
        )
        generatedCount++
      }
    }
    
    console.log(`✅ [RECURRING] Generated ${generatedCount} recurring schedules for next ${weeksToGenerate} weeks`)
  } catch (error) {
    console.error('❌ [RECURRING] Error generating recurring schedules:', error)
    throw error
  }
}

// REWRITTEN deleteSchedule function - Soft delete with template cancellation
async function deleteSchedule(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const scheduleId = parseInt(event.path.split('/')[3])

    const client = await getPool().connect()

    try {
      console.log('🔍 [DELETE] Attempting to delete schedule ID:', scheduleId, 'by user:', user.userId)
      
      // Use the optimized database function
      const result = await client.query('SELECT delete_future_lesson($1, $2)', [
        scheduleId,
        user.userId
      ])

      console.log('🔍 [DELETE] Function result:', result.rows[0])

      const deletedCount = result.rows[0].delete_future_lesson

      if (deletedCount === 0) {
        console.log('🔍 [DELETE] Function returned 0 - schedule not found or not deletable')
        return errorResponse(404, 'Schedule not found')
      }

      console.log('✅ [DELETE] Deleted', deletedCount, 'lesson(s) successfully')
      return successResponse({
        message: `Deleted ${deletedCount} lesson(s) successfully`,
        action: 'deleted',
        deleted_count: deletedCount
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Delete schedule error:', error)
    return errorResponse(500, 'Failed to delete schedule: ' + error.message)
  }
}

// Delete future lessons based on template
async function deleteFutureLessons(client, schedule) {
  const { student_id, teacher_id, day_of_week, time_slot, template_id } = schedule
  const currentDate = new Date().toISOString().split('T')[0]
  
  if (template_id) {
    // Delete all future lessons from this template
    await client.query(
      `DELETE FROM student_schedules 
       WHERE template_id = $1 AND week_start_date >= $2`,
      [template_id, currentDate]
    )
  } else {
    // Delete future lessons with same pattern
    await client.query(
      `DELETE FROM student_schedules 
       WHERE student_id = $1 AND teacher_id = $2 AND day_of_week = $3 
       AND time_slot = $4 AND week_start_date >= $5`,
      [student_id, teacher_id, day_of_week, time_slot, currentDate]
    )
  }
}

// Update schedule template to prevent future generation
async function updateScheduleTemplate(client, schedule) {
  const { student_id, teacher_id, day_of_week, time_slot, template_id } = schedule
  
  if (template_id) {
    // Deactivate template
    await client.query(
      'UPDATE schedule_templates SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [template_id]
    )
  } else {
    // Find and deactivate matching template
    await client.query(
      `UPDATE schedule_templates 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE student_id = $1 AND teacher_id = $2 AND day_of_week = $3 AND time_slot = $4`,
      [student_id, teacher_id, day_of_week, time_slot]
    )
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

    const client = await getPool().connect()
    
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

// List schedule templates (admin)
async function listScheduleTemplates(event, user) {
  try {
    if (user.role !== 'admin') return errorResponse(403, 'Forbidden')
    const { student_id, teacher_id, is_active } = event.queryStringParameters || {}
    let sql = 'SELECT * FROM schedule_templates WHERE 1=1'
    const params = []
    let idx = 0
    if (student_id) { sql += ` AND student_id = $${++idx}`; params.push(parseInt(student_id)) }
    if (teacher_id) { sql += ` AND teacher_id = $${++idx}`; params.push(parseInt(teacher_id)) }
    if (is_active !== undefined) { sql += ` AND is_active = $${++idx}`; params.push(is_active === 'true') }
    sql += ' ORDER BY student_id, teacher_id, day_of_week, time_slot'
    const res = await query(sql, params)
    return successResponse({ templates: res.rows })
  } catch (error) {
    console.error('List templates error:', error)
    return errorResponse(500, 'Failed to list schedule templates')
  }
}

// Generate recurring schedules from templates for a week range
async function generateRecurringFromTemplates(event, user) {
  try {
    if (user.role !== 'admin') return errorResponse(403, 'Forbidden')
    const { from_week_start, to_week_start } = JSON.parse(event.body || '{}')
    if (!from_week_start || !to_week_start) return errorResponse(400, 'from_week_start and to_week_start are required')

    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      const tplRes = await client.query('SELECT * FROM schedule_templates WHERE is_active = true')
      for (const tpl of tplRes.rows) {
        // Iterate weeks
        let cur = new Date(from_week_start)
        const end = new Date(to_week_start)
        while (cur <= end) {
          const weekStart = cur.toISOString().split('T')[0]
          // Insert if not exists
          await client.query(
            `INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date, is_recurring)
             SELECT $1, $2, $3, $4, $5, true
             WHERE NOT EXISTS (
               SELECT 1 FROM student_schedules WHERE student_id=$1 AND teacher_id=$2 AND day_of_week=$3 AND time_slot=$4 AND week_start_date=$5
             )`,
            [tpl.student_id, tpl.teacher_id, tpl.day_of_week, tpl.time_slot, weekStart]
          )
          cur.setDate(cur.getDate() + 7)
        }
      }
      await client.query('COMMIT')
      return successResponse({ message: 'Recurring schedules generated' })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Generate recurring error:', error)
    return errorResponse(500, 'Failed to generate recurring schedules')
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

    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')

      // Ensure week_start_date is a Monday using database function
      const weekStartResult = await client.query(
        'SELECT get_week_start($1) as monday_week_start',
        [week_start_date]
      )
      const mondayWeekStart = weekStartResult.rows[0].monday_week_start

      // Delete existing schedules for the week
      await client.query('DELETE FROM student_schedules WHERE week_start_date = $1', [mondayWeekStart])

      // Insert new schedules
      for (const schedule of schedules) {
        const { student_id, teacher_id, day_of_week, time_slot, attendance_status } = schedule
        
        await client.query(
          `INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date, attendance_status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [student_id, teacher_id, day_of_week, time_slot, mondayWeekStart, attendance_status || 'scheduled']
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
  const client = await getPool().connect()
  
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { student_id, new_teacher_id, schedule_ids } = JSON.parse(event.body)

    if (!student_id || !new_teacher_id || !Array.isArray(schedule_ids)) {
      return errorResponse(400, 'student_id, new_teacher_id, and schedule_ids array are required')
    }

    await client.query('BEGIN')

    // 1. Get current teacher_id and affected schedules
    const oldRows = await client.query(
      'SELECT id, teacher_id, week_start_date FROM student_schedules WHERE id = ANY($1)', 
      [schedule_ids]
    )

    if (oldRows.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(404, 'No schedules found')
    }

    const currentDate = new Date().toISOString().split('T')[0]
    const oldTeacherId = oldRows.rows[0].teacher_id

    // 2. Update ONLY future schedules (preserve historical data)
    const futureScheduleIds = oldRows.rows
      .filter(row => row.week_start_date >= currentDate)
      .map(row => row.id)

    if (futureScheduleIds.length > 0) {
      await client.query(
        `UPDATE student_schedules 
         SET teacher_id = $1, original_teacher_id = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ANY($3)`,
        [new_teacher_id, oldTeacherId, futureScheduleIds]
      )
    }

    // 3. Update students table (for current assignment)
    await client.query(
      'UPDATE students SET teacher_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [new_teacher_id, student_id]
    )

    // 4. Update related schedule templates
    await client.query(
      `UPDATE schedule_templates 
       SET teacher_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE student_id = $2 AND teacher_id = $3`,
      [new_teacher_id, student_id, oldTeacherId]
    )

    // 5. Log in schedule_history
    for (const row of oldRows.rows) {
      try {
        await client.query(
          `INSERT INTO schedule_history (schedule_id, action, old_teacher_id, new_teacher_id, changed_by, notes)
           VALUES ($1, 'reassigned', $2, $3, $4, 'Reassigned via API - future schedules only')`,
          [row.id, row.teacher_id, new_teacher_id, user.userId]
        )
      } catch (e) {
        // ignore if history table not present
      }
    }

    await client.query('COMMIT')
    return successResponse({ 
      message: 'Student reassigned successfully',
      future_schedules_updated: futureScheduleIds.length,
      historical_schedules_preserved: oldRows.rows.length - futureScheduleIds.length
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Reassign student error:', error)
    return errorResponse(500, 'Failed to reassign student')
  } finally {
    client.release()
  }
}

// Create a schedule template (recurring pattern)
async function createScheduleTemplate(event, user) {
  try {
    if (user.role !== 'admin') return errorResponse(403, 'Forbidden')
    const { student_id, teacher_id, day_of_week, time_slot, lessons_per_week = 1, start_date, end_date, is_active = true } = JSON.parse(event.body || '{}')
    if (!student_id || !teacher_id || day_of_week === undefined || !time_slot || !start_date) {
      return errorResponse(400, 'Missing required fields')
    }
    const sql = `
      INSERT INTO schedule_templates (student_id, teacher_id, day_of_week, time_slot, lessons_per_week, start_date, end_date, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `
    const res = await query(sql, [student_id, teacher_id, day_of_week, time_slot, lessons_per_week, start_date, end_date || null, is_active])
    return successResponse({ template: res.rows[0] }, 201)
  } catch (error) {
    console.error('Create schedule template error:', error)
    return errorResponse(500, 'Failed to create schedule template')
  }
}

// Extend all schedules by one week
async function extendSchedules(event, user) {
  let client
  try {
    console.log('🔍 [EXTEND_SCHEDULES] Starting extension for user:', user.role)
    
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }
    
    client = await getPool().connect()
    console.log('🔍 [EXTEND_SCHEDULES] Database connected, executing extension')
    
    // Single database call - returns count only
    const result = await client.query('SELECT extend_schedules_by_one_week() as count')
    const count = result.rows[0].count
    
    console.log(`✅ [EXTEND_SCHEDULES] Extended ${count} schedule templates`)
    
    return successResponse({ 
      success: true, 
      count,
      message: `Successfully extended ${count} schedule templates by one week`
    })
    
  } catch (error) {
    console.error('❌ [EXTEND_SCHEDULES] Error:', error)
    console.error('❌ [EXTEND_SCHEDULES] Error details:', error.message)
    return errorResponse(500, 'Failed to extend schedules: ' + error.message)
  } finally {
    if (client) client.release()
  }
}

// Check extension reminder (once per day)
async function checkExtensionReminder(event, user) {
  let client
  try {
    console.log('🔍 [CHECK_EXTENSION_REMINDER] Starting check for user:', user.role)
    
    if (user.role !== 'admin') {
      console.log('🔍 [CHECK_EXTENSION_REMINDER] Non-admin user, returning false')
      return successResponse({ needsExtension: false })
    }
    
    client = await getPool().connect()
    console.log('🔍 [CHECK_EXTENSION_REMINDER] Database connected, executing query')
    
    const result = await client.query('SELECT count_schedules_needing_extension() as count')
    const count = result.rows[0].count
    
    console.log('✅ [CHECK_EXTENSION_REMINDER] Query successful, count:', count)
    
    return successResponse({ 
      needsExtension: count > 0,
      count: count
    })
    
  } catch (error) {
    console.error('❌ [CHECK_EXTENSION_REMINDER] Error:', error)
    console.error('❌ [CHECK_EXTENSION_REMINDER] Error details:', error.message)
    return errorResponse(500, 'Failed to check extension reminder: ' + error.message)
  } finally {
    if (client) client.release()
  }
}
