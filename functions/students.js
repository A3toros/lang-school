require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders, getPool } = require('./utils/database.js')

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
    if (path === '/api/students' && method === 'GET') {
      return await getStudents(event, user)
    } else if (path.match(/^\/api\/students\/\d+$/) && method === 'GET') {
      return await getStudent(event, user)
    } else if (path === '/api/students' && method === 'POST') {
      return await createStudent(event, user)
    } else if (path.match(/^\/api\/students\/\d+$/) && method === 'PUT') {
      return await updateStudent(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/deactivate$/) && method === 'POST') {
      return await deactivateStudent(event, user)
    } else if (path.match(/^\/api\/students\/\d+$/) && method === 'DELETE') {
      return await deleteStudent(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/reactivate$/) && method === 'POST') {
      return await reactivateStudent(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/schedule$/) && method === 'GET') {
      return await getStudentSchedule(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/lessons$/) && method === 'GET') {
      return await getStudentLessons(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/reassign$/) && method === 'POST') {
      return await reassignStudent(event, user)
    } else if (path === '/api/students/search' && method === 'GET') {
      return await searchStudents(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/attendance$/) && method === 'GET') {
      return await getStudentAttendance(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/progress$/) && method === 'GET') {
      return await getStudentProgress(event, user)
    } else if (path.match(/^\/api\/students\/teacher\/\d+$/) && method === 'GET') {
      return await getStudentsByTeacher(event, user)
    } else if (path === '/api/students/inactive' && method === 'GET') {
      return await getInactiveStudents(event, user)
    } else if (path === '/api/students/export' && method === 'GET') {
      return await exportStudents(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/teachers$/) && method === 'GET') {
      return await getStudentTeachers(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/teachers$/) && method === 'POST') {
      return await addStudentTeacher(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/teachers\/\d+$/) && method === 'DELETE') {
      return await removeStudentTeacher(event, user)
    } else if (path.match(/^\/api\/students\/\d+\/teachers\/\d+\/primary$/) && method === 'PUT') {
      return await setPrimaryTeacher(event, user)
    } else if (path === '/api/students/bulk-update' && method === 'POST') {
      return await bulkUpdateStudents(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Students API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get all students with filtering/pagination
async function getStudents(event, user) {
  try {
    const { name, date_from, date_to, lessons_min, lessons_max, sort_by, sort_order, page, limit, status, teacher_id, primary_teacher_id } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    // Build lesson count query based on date range
    let lessonCountQuery = 'COUNT(sl.id) as lesson_count'
    let params = []
    let paramCount = 0
    
    // If dates are provided, filter by date range
    if (date_from && date_to) {
      lessonCountQuery = `COUNT(CASE WHEN sl.lesson_date >= $${++paramCount} AND sl.lesson_date <= $${++paramCount} THEN sl.id END) as lesson_count`
      params.push(date_from, date_to)
    }
    // If no dates provided, show all time data (default behavior)

    let queryText = `
      SELECT s.*, pt.name as teacher_name, ${lessonCountQuery}
      FROM students s
      LEFT JOIN teachers pt ON s.primary_teacher_id = pt.id
      LEFT JOIN student_lessons sl ON s.id = sl.student_id
      WHERE 1=1
    `

    // Add status filter
    if (status === 'active') {
      queryText += ` AND s.is_active = true`
    } else if (status === 'inactive') {
      queryText += ` AND s.is_active = false`
    }
    // If no status specified, show all students

    // Add filters
    if (name) {
      queryText += ` AND s.name ILIKE $${++paramCount}`
      params.push(`%${name}%`)
    }

    if (date_from) {
      queryText += ` AND s.added_date >= $${++paramCount}`
      params.push(date_from)
    }

    if (date_to) {
      queryText += ` AND s.added_date <= $${++paramCount}`
      params.push(date_to)
    }

    // Add teacher_id filter (backward compatibility)
    if (teacher_id !== undefined) {
      if (teacher_id === null || teacher_id === 'null') {
        queryText += ` AND s.teacher_id IS NULL`
      } else {
        queryText += ` AND s.teacher_id = $${++paramCount}`
        params.push(teacher_id)
      }
    }

    // Add primary_teacher_id filter support
    if (primary_teacher_id !== undefined) {
      if (primary_teacher_id === null || primary_teacher_id === 'null') {
        queryText += ` AND s.primary_teacher_id IS NULL`
      } else {
        queryText += ` AND s.primary_teacher_id = $${++paramCount}`
        params.push(primary_teacher_id)
      }
    }

    queryText += ` GROUP BY s.id, pt.name`

    if (lessons_min || lessons_max) {
      queryText += ` HAVING COUNT(sl.id)`
      if (lessons_min) {
        queryText += ` >= $${++paramCount}`
        params.push(parseInt(lessons_min))
      }
      if (lessons_max) {
        queryText += ` <= $${++paramCount}`
        params.push(parseInt(lessons_max))
      }
    }

    // Add sorting
    const validSortKeys = ['name', 'teacher_name', 'lessons_per_week', 'lesson_count', 'added_date', 'is_active']
    const sortKey = validSortKeys.includes(sort_by) ? sort_by : 'added_date'
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC'
    
    // Map frontend sort keys to database column names
    const sortColumnMap = {
      'name': 's.name',
      'teacher_name': 't.name',
      'lessons_per_week': 's.lessons_per_week',
      'lesson_count': 'lesson_count',
      'added_date': 's.added_date',
      'is_active': 's.is_active'
    }
    
    const sortColumn = sortColumnMap[sortKey] || 's.added_date'
    
    queryText += ` ORDER BY ${sortColumn} ${sortDirection} LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM students s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN student_lessons sl ON s.id = sl.student_id
      WHERE 1=1
    `
    let countParams = []
    let countParamCount = 0

    // Add status filter for count
    if (status === 'active') {
      countQuery += ` AND s.is_active = true`
    } else if (status === 'inactive') {
      countQuery += ` AND s.is_active = false`
    }
    // If no status specified, show all students

    // Add same filters for count
    if (name) {
      countQuery += ` AND s.name ILIKE $${++countParamCount}`
      countParams.push(`%${name}%`)
    }
    if (date_from) {
      countQuery += ` AND s.added_date >= $${++countParamCount}`
      countParams.push(date_from)
    }
    if (date_to) {
      countQuery += ` AND s.added_date <= $${++countParamCount}`
      countParams.push(date_to)
    }
    if (lessons_min || lessons_max) {
      countQuery += ` GROUP BY s.id`
      if (lessons_min || lessons_max) {
        countQuery += ` HAVING COUNT(sl.id)`
        if (lessons_min) {
          countQuery += ` >= $${++countParamCount}`
          countParams.push(parseInt(lessons_min))
        }
        if (lessons_max) {
          countQuery += ` <= $${++countParamCount}`
          countParams.push(parseInt(lessons_max))
        }
      }
    }

    const countResult = await query(countQuery, countParams)
    const total = countResult.rows[0]?.total || 0

    console.log('🔍 [GET_STUDENTS] Count query debug:', { 
      status, 
      countQuery, 
      countParams, 
      total: parseInt(total),
      studentsCount: result.rows.length 
    })

    return successResponse({ 
      students: result.rows,
      total: parseInt(total)
    })
  } catch (error) {
    console.error('Get students error:', error)
    return errorResponse(500, 'Failed to fetch students')
  }
}

// Get specific student
async function getStudent(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])

    const queryText = `
      SELECT s.*, t.name as teacher_name, t.email as teacher_email,
             COUNT(sl.id) as total_lessons,
             COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
             COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
      FROM students s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN student_lessons sl ON s.id = sl.student_id
      LEFT JOIN student_schedules ss ON s.id = ss.student_id
      WHERE s.id = $1
      GROUP BY s.id, t.name, t.email
    `
    
    const result = await query(queryText, [studentId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Student not found')
    }

    return successResponse({ student: result.rows[0] })
  } catch (error) {
    console.error('Get student error:', error)
    return errorResponse(500, 'Failed to fetch student')
  }
}

// Create new student
async function createStudent(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { name, teacher_id, lessons_per_week } = JSON.parse(event.body)

    if (!name || !teacher_id) {
      return errorResponse(400, 'Name and teacher_id are required')
    }

    // Verify teacher exists and is active
    const teacherCheck = await query(
      'SELECT id FROM teachers WHERE id = $1 AND is_active = true',
      [teacher_id]
    )

    if (teacherCheck.rows.length === 0) {
      return errorResponse(400, 'Invalid teacher_id')
    }

    const queryText = `
      INSERT INTO students (name, teacher_id, lessons_per_week, added_date)
      VALUES ($1, $2, $3, CURRENT_DATE)
      RETURNING *
    `
    
    const result = await query(queryText, [name, teacher_id, lessons_per_week || 1])
    return successResponse({ student: result.rows[0] }, 201)
  } catch (error) {
    console.error('Create student error:', error)
    return errorResponse(500, 'Failed to create student')
  }
}

// Update student information
async function updateStudent(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])
    const { name, teacher_id, lessons_per_week, is_active } = JSON.parse(event.body)

    // Check permissions - teachers can only update their own students
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

    // Handle status change
    if (is_active !== undefined) {
      if (is_active === false) {
        // Deactivating student - remove from teacher assignment
        const queryText = `
          UPDATE students 
          SET name = $1, teacher_id = NULL, lessons_per_week = $2, is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *
        `
        const result = await query(queryText, [name, lessons_per_week, studentId])
        
        if (result.rows.length === 0) {
          return errorResponse(404, 'Student not found')
        }
        
        return successResponse(result.rows[0])
      } else if (is_active === true) {
        // Reactivating student - require teacher assignment
        if (!teacher_id) {
          return errorResponse(400, 'Teacher assignment required when reactivating student')
        }
        
        const queryText = `
          UPDATE students 
          SET name = $1, teacher_id = $2, lessons_per_week = $3, is_active = true, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *
        `
        const result = await query(queryText, [name, teacher_id, lessons_per_week, studentId])
        
        if (result.rows.length === 0) {
          return errorResponse(404, 'Student not found')
        }
        
        return successResponse(result.rows[0])
      }
    }

    // Regular update (no status change)
    const queryText = `
      UPDATE students 
      SET name = $1, teacher_id = $2, lessons_per_week = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND is_active = true
      RETURNING *
    `
    
    const result = await query(queryText, [name, teacher_id, lessons_per_week, studentId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Student not found')
    }

    return successResponse({ student: result.rows[0] })
  } catch (error) {
    console.error('Update student error:', error)
    return errorResponse(500, 'Failed to update student')
  }
}

// Deactivate student (soft delete - preserve all data)
async function deactivateStudent(event, user) {
  console.log('🚨 [DEACTIVATE] FUNCTION CALLED - Student ID:', event.path.split('/')[3])
  try {
    const studentId = parseInt(event.path.split('/')[3])
    console.log('🚨 [DEACTIVATE] Parsed studentId:', studentId)

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

    const client = await getPool().connect()
    console.log('🔍 [DEACTIVATE] Database client connected')
    
    try {
      await client.query('BEGIN')
      console.log('🔍 [DEACTIVATE] Transaction started')
      
      // 1. Set student to unassigned and deactivated
      const updateResult = await client.query(
        'UPDATE students SET teacher_id = NULL, primary_teacher_id = NULL, teacher_count = 0, is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [studentId]
      )
      
      // 2. Deactivate all teacher assignments in student_teachers
      await client.query(
        'UPDATE student_teachers SET is_active = false WHERE student_id = $1',
        [studentId]
      )
      console.log('🚨 [DEACTIVATE] Student update result:', { studentId, rowsAffected: updateResult.rowCount })
      
      // 3. DELETE future schedules (not just set teacher_id = NULL)
      const currentDate = new Date().toISOString().split('T')[0]
      await client.query(
        `DELETE FROM student_schedules 
         WHERE student_id = $1 AND week_start_date >= $2`,
        [studentId, currentDate]
      )
      
      // 4. DEACTIVATE schedule templates (prevent regeneration)
      await client.query(
        'UPDATE schedule_templates SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE student_id = $1',
        [studentId]
      )
      
      // 5. Log deactivation in schedule history
      try {
        await client.query(
          `INSERT INTO schedule_history (action, old_teacher_id, new_teacher_id, changed_by, notes)
           VALUES ('deactivated', NULL, NULL, $1, 'Student deactivated - future schedules removed')`,
          [user.userId]
        )
      } catch (e) {
        // history table may not exist yet; ignore
      }
      
      await client.query('COMMIT')
      console.log('🚨 [DEACTIVATE] Transaction committed successfully for student:', studentId)
      
      // Verify the deactivation worked by checking the database immediately
      try {
        const verifyResult = await client.query('SELECT id, name, is_active, teacher_id FROM students WHERE id = $1', [studentId])
        console.log('🔍 [DEACTIVATE] Verification query result:', verifyResult.rows[0])
      } catch (verifyError) {
        console.error('🚨 [DEACTIVATE] Verification query failed:', verifyError)
      }
      
      return successResponse({ 
        message: 'Student deactivated successfully - future schedules removed',
        data_preserved: {
          lesson_reports: 'Preserved (historical data)',
          schedule_history: 'Preserved (audit trail)',
          historical_schedules: 'Preserved (attendance records)',
          student_lessons: 'Preserved (lesson tracking)',
          future_schedules: 'DELETED (not needed)',
          schedule_templates: 'DEACTIVATED (prevent regeneration)'
        }
      })
    } catch (error) {
      console.error('🚨 [DEACTIVATE] Transaction error, rolling back:', error)
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('🚨 [DEACTIVATE] Outer catch - Deactivate student error:', error)
    return errorResponse(500, 'Failed to deactivate student')
  }
}

// Delete student (hard delete - remove all data)
async function deleteStudent(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])

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

    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Update schedule history to set schedule_id = NULL (preserve audit trail)
      await client.query(
        'UPDATE schedule_history SET schedule_id = NULL WHERE schedule_id IN (SELECT id FROM student_schedules WHERE student_id = $1)',
        [studentId]
      )
      
      // 2. Delete all schedules (CASCADE will handle this)
      await client.query('DELETE FROM student_schedules WHERE student_id = $1', [studentId])
      
      // 3. Delete all lesson reports (CASCADE will handle this)
      await client.query('DELETE FROM lesson_reports WHERE student_id = $1', [studentId])
      
      // 4. Delete all student lessons (CASCADE will handle this)
      await client.query('DELETE FROM student_lessons WHERE student_id = $1', [studentId])
      
      // 5. Delete schedule templates (CASCADE will handle this)
      await client.query('DELETE FROM schedule_templates WHERE student_id = $1', [studentId])
      
      // 6. Delete student record (CASCADE will handle related data)
      await client.query('DELETE FROM students WHERE id = $1', [studentId])
      
      await client.query('COMMIT')
      
      return successResponse({ 
        message: 'Student deleted successfully - all data removed',
        data_deleted: {
          student_record: 'Deleted',
          schedules: 'Deleted',
          lesson_reports: 'Deleted',
          student_lessons: 'Deleted',
          schedule_templates: 'Deleted',
          schedule_history: 'Updated (schedule_id set to NULL)'
        }
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Delete student error:', error)
    return errorResponse(500, 'Failed to delete student')
  }
}

// Reactivate student
async function reactivateStudent(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const studentId = parseInt(event.path.split('/')[3])
    await query('UPDATE students SET is_active = true WHERE id = $1', [studentId])
    return successResponse({ message: 'Student reactivated successfully' })
  } catch (error) {
    console.error('Reactivate student error:', error)
    return errorResponse(500, 'Failed to reactivate student')
  }
}

// REWRITTEN getStudentSchedule function - Use is_active flag and upcoming_schedule_view
async function getStudentSchedule(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])
    const { week_start, include_history = 'false' } = event.queryStringParameters || {}

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

    let queryText
    let params = [studentId]

    if (include_history === 'true') {
      // Historical data - query all schedules
      queryText = `
        SELECT ss.*, t.name as teacher_name,
               CASE WHEN ss.attendance_status = 'completed' THEN 'completed'
                    WHEN ss.attendance_status = 'absent' THEN 'absent'
                    WHEN ss.attendance_status = 'absent_warned' THEN 'absent_warned'
                    ELSE 'scheduled'
               END as status
        FROM student_schedules ss
        JOIN teachers t ON ss.teacher_id = t.id
        WHERE ss.student_id = $1 AND ss.week_start_date = $2
        ORDER BY ss.day_of_week, ss.time_slot
      `
      params.push(weekStart)
        } else {
          // Future calendar queries - show only current and future weeks
          // If specific week requested, show that week; otherwise show all upcoming
          if (week_start) {
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
              WHERE ss.student_id = $1 AND ss.week_start_date = $2 AND ss.week_start_date >= get_current_week_start()
              ORDER BY ss.day_of_week, ss.time_slot
            `
            params.push(weekStart)
          } else {
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
              WHERE ss.student_id = $1 AND ss.week_start_date >= get_current_week_start()
              ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot
            `
          }
        }
    
    const result = await query(queryText, params)
    return successResponse({ schedule: result.rows })
  } catch (error) {
    console.error('Get student schedule error:', error)
    return errorResponse(500, 'Failed to fetch schedule')
  }
}

// Get student's lesson history
async function getStudentLessons(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])

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

    const queryText = `
      SELECT sl.*, t.name as teacher_name
      FROM student_lessons sl
      JOIN students s ON sl.student_id = s.id
      JOIN teachers t ON s.teacher_id = t.id
      WHERE sl.student_id = $1
      ORDER BY sl.lesson_date DESC
    `
    
    const result = await query(queryText, [studentId])
    return successResponse({ lessons: result.rows })
  } catch (error) {
    console.error('Get student lessons error:', error)
    return errorResponse(500, 'Failed to fetch lessons')
  }
}

// Reassign student to different teacher
async function reassignStudent(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const studentId = parseInt(event.path.split('/')[3])
    const { new_teacher_id } = JSON.parse(event.body)

    if (!new_teacher_id) {
      return errorResponse(400, 'new_teacher_id is required')
    }

    // Verify new teacher exists and is active
    const teacherCheck = await query(
      'SELECT id FROM teachers WHERE id = $1 AND is_active = true',
      [new_teacher_id]
    )

    if (teacherCheck.rows.length === 0) {
      return errorResponse(400, 'Invalid teacher_id')
    }

    await query(
      'UPDATE students SET teacher_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [new_teacher_id, studentId]
    )

    return successResponse({ message: 'Student reassigned successfully' })
  } catch (error) {
    console.error('Reassign student error:', error)
    return errorResponse(500, 'Failed to reassign student')
  }
}

// Search students
async function searchStudents(event, user) {
  try {
    const { q, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    let queryText = `
      SELECT s.*, t.name as teacher_name, COUNT(sl.id) as lesson_count
      FROM students s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN student_lessons sl ON s.id = sl.student_id
      WHERE s.is_active = true
    `
    let params = []
    let paramCount = 0

    if (q) {
      queryText += ` AND (s.name ILIKE $${++paramCount} OR t.name ILIKE $${++paramCount})`
      params.push(`%${q}%`, `%${q}%`)
    }

    queryText += ` GROUP BY s.id, t.name ORDER BY s.added_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    return successResponse({ students: result.rows })
  } catch (error) {
    console.error('Search students error:', error)
    return errorResponse(500, 'Failed to search students')
  }
}

// Get student's attendance records
async function getStudentAttendance(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])
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

    queryText += ` ORDER BY ss.attendance_date DESC`

    const result = await query(queryText, params)
    return successResponse({ attendance: result.rows })
  } catch (error) {
    console.error('Get student attendance error:', error)
    return errorResponse(500, 'Failed to fetch attendance')
  }
}

// Get student's progress metrics
async function getStudentProgress(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])

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

    const queryText = `
      SELECT 
        s.name,
        t.name as teacher_name,
        COUNT(sl.id) as total_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
        ROUND(
          (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END), 0)) * 100, 2
        ) as attendance_rate,
        s.added_date,
        s.lessons_per_week
      FROM students s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN student_lessons sl ON s.id = sl.student_id
      LEFT JOIN student_schedules ss ON s.id = ss.student_id
      WHERE s.id = $1
      GROUP BY s.id, s.name, t.name, s.added_date, s.lessons_per_week
    `
    
    const result = await query(queryText, [studentId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Student not found')
    }

    return successResponse({ progress: result.rows[0] })
  } catch (error) {
    console.error('Get student progress error:', error)
    return errorResponse(500, 'Failed to fetch progress')
  }
}

// Get students by teacher
async function getStudentsByTeacher(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[4])
    
    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      SELECT s.*, COUNT(sl.id) as lesson_count
      FROM students s
      LEFT JOIN student_lessons sl ON s.id = sl.student_id
      WHERE s.teacher_id = $1 AND s.is_active = true
      GROUP BY s.id
      ORDER BY s.name
    `
    
    const result = await query(queryText, [teacherId])
    return successResponse({ students: result.rows })
  } catch (error) {
    console.error('Get students by teacher error:', error)
    return errorResponse(500, 'Failed to fetch students')
  }
}

// Get inactive students (admin only)
async function getInactiveStudents(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      SELECT s.*, pt.name as teacher_name
      FROM students s
      LEFT JOIN teachers pt ON s.primary_teacher_id = pt.id
      WHERE s.is_active = false
      ORDER BY s.name
    `
    
    const result = await query(queryText)
    return successResponse({ students: result.rows })
  } catch (error) {
    console.error('Get inactive students error:', error)
    return errorResponse(500, 'Failed to fetch inactive students')
  }
}

// Export students data
async function exportStudents(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      SELECT s.*, t.name as teacher_name, t.email as teacher_email,
             COUNT(sl.id) as total_lessons,
             COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
             COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
      FROM students s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN student_lessons sl ON s.id = sl.student_id
      LEFT JOIN student_schedules ss ON s.id = ss.student_id
      WHERE s.is_active = true
      GROUP BY s.id, t.name, t.email
      ORDER BY s.added_date DESC
    `
    
    const result = await query(queryText)
    return successResponse({ students: result.rows })
  } catch (error) {
    console.error('Export students error:', error)
    return errorResponse(500, 'Failed to export students')
  }
}

// Get student's teacher history
async function getStudentTeachers(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])

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

    const queryText = `
      SELECT DISTINCT t.*, s.teacher_id as current_teacher
      FROM teachers t
      JOIN students s ON t.id = s.teacher_id
      WHERE s.id = $1
      ORDER BY t.name
    `
    
    const result = await query(queryText, [studentId])
    return successResponse({ teachers: result.rows })
  } catch (error) {
    console.error('Get student teachers error:', error)
    return errorResponse(500, 'Failed to fetch teachers')
  }
}

// Bulk update students
async function bulkUpdateStudents(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { studentIds, updates } = JSON.parse(event.body)

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return errorResponse(400, 'Student IDs are required')
    }

    if (!updates || Object.keys(updates).length === 0) {
      return errorResponse(400, 'Updates are required')
    }

    const allowedFields = ['name', 'teacher_id', 'lessons_per_week', 'is_active']
    const updateFields = Object.keys(updates).filter(field => allowedFields.includes(field))
    
    if (updateFields.length === 0) {
      return errorResponse(400, 'No valid fields to update')
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ')
    const queryText = `
      UPDATE students 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1) AND is_active = true
      RETURNING *
    `

    const params = [studentIds, ...updateFields.map(field => updates[field])]
    const result = await query(queryText, params)

    return successResponse({ 
      message: `Updated ${result.rows.length} students`,
      students: result.rows 
    })
  } catch (error) {
    console.error('Bulk update students error:', error)
    return errorResponse(500, 'Failed to bulk update students')
  }
}

// =====================================================
// TEACHER MANAGEMENT FUNCTIONS
// =====================================================

// Get student's assigned teachers
async function getStudentTeachers(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])
    
    // Check permissions
    if (user.role === 'teacher') {
      const hasAccess = await hasStudentAccess(user.teacherId, studentId)
      if (!hasAccess) {
        return errorResponse(403, 'Forbidden')
      }
    }

    const queryText = `
      SELECT t.*, st.is_primary, st.assigned_date, st.assigned_by
      FROM teachers t
      JOIN student_teachers st ON t.id = st.teacher_id
      WHERE st.student_id = $1 AND st.is_active = true
      ORDER BY st.is_primary DESC, t.name
    `
    
    const result = await query(queryText, [studentId])
    return successResponse({ teachers: result.rows })
  } catch (error) {
    console.error('Get student teachers error:', error)
    return errorResponse(500, 'Failed to fetch teachers')
  }
}

// Add teacher to student
async function addStudentTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const studentId = parseInt(event.path.split('/')[3])
    const { teacher_id, is_primary } = JSON.parse(event.body)

    // Verify teacher exists
    const teacherCheck = await query(
      'SELECT id FROM teachers WHERE id = $1 AND is_active = true',
      [teacher_id]
    )

    console.log('🔍 [ADD_TEACHER] Teacher check:', {
      teacher_id,
      found: teacherCheck.rows.length > 0,
      teacher: teacherCheck.rows[0]
    })

    if (teacherCheck.rows.length === 0) {
      return errorResponse(400, 'Invalid teacher_id')
    }

    // Check if already assigned (including inactive assignments)
    const existingCheck = await query(
      'SELECT id, is_active FROM student_teachers WHERE student_id = $1 AND teacher_id = $2',
      [studentId, teacher_id]
    )

    if (existingCheck.rows.length > 0) {
      const assignment = existingCheck.rows[0]
      if (assignment.is_active) {
        return errorResponse(400, 'Teacher already assigned to this student')
      } else {
        // Reactivate the existing assignment
        await query(
          'UPDATE student_teachers SET is_active = true, assigned_date = CURRENT_DATE, assigned_by = $1 WHERE id = $2',
          [user.userId, assignment.id]
        )
        // Update student teacher count
        await query(
          'UPDATE students SET teacher_count = teacher_count + 1 WHERE id = $1',
          [studentId]
        )
        return successResponse({ message: 'Teacher assignment reactivated' })
      }
    }

    // Check if this is the first teacher for this student (BEFORE any modifications)
    const existingTeachers = await query(
      'SELECT COUNT(*) as count FROM student_teachers WHERE student_id = $1 AND is_active = true',
      [studentId]
    )
    const isFirstTeacher = parseInt(existingTeachers.rows[0].count) === 0

    // If setting as primary, unset current primary
    if (is_primary) {
      await query(
        'UPDATE student_teachers SET is_primary = false WHERE student_id = $1 AND is_primary = true',
        [studentId]
      )
    }

    // Add new teacher assignment (first teacher is automatically primary)
    await query(
      'INSERT INTO student_teachers (student_id, teacher_id, is_primary, assigned_by) VALUES ($1, $2, $3, $4)',
      [studentId, teacher_id, isFirstTeacher, user.userId]
    )

    // Update student's primary teacher if this is the first teacher
    if (isFirstTeacher) {
      await query(
        'UPDATE students SET primary_teacher_id = $1, teacher_count = teacher_count + 1 WHERE id = $2',
        [teacher_id, studentId]
      )
    } else {
      await query(
        'UPDATE students SET teacher_count = teacher_count + 1 WHERE id = $1',
        [studentId]
      )
    }

    return successResponse({ message: 'Teacher added successfully' })
  } catch (error) {
    console.error('Add student teacher error:', error)
    return errorResponse(500, 'Failed to add teacher')
  }
}

// Remove teacher from student
async function removeStudentTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const studentId = parseInt(event.path.split('/')[3])
    const teacherId = parseInt(event.path.split('/')[5])

    // Check if teacher is assigned
    const assignmentCheck = await query(
      'SELECT is_primary FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_active = true',
      [studentId, teacherId]
    )

    if (assignmentCheck.rows.length === 0) {
      return errorResponse(404, 'Teacher not assigned to this student')
    }

    const isPrimary = assignmentCheck.rows[0].is_primary

    // Deactivate assignment
    await query(
      'UPDATE student_teachers SET is_active = false WHERE student_id = $1 AND teacher_id = $2',
      [studentId, teacherId]
    )

    // If removing primary teacher, set new primary or clear
    if (isPrimary) {
      // First, unset any existing primary teacher
      await query(
        'UPDATE student_teachers SET is_primary = false WHERE student_id = $1 AND is_primary = true',
        [studentId]
      )

      // Check for remaining active teachers AFTER deactivating the current one
      const remainingTeachers = await query(
        'SELECT teacher_id FROM student_teachers WHERE student_id = $1 AND is_active = true LIMIT 1',
        [studentId]
      )

      if (remainingTeachers.rows.length > 0) {
        // Set new primary (first remaining teacher)
        await query(
          'UPDATE student_teachers SET is_primary = true WHERE student_id = $1 AND teacher_id = $2',
          [studentId, remainingTeachers.rows[0].teacher_id]
        )
        await query(
          'UPDATE students SET primary_teacher_id = $1 WHERE id = $2',
          [remainingTeachers.rows[0].teacher_id, studentId]
        )
      } else {
        // No more teachers, clear primary
        await query(
          'UPDATE students SET primary_teacher_id = NULL WHERE id = $1',
          [studentId]
        )
      }
    }

    // Update teacher count
    await query(
      'UPDATE students SET teacher_count = teacher_count - 1 WHERE id = $1',
      [studentId]
    )

    return successResponse({ message: 'Teacher removed successfully' })
  } catch (error) {
    console.error('Remove student teacher error:', error)
    return errorResponse(500, 'Failed to remove teacher')
  }
}

// Set primary teacher
async function setPrimaryTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const studentId = parseInt(event.path.split('/')[3])
    const teacherId = parseInt(event.path.split('/')[5])

    // Verify teacher is assigned to student
    const assignmentCheck = await query(
      'SELECT id FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_active = true',
      [studentId, teacherId]
    )

    if (assignmentCheck.rows.length === 0) {
      return errorResponse(404, 'Teacher not assigned to this student')
    }

    // Unset current primary
    await query(
      'UPDATE student_teachers SET is_primary = false WHERE student_id = $1 AND is_primary = true',
      [studentId]
    )

    // Set new primary
    await query(
      'UPDATE student_teachers SET is_primary = true WHERE student_id = $1 AND teacher_id = $2',
      [studentId, teacherId]
    )

    // Update student's primary teacher
    await query(
      'UPDATE students SET primary_teacher_id = $1 WHERE id = $2',
      [teacherId, studentId]
    )

    return successResponse({ message: 'Primary teacher updated successfully' })
  } catch (error) {
    console.error('Set primary teacher error:', error)
    return errorResponse(500, 'Failed to update primary teacher')
  }
}

// Helper function to check if teacher has access to student
async function hasStudentAccess(teacherId, studentId) {
  try {
    const result = await query(
      'SELECT id FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_active = true',
      [studentId, teacherId]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('Error checking student access:', error)
    return false
  }
}
