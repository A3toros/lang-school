const { verifyToken, errorResponse, successResponse, query, getPaginationParams } = require('./utils/database')

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
    // Verify authentication for all routes except public ones
    let user
    try {
      user = verifyToken(event)
    } catch (error) {
      return errorResponse(401, 'Unauthorized')
    }

    // Route to appropriate handler
    if (path === '/api/teachers' && method === 'GET') {
      return await getTeachers(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+$/) && method === 'GET') {
      return await getTeacher(event, user)
    } else if (path === '/api/teachers' && method === 'POST') {
      return await createTeacher(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+$/) && method === 'PUT') {
      return await updateTeacher(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+$/) && method === 'DELETE') {
      return await deleteTeacher(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+\/reactivate$/) && method === 'POST') {
      return await reactivateTeacher(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+\/students$/) && method === 'GET') {
      return await getTeacherStudents(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+\/schedule$/) && method === 'GET') {
      return await getTeacherSchedule(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+\/stats$/) && method === 'GET') {
      return await getTeacherStats(event, user)
    } else if (path.match(/^\/api\/teachers\/random\/\d+$/) && method === 'GET') {
      return await getRandomTeachers(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+\/monthly-stats\/\d+\/\d+$/) && method === 'GET') {
      return await getTeacherMonthlyStats(event, user)
    } else if (path === '/api/teachers/search' && method === 'GET') {
      return await searchTeachers(event, user)
    } else if (path === '/api/teachers/inactive' && method === 'GET') {
      return await getInactiveTeachers(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Teachers API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get all teachers (admin) or current teacher
async function getTeachers(event, user) {
  try {
    let queryText, params

    if (user.role === 'admin') {
      // Admin can see all teachers
      queryText = `
        SELECT t.*, u.username, u.is_active as user_active,
               COUNT(s.id) as student_count
        FROM teachers t
        LEFT JOIN users u ON t.id = u.teacher_id
        LEFT JOIN students s ON t.id = s.teacher_id AND s.is_active = true
        WHERE t.is_active = true
        GROUP BY t.id, u.username, u.is_active
        ORDER BY t.name
      `
      params = []
    } else if (user.role === 'teacher') {
      // Teacher can only see themselves
      queryText = `
        SELECT t.*, u.username, u.is_active as user_active,
               COUNT(s.id) as student_count
        FROM teachers t
        LEFT JOIN users u ON t.id = u.teacher_id
        LEFT JOIN students s ON t.id = s.teacher_id AND s.is_active = true
        WHERE t.id = $1 AND t.is_active = true
        GROUP BY t.id, u.username, u.is_active
      `
      params = [user.teacherId]
    } else {
      return errorResponse(403, 'Forbidden')
    }

    const result = await query(queryText, params)
    return successResponse({ teachers: result.rows })
  } catch (error) {
    console.error('Get teachers error:', error)
    return errorResponse(500, 'Failed to fetch teachers')
  }
}

// Get specific teacher
async function getTeacher(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    
    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      SELECT t.*, u.username, u.is_active as user_active,
             COUNT(s.id) as student_count
      FROM teachers t
      LEFT JOIN users u ON t.id = u.teacher_id
      LEFT JOIN students s ON t.id = s.teacher_id AND s.is_active = true
      WHERE t.id = $1
      GROUP BY t.id, u.username, u.is_active
    `
    
    const result = await query(queryText, [teacherId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Teacher not found')
    }

    return successResponse({ teacher: result.rows[0] })
  } catch (error) {
    console.error('Get teacher error:', error)
    return errorResponse(500, 'Failed to fetch teacher')
  }
}

// Create new teacher (admin only)
async function createTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { name, email, photo_url, description, username, password } = JSON.parse(event.body)

    if (!name || !email || !username || !password) {
      return errorResponse(400, 'Missing required fields')
    }

    // Check if email or username already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR (SELECT id FROM teachers WHERE email = $2) IS NOT NULL',
      [username, email]
    )

    if (existingUser.rows.length > 0) {
      return errorResponse(400, 'Username or email already exists')
    }

    // Create teacher and user account in a transaction
    const client = await require('./utils/database').getPool().connect()
    
    try {
      await client.query('BEGIN')

      // Insert teacher
      const teacherResult = await client.query(
        'INSERT INTO teachers (name, email, photo_url, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, email, photo_url || null, description || null]
      )

      const teacher = teacherResult.rows[0]

      // Insert user account
      await client.query(
        'INSERT INTO users (username, password, role, teacher_id) VALUES ($1, $2, $3, $4)',
        [username, password, 'teacher', teacher.id]
      )

      await client.query('COMMIT')

      return successResponse({ teacher }, 201)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Create teacher error:', error)
    return errorResponse(500, 'Failed to create teacher')
  }
}

// Update teacher information
async function updateTeacher(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    const { name, email, photo_url, description } = JSON.parse(event.body)

    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      UPDATE teachers 
      SET name = $1, email = $2, photo_url = $3, description = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND is_active = true
      RETURNING *
    `
    
    const result = await query(queryText, [name, email, photo_url, description, teacherId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Teacher not found')
    }

    return successResponse({ teacher: result.rows[0] })
  } catch (error) {
    console.error('Update teacher error:', error)
    return errorResponse(500, 'Failed to update teacher')
  }
}

// Delete teacher (soft delete)
async function deleteTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const teacherId = parseInt(event.path.split('/')[3])

    // Soft delete teacher and user
    await query('UPDATE teachers SET is_active = false WHERE id = $1', [teacherId])
    await query('UPDATE users SET is_active = false WHERE teacher_id = $1', [teacherId])

    return successResponse({ message: 'Teacher deleted successfully' })
  } catch (error) {
    console.error('Delete teacher error:', error)
    return errorResponse(500, 'Failed to delete teacher')
  }
}

// Reactivate teacher
async function reactivateTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const teacherId = parseInt(event.path.split('/')[3])

    // Reactivate teacher and user
    await query('UPDATE teachers SET is_active = true WHERE id = $1', [teacherId])
    await query('UPDATE users SET is_active = true WHERE teacher_id = $1', [teacherId])

    return successResponse({ message: 'Teacher reactivated successfully' })
  } catch (error) {
    console.error('Reactivate teacher error:', error)
    return errorResponse(500, 'Failed to reactivate teacher')
  }
}

// Get teacher's students
async function getTeacherStudents(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    
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
    console.error('Get teacher students error:', error)
    return errorResponse(500, 'Failed to fetch students')
  }
}

// Get teacher's schedule
async function getTeacherSchedule(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    const { week_start } = event.queryStringParameters || {}
    
    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const weekStart = week_start || require('./utils/database').getCurrentWeekStart()

    const queryText = `
      SELECT ss.*, s.name as student_name, s.id as student_id
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      WHERE ss.teacher_id = $1 AND ss.week_start_date = $2 AND s.is_active = true
      ORDER BY ss.day_of_week, ss.time_slot
    `
    
    const result = await query(queryText, [teacherId, weekStart])
    return successResponse({ schedule: result.rows })
  } catch (error) {
    console.error('Get teacher schedule error:', error)
    return errorResponse(500, 'Failed to fetch schedule')
  }
}

// Get teacher statistics
async function getTeacherStats(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    
    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(ss.id) as total_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
        ROUND(
          (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(ss.id), 0)) * 100, 2
        ) as attendance_rate
      FROM teachers t
      LEFT JOIN students s ON t.id = s.teacher_id AND s.is_active = true
      LEFT JOIN student_schedules ss ON t.id = ss.teacher_id
      WHERE t.id = $1
    `
    
    const result = await query(queryText, [teacherId])
    return successResponse({ stats: result.rows[0] })
  } catch (error) {
    console.error('Get teacher stats error:', error)
    return errorResponse(500, 'Failed to fetch statistics')
  }
}

// Get random teachers for showcase
async function getRandomTeachers(event, user) {
  try {
    const count = parseInt(event.path.split('/')[4]) || 3

    const queryText = `
      SELECT t.*
      FROM teachers t
      WHERE t.is_active = true
      ORDER BY RANDOM()
      LIMIT $1
    `
    
    const result = await query(queryText, [count])
    return successResponse({ teachers: result.rows })
  } catch (error) {
    console.error('Get random teachers error:', error)
    return errorResponse(500, 'Failed to fetch teachers')
  }
}

// Get teacher monthly statistics
async function getTeacherMonthlyStats(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    const year = parseInt(event.path.split('/')[5])
    const month = parseInt(event.path.split('/')[6])
    
    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      SELECT * FROM get_teacher_monthly_stats($1, $2, $3)
    `
    
    const result = await query(queryText, [teacherId, year, month])
    return successResponse({ stats: result.rows })
  } catch (error) {
    console.error('Get teacher monthly stats error:', error)
    return errorResponse(500, 'Failed to fetch monthly statistics')
  }
}

// Search teachers
async function searchTeachers(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { q, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    let queryText = `
      SELECT t.*, u.username, u.is_active as user_active,
             COUNT(s.id) as student_count
      FROM teachers t
      LEFT JOIN users u ON t.id = u.teacher_id
      LEFT JOIN students s ON t.id = s.teacher_id AND s.is_active = true
      WHERE t.is_active = true
    `
    let params = []
    let paramCount = 0

    if (q) {
      queryText += ` AND (t.name ILIKE $${++paramCount} OR t.email ILIKE $${paramCount})`
      params.push(`%${q}%`)
    }

    queryText += ` GROUP BY t.id, u.username, u.is_active ORDER BY t.name LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    return successResponse({ teachers: result.rows })
  } catch (error) {
    console.error('Search teachers error:', error)
    return errorResponse(500, 'Failed to search teachers')
  }
}

// Get inactive teachers (admin only)
async function getInactiveTeachers(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      SELECT t.*, u.username, u.is_active as user_active
      FROM teachers t
      LEFT JOIN users u ON t.id = u.teacher_id
      WHERE t.is_active = false
      ORDER BY t.name
    `
    
    const result = await query(queryText)
    return successResponse({ teachers: result.rows })
  } catch (error) {
    console.error('Get inactive teachers error:', error)
    return errorResponse(500, 'Failed to fetch inactive teachers')
  }
}
