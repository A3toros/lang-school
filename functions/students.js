import { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders } from './utils/database.js'

export const handler = async (event, context) => {
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
    const { name, date_from, date_to, lessons_min, lessons_max, page, limit } = event.queryStringParameters || {}
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

    queryText += ` GROUP BY s.id, t.name`

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

    queryText += ` ORDER BY s.added_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    return successResponse({ students: result.rows })
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
    const { name, teacher_id, lessons_per_week } = JSON.parse(event.body)

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

// Delete student (soft delete)
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

    await query('UPDATE students SET is_active = false WHERE id = $1', [studentId])
    return successResponse({ message: 'Student deleted successfully' })
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

// Get student's schedule
async function getStudentSchedule(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])
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
      WHERE ss.student_id = $1 AND ss.attendance_status IN ('completed', 'absent')
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
           NULLIF(COUNT(ss.id), 0)) * 100, 2
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
      SELECT s.*, t.name as teacher_name
      FROM students s
      LEFT JOIN teachers t ON s.teacher_id = t.id
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
