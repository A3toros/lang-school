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
    // Verify authentication for all routes
    let user
    try {
      user = verifyToken(event)
    } catch (error) {
      return errorResponse(401, 'Unauthorized')
    }

    // Route to appropriate handler
    if (path === '/api/reports' && method === 'GET') {
      return await getReports(event, user)
    } else if (path.match(/^\/api\/reports\/\d+$/) && method === 'GET') {
      return await getReport(event, user)
    } else if (path === '/api/reports' && method === 'POST') {
      return await createReport(event, user)
    } else if (path.match(/^\/api\/reports\/\d+$/) && method === 'PUT') {
      return await updateReport(event, user)
    } else if (path.match(/^\/api\/reports\/\d+$/) && method === 'DELETE') {
      return await deleteReport(event, user)
    } else if (path.match(/^\/api\/reports\/teacher\/\d+$/) && method === 'GET') {
      return await getTeacherReports(event, user)
    } else if (path.match(/^\/api\/reports\/student\/\d+$/) && method === 'GET') {
      return await getStudentReports(event, user)
    } else if (path.match(/^\/api\/reports\/date\/.+$/) && method === 'GET') {
      return await getReportsByDate(event, user)
    } else if (path.match(/^\/api\/reports\/week\/.+$/) && method === 'GET') {
      return await getWeeklyReports(event, user)
    } else if (path.match(/^\/api\/reports\/month\/\d+\/\d+$/) && method === 'GET') {
      return await getMonthlyReports(event, user)
    } else if (path === '/api/reports/bulk-create' && method === 'POST') {
      return await bulkCreateReports(event, user)
    } else if (path === '/api/reports/export' && method === 'GET') {
      return await exportReports(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Reports API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get lesson reports
async function getReports(event, user) {
  try {
    const { teacher_id, student_id, date_from, date_to, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    let queryText = `
      SELECT lr.*, s.name as student_name, t.name as teacher_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE s.is_active = true AND t.is_active = true
    `
    let params = []
    let paramCount = 0

    // Add filters
    if (teacher_id) {
      queryText += ` AND lr.teacher_id = $${++paramCount}`
      params.push(teacher_id)
    }

    if (student_id) {
      queryText += ` AND lr.student_id = $${++paramCount}`
      params.push(student_id)
    }

    if (date_from) {
      queryText += ` AND lr.lesson_date >= $${++paramCount}`
      params.push(date_from)
    }

    if (date_to) {
      queryText += ` AND lr.lesson_date <= $${++paramCount}`
      params.push(date_to)
    }

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND lr.teacher_id = $${++paramCount}`
      params.push(user.teacherId)
    }

    queryText += ` ORDER BY lr.lesson_date DESC, lr.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('Get reports error:', error)
    return errorResponse(500, 'Failed to fetch reports')
  }
}

// Get specific report
async function getReport(event, user) {
  try {
    const reportId = parseInt(event.path.split('/')[3])

    const queryText = `
      SELECT lr.*, s.name as student_name, t.name as teacher_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE lr.id = $1
    `
    
    const result = await query(queryText, [reportId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Report not found')
    }

    const report = result.rows[0]

    // Check permissions
    if (user.role === 'teacher' && report.teacher_id !== user.teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    return successResponse({ report })
  } catch (error) {
    console.error('Get report error:', error)
    return errorResponse(500, 'Failed to fetch report')
  }
}

// Create lesson report
async function createReport(event, user) {
  try {
    const { student_id, lesson_date, time_slot, comment } = JSON.parse(event.body)

    if (!student_id || !lesson_date || !time_slot) {
      return errorResponse(400, 'student_id, lesson_date, and time_slot are required')
    }

    // Check permissions - teachers can only create reports for their own students
    if (user.role === 'teacher') {
      const studentCheck = await query(
        'SELECT teacher_id FROM students WHERE id = $1',
        [student_id]
      )
      
      if (studentCheck.rows.length === 0) {
        return errorResponse(404, 'Student not found')
      }
      
      if (studentCheck.rows[0].teacher_id !== user.teacherId) {
        return errorResponse(403, 'Forbidden')
      }
    }

    const queryText = `
      INSERT INTO lesson_reports (teacher_id, student_id, lesson_date, time_slot, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    
    const teacherId = user.role === 'admin' ? 
      (JSON.parse(event.body).teacher_id || user.teacherId) : 
      user.teacherId

    const result = await query(queryText, [teacherId, student_id, lesson_date, time_slot, comment || null])
    return successResponse({ report: result.rows[0] }, 201)
  } catch (error) {
    console.error('Create report error:', error)
    return errorResponse(500, 'Failed to create report')
  }
}

// Update lesson report
async function updateReport(event, user) {
  try {
    const reportId = parseInt(event.path.split('/')[3])
    const { comment } = JSON.parse(event.body)

    // Check permissions
    const reportCheck = await query(
      'SELECT teacher_id FROM lesson_reports WHERE id = $1',
      [reportId]
    )

    if (reportCheck.rows.length === 0) {
      return errorResponse(404, 'Report not found')
    }

    const report = reportCheck.rows[0]

    // Teachers can only update their own reports
    if (user.role === 'teacher' && report.teacher_id !== user.teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      UPDATE lesson_reports 
      SET comment = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `
    
    const result = await query(queryText, [comment, reportId])
    return successResponse({ report: result.rows[0] })
  } catch (error) {
    console.error('Update report error:', error)
    return errorResponse(500, 'Failed to update report')
  }
}

// Delete lesson report
async function deleteReport(event, user) {
  try {
    const reportId = parseInt(event.path.split('/')[3])

    // Check permissions
    const reportCheck = await query(
      'SELECT teacher_id FROM lesson_reports WHERE id = $1',
      [reportId]
    )

    if (reportCheck.rows.length === 0) {
      return errorResponse(404, 'Report not found')
    }

    const report = reportCheck.rows[0]

    // Teachers can only delete their own reports
    if (user.role === 'teacher' && report.teacher_id !== user.teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    await query('DELETE FROM lesson_reports WHERE id = $1', [reportId])
    return successResponse({ message: 'Report deleted successfully' })
  } catch (error) {
    console.error('Delete report error:', error)
    return errorResponse(500, 'Failed to delete report')
  }
}

// Get teacher's reports
async function getTeacherReports(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[4])
    const { date_from, date_to, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    let queryText = `
      SELECT lr.*, s.name as student_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      WHERE lr.teacher_id = $1 AND s.is_active = true
    `
    let params = [teacherId]
    let paramCount = 1

    if (date_from) {
      queryText += ` AND lr.lesson_date >= $${++paramCount}`
      params.push(date_from)
    }

    if (date_to) {
      queryText += ` AND lr.lesson_date <= $${++paramCount}`
      params.push(date_to)
    }

    queryText += ` ORDER BY lr.lesson_date DESC, lr.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('Get teacher reports error:', error)
    return errorResponse(500, 'Failed to fetch teacher reports')
  }
}

// Get student's reports
async function getStudentReports(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[4])
    const { date_from, date_to, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

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
      SELECT lr.*, t.name as teacher_name
      FROM lesson_reports lr
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE lr.student_id = $1 AND t.is_active = true
    `
    let params = [studentId]
    let paramCount = 1

    if (date_from) {
      queryText += ` AND lr.lesson_date >= $${++paramCount}`
      params.push(date_from)
    }

    if (date_to) {
      queryText += ` AND lr.lesson_date <= $${++paramCount}`
      params.push(date_to)
    }

    queryText += ` ORDER BY lr.lesson_date DESC, lr.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('Get student reports error:', error)
    return errorResponse(500, 'Failed to fetch student reports')
  }
}

// Get reports by date
async function getReportsByDate(event, user) {
  try {
    const date = event.path.split('/')[4]

    let queryText = `
      SELECT lr.*, s.name as student_name, t.name as teacher_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE lr.lesson_date = $1 AND s.is_active = true AND t.is_active = true
    `
    let params = [date]

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND lr.teacher_id = $2`
      params.push(user.teacherId)
    }

    queryText += ` ORDER BY lr.time_slot`

    const result = await query(queryText, params)
    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('Get reports by date error:', error)
    return errorResponse(500, 'Failed to fetch reports by date')
  }
}

// Get weekly reports
async function getWeeklyReports(event, user) {
  try {
    const date = event.path.split('/')[4]
    const weekStart = require('./utils/database').getWeekStart(date)
    const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    let queryText = `
      SELECT lr.*, s.name as student_name, t.name as teacher_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE lr.lesson_date BETWEEN $1 AND $2 AND s.is_active = true AND t.is_active = true
    `
    let params = [weekStart, weekEnd]

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND lr.teacher_id = $3`
      params.push(user.teacherId)
    }

    queryText += ` ORDER BY lr.lesson_date, lr.time_slot`

    const result = await query(queryText, params)
    return successResponse({ 
      reports: result.rows,
      week_start: weekStart,
      week_end: weekEnd
    })
  } catch (error) {
    console.error('Get weekly reports error:', error)
    return errorResponse(500, 'Failed to fetch weekly reports')
  }
}

// Get monthly reports
async function getMonthlyReports(event, user) {
  try {
    const year = parseInt(event.path.split('/')[4])
    const month = parseInt(event.path.split('/')[5])

    let queryText = `
      SELECT lr.*, s.name as student_name, t.name as teacher_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE EXTRACT(YEAR FROM lr.lesson_date) = $1 
        AND EXTRACT(MONTH FROM lr.lesson_date) = $2
        AND s.is_active = true AND t.is_active = true
    `
    let params = [year, month]

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND lr.teacher_id = $3`
      params.push(user.teacherId)
    }

    queryText += ` ORDER BY lr.lesson_date, lr.time_slot`

    const result = await query(queryText, params)
    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('Get monthly reports error:', error)
    return errorResponse(500, 'Failed to fetch monthly reports')
  }
}

// Bulk create reports
async function bulkCreateReports(event, user) {
  try {
    const { reports } = JSON.parse(event.body)

    if (!Array.isArray(reports)) {
      return errorResponse(400, 'reports must be an array')
    }

    const client = await require('./utils/database').getPool().connect()
    
    try {
      await client.query('BEGIN')

      for (const report of reports) {
        const { student_id, lesson_date, time_slot, comment } = report

        // Check permissions for each report
        if (user.role === 'teacher') {
          const studentCheck = await client.query(
            'SELECT teacher_id FROM students WHERE id = $1',
            [student_id]
          )
          
          if (studentCheck.rows.length === 0) continue
          
          if (studentCheck.rows[0].teacher_id !== user.teacherId) continue
        }

        await client.query(
          'INSERT INTO lesson_reports (teacher_id, student_id, lesson_date, time_slot, comment) VALUES ($1, $2, $3, $4, $5)',
          [user.role === 'admin' ? report.teacher_id : user.teacherId, student_id, lesson_date, time_slot, comment || null]
        )
      }

      await client.query('COMMIT')
      return successResponse({ message: 'Reports created successfully' })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Bulk create reports error:', error)
    return errorResponse(500, 'Failed to create reports')
  }
}

// Export reports data
async function exportReports(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { date_from, date_to } = event.queryStringParameters || {}

    let queryText = `
      SELECT lr.*, s.name as student_name, t.name as teacher_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE s.is_active = true AND t.is_active = true
    `
    let params = []

    if (date_from) {
      queryText += ` AND lr.lesson_date >= $1`
      params.push(date_from)
    }

    if (date_to) {
      queryText += ` AND lr.lesson_date <= $2`
      params.push(date_to)
    }

    queryText += ` ORDER BY lr.lesson_date DESC, lr.created_at DESC`

    const result = await query(queryText, params)
    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('Export reports error:', error)
    return errorResponse(500, 'Failed to export reports data')
  }
}
