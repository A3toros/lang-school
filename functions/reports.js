require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders, getPool, getWeekStart  } = require('./utils/database.js')

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
  console.log('🔍 [REPORTS] getReports called', {
    userId: user.userId,
    role: user.role,
    queryParams: event.queryStringParameters
  })

  try {
    const { teacher_id, student_id, date_from, date_to, lesson_date, time_slot, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    console.log('📋 [REPORTS] Query parameters parsed', {
      teacher_id,
      student_id,
      date_from,
      date_to,
      lesson_date,
      time_slot,
      page,
      limit,
      offset
    })

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
      queryText += ` AND lr.lesson_date::date >= $${++paramCount}::date`
      params.push(date_from)
    }

    if (date_to) {
      queryText += ` AND lr.lesson_date::date <= $${++paramCount}::date`
      params.push(date_to)
    }

    if (lesson_date) {
      queryText += ` AND lr.lesson_date::date = $${++paramCount}::date`
      params.push(lesson_date)
    }

    if (time_slot) {
      queryText += ` AND lr.time_slot = $${++paramCount}`
      params.push(time_slot)
    }

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND lr.teacher_id = $${++paramCount}`
      params.push(user.teacherId)
    }

    queryText += ` ORDER BY lr.lesson_date DESC, lr.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    console.log('🔍 [REPORTS] Executing query', {
      queryText: queryText.substring(0, 200) + '...',
      paramsCount: params.length
    })

    const result = await query(queryText, params)
    
    console.log('✅ [REPORTS] Reports fetched successfully', {
      count: result.rows.length,
      reports: result.rows.map(r => ({ id: r.id, student_name: r.student_name, teacher_name: r.teacher_name }))
    })

    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('❌ [REPORTS] Get reports error:', error)
    return errorResponse(500, 'Failed to fetch reports')
  }
}

// Get specific report
async function getReport(event, user) {
  console.log('🔍 [REPORTS] getReport called', {
    userId: user.userId,
    role: user.role,
    reportId: event.path.split('/')[3]
  })

  try {
    const reportId = parseInt(event.path.split('/')[3])

    console.log('📋 [REPORTS] Fetching report', { reportId })

    const queryText = `
      SELECT lr.*, s.name as student_name, t.name as teacher_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE lr.id = $1
    `
    
    const result = await query(queryText, [reportId])
    
    if (result.rows.length === 0) {
      console.log('❌ [REPORTS] Report not found', { reportId })
      return errorResponse(404, 'Report not found')
    }

    const report = result.rows[0]

    console.log('🔍 [REPORTS] Report found, checking permissions', {
      reportId,
      teacherId: report.teacher_id,
      userTeacherId: user.teacherId,
      userRole: user.role
    })

    // Check permissions
    if (user.role === 'teacher' && report.teacher_id !== user.teacherId) {
      console.log('❌ [REPORTS] Access forbidden - not teacher\'s report', {
        reportTeacherId: report.teacher_id,
        userTeacherId: user.teacherId
      })
      return errorResponse(403, 'Forbidden')
    }

    console.log('✅ [REPORTS] Report fetched successfully', {
      reportId,
      studentName: report.student_name,
      teacherName: report.teacher_name
    })

    return successResponse({ report })
  } catch (error) {
    console.error('❌ [REPORTS] Get report error:', error)
    return errorResponse(500, 'Failed to fetch report')
  }
}

// Create lesson report
async function createReport(event, user) {
  console.log('🔍 [REPORTS] createReport called', {
    userId: user.userId,
    role: user.role,
    body: JSON.parse(event.body)
  })

  try {
    const { student_id, lesson_date, time_slot, comment } = JSON.parse(event.body)

    console.log('📋 [REPORTS] Report data validation', {
      student_id,
      lesson_date,
      time_slot,
      hasComment: !!comment
    })

    if (!student_id || !lesson_date || !time_slot) {
      console.log('❌ [REPORTS] Missing required fields', {
        student_id: !!student_id,
        lesson_date: !!lesson_date,
        time_slot: !!time_slot
      })
      return errorResponse(400, 'student_id, lesson_date, and time_slot are required')
    }

    // Check permissions - teachers can only create reports for their own students
    if (user.role === 'teacher') {
      console.log('🔍 [REPORTS] Checking teacher permissions', {
        studentId: student_id,
        userTeacherId: user.teacherId
      })

      const studentCheck = await query(
        'SELECT s.id FROM students s WHERE s.id = $1',
        [student_id]
      )
      
      if (studentCheck.rows.length === 0) {
        console.log('❌ [REPORTS] Student not found', { studentId: student_id })
        return errorResponse(404, 'Student not found')
      }

      // Check if teacher is assigned to this student (multi-teacher system)
      const teacherStudentCheck = await query(
        'SELECT 1 FROM student_teachers WHERE student_id = $1 AND teacher_id = $2',
        [student_id, user.teacherId]
      )
      
      if (teacherStudentCheck.rows.length === 0) {
        console.log('❌ [REPORTS] Access forbidden - teacher not assigned to student', {
          studentId: student_id,
          userTeacherId: user.teacherId
        })
        return errorResponse(403, 'Forbidden - You are not assigned to this student')
      }

      console.log('✅ [REPORTS] Teacher permissions verified')
    }

    const queryText = `
      INSERT INTO lesson_reports (teacher_id, student_id, lesson_date, time_slot, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    
    const teacherId = user.role === 'admin' ? 
      (JSON.parse(event.body).teacher_id || user.teacherId) : 
      user.teacherId

    console.log('🔍 [REPORTS] Creating report', {
      teacherId,
      studentId: student_id,
      lessonDate: lesson_date,
      timeSlot: time_slot
    })

    const result = await query(queryText, [teacherId, student_id, lesson_date, time_slot, comment || null])
    
    console.log('✅ [REPORTS] Report created successfully', {
      reportId: result.rows[0].id,
      teacherId,
      studentId: student_id
    })

    return successResponse({ report: result.rows[0] }, 201)
  } catch (error) {
    console.error('❌ [REPORTS] Create report error:', error)
    return errorResponse(500, 'Failed to create report')
  }
}

// Update lesson report
async function updateReport(event, user) {
  console.log('🔍 [REPORTS] updateReport called', {
    userId: user.userId,
    role: user.role,
    reportId: event.path.split('/')[3],
    body: JSON.parse(event.body)
  })

  try {
    const reportId = parseInt(event.path.split('/')[3])
    const { comment } = JSON.parse(event.body)

    console.log('📋 [REPORTS] Updating report', { reportId, comment })

    // Check permissions
    const reportCheck = await query(
      'SELECT teacher_id FROM lesson_reports WHERE id = $1',
      [reportId]
    )

    if (reportCheck.rows.length === 0) {
      console.log('❌ [REPORTS] Report not found', { reportId })
      return errorResponse(404, 'Report not found')
    }

    const report = reportCheck.rows[0]

    console.log('🔍 [REPORTS] Checking update permissions', {
      reportTeacherId: report.teacher_id,
      userTeacherId: user.teacherId,
      userRole: user.role
    })

    // Teachers can only update their own reports
    if (user.role === 'teacher' && report.teacher_id !== user.teacherId) {
      console.log('❌ [REPORTS] Update forbidden - not teachers report', {
        reportTeacherId: report.teacher_id,
        userTeacherId: user.teacherId
      })
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      UPDATE lesson_reports 
      SET comment = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `
    
    const result = await query(queryText, [comment, reportId])
    
    console.log('✅ [REPORTS] Report updated successfully', {
      reportId,
      comment
    })

    return successResponse({ report: result.rows[0] })
  } catch (error) {
    console.error('❌ [REPORTS] Update report error:', error)
    return errorResponse(500, 'Failed to update report')
  }
}

// Delete lesson report
async function deleteReport(event, user) {
  console.log('🔍 [REPORTS] deleteReport called', {
    userId: user.userId,
    role: user.role,
    reportId: event.path.split('/')[3]
  })

  try {
    const reportId = parseInt(event.path.split('/')[3])

    console.log('📋 [REPORTS] Deleting report', { reportId })

    // Check permissions
    const reportCheck = await query(
      'SELECT teacher_id FROM lesson_reports WHERE id = $1',
      [reportId]
    )

    if (reportCheck.rows.length === 0) {
      console.log('❌ [REPORTS] Report not found', { reportId })
      return errorResponse(404, 'Report not found')
    }

    const report = reportCheck.rows[0]

    console.log('🔍 [REPORTS] Checking delete permissions', {
      reportTeacherId: report.teacher_id,
      userTeacherId: user.teacherId,
      userRole: user.role
    })

    // Teachers can only delete their own reports
    if (user.role === 'teacher' && report.teacher_id !== user.teacherId) {
      console.log('❌ [REPORTS] Delete forbidden - not teachers report', {
        reportTeacherId: report.teacher_id,
        userTeacherId: user.teacherId
      })
      return errorResponse(403, 'Forbidden')
    }

    await query('DELETE FROM lesson_reports WHERE id = $1', [reportId])
    
    console.log('✅ [REPORTS] Report deleted successfully', { reportId })

    return successResponse({ message: 'Report deleted successfully' })
  } catch (error) {
    console.error('❌ [REPORTS] Delete report error:', error)
    return errorResponse(500, 'Failed to delete report')
  }
}

// Get teacher's reports
async function getTeacherReports(event, user) {
  console.log('🔍 [REPORTS] getTeacherReports called', {
    userId: user.userId,
    role: user.role,
    teacherId: event.path.split('/')[4],
    queryParams: event.queryStringParameters
  })

  try {
    const teacherId = parseInt(event.path.split('/')[4])
    const { date_from, date_to, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    console.log('📋 [REPORTS] Teacher reports parameters', {
      teacherId,
      date_from,
      date_to,
      page,
      limit,
      offset
    })

    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      console.log('❌ [REPORTS] Access forbidden - not own teacher reports', {
        requestedTeacherId: teacherId,
        userTeacherId: user.teacherId
      })
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

    console.log('🔍 [REPORTS] Executing teacher reports query', {
      queryText: queryText.substring(0, 200) + '...',
      paramsCount: params.length
    })

    const result = await query(queryText, params)
    
    console.log('✅ [REPORTS] Teacher reports fetched successfully', {
      teacherId,
      count: result.rows.length,
      reports: result.rows.map(r => ({ id: r.id, student_name: r.student_name, lesson_date: r.lesson_date }))
    })

    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('❌ [REPORTS] Get teacher reports error:', error)
    return errorResponse(500, 'Failed to fetch teacher reports')
  }
}

// Get student's reports
async function getStudentReports(event, user) {
  console.log('🔍 [REPORTS] getStudentReports called', {
    userId: user.userId,
    role: user.role,
    studentId: event.path.split('/')[4],
    queryParams: event.queryStringParameters
  })

  try {
    const studentId = parseInt(event.path.split('/')[4])
    const { date_from, date_to, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })

    console.log('📋 [REPORTS] Student reports parameters', {
      studentId,
      date_from,
      date_to,
      page,
      limit,
      offset
    })

    // Check permissions
    if (user.role === 'teacher') {
      console.log('🔍 [REPORTS] Checking teacher permissions for student', {
        studentId,
        userTeacherId: user.teacherId
      })

      const studentCheck = await query(
        'SELECT 1 FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_active = true',
        [studentId, user.teacherId]
      )
      
      if (studentCheck.rows.length === 0) {
        console.log('❌ [REPORTS] Access forbidden - not teachers student', {
          studentId,
          userTeacherId: user.teacherId
        })
        return errorResponse(403, 'Forbidden')
      }

      console.log('✅ [REPORTS] Teacher permissions verified')
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

    console.log('🔍 [REPORTS] Executing student reports query', {
      queryText: queryText.substring(0, 200) + '...',
      paramsCount: params.length
    })

    const result = await query(queryText, params)
    
    console.log('✅ [REPORTS] Student reports fetched successfully', {
      studentId,
      count: result.rows.length,
      reports: result.rows.map(r => ({ id: r.id, teacher_name: r.teacher_name, lesson_date: r.lesson_date }))
    })

    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('❌ [REPORTS] Get student reports error:', error)
    return errorResponse(500, 'Failed to fetch student reports')
  }
}

// Get reports by date
async function getReportsByDate(event, user) {
  console.log('🔍 [REPORTS] getReportsByDate called', {
    userId: user.userId,
    role: user.role,
    date: event.path.split('/')[4]
  })

  try {
    const date = event.path.split('/')[4]

    console.log('📋 [REPORTS] Fetching reports by date', { date })

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
      console.log('🔍 [REPORTS] Filtering by teacher', { teacherId: user.teacherId })
    }

    queryText += ` ORDER BY lr.time_slot`

    console.log('🔍 [REPORTS] Executing date reports query', {
      queryText: queryText.substring(0, 200) + '...',
      paramsCount: params.length
    })

    const result = await query(queryText, params)
    
    console.log('✅ [REPORTS] Reports by date fetched successfully', {
      date,
      count: result.rows.length,
      reports: result.rows.map(r => ({ id: r.id, student_name: r.student_name, teacher_name: r.teacher_name, time_slot: r.time_slot }))
    })

    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('❌ [REPORTS] Get reports by date error:', error)
    return errorResponse(500, 'Failed to fetch reports by date')
  }
}

// Get weekly reports
async function getWeeklyReports(event, user) {
  console.log('🔍 [REPORTS] getWeeklyReports called', {
    userId: user.userId,
    role: user.role,
    date: event.path.split('/')[4]
  })

  try {
    const date = event.path.split('/')[4]
    const weekStart = getWeekStart(date)
    const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log('📋 [REPORTS] Weekly reports parameters', {
      date,
      weekStart,
      weekEnd
    })

    let queryText = `
      SELECT lr.*, s.name as student_name, s.student_level, t.name as teacher_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE lr.week_start_date = $1 AND s.is_active = true AND t.is_active = true
    `
    let params = [weekStart]

    // Filter by teacher if user is a teacher
    if (user.role === 'teacher') {
      queryText += ` AND lr.teacher_id = $2`
      params.push(user.teacherId)
      console.log('🔍 [REPORTS] Filtering by teacher', { teacherId: user.teacherId })
    }

    queryText += ` ORDER BY lr.lesson_date, lr.time_slot`

    console.log('🔍 [REPORTS] Executing weekly reports query', {
      queryText: queryText.substring(0, 200) + '...',
      paramsCount: params.length
    })

    const result = await query(queryText, params)
    
    console.log('✅ [REPORTS] Weekly reports fetched successfully', {
      weekStart,
      weekEnd,
      count: result.rows.length,
      reports: result.rows.map(r => ({ id: r.id, student_name: r.student_name, teacher_name: r.teacher_name, lesson_date: r.lesson_date }))
    })

    return successResponse({ 
      reports: result.rows,
      week_start: weekStart,
      week_end: weekEnd
    })
  } catch (error) {
    console.error('❌ [REPORTS] Get weekly reports error:', error)
    return errorResponse(500, 'Failed to fetch weekly reports')
  }
}

// Get monthly reports
async function getMonthlyReports(event, user) {
  console.log('🔍 [REPORTS] getMonthlyReports called', {
    userId: user.userId,
    role: user.role,
    year: event.path.split('/')[4],
    month: event.path.split('/')[5]
  })

  try {
    const year = parseInt(event.path.split('/')[4])
    const month = parseInt(event.path.split('/')[5])

    console.log('📋 [REPORTS] Monthly reports parameters', { year, month })

    let queryText = `
      SELECT lr.*, s.name as student_name, s.student_level, t.name as teacher_name
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
      console.log('🔍 [REPORTS] Filtering by teacher', { teacherId: user.teacherId })
    }

    queryText += ` ORDER BY lr.lesson_date, lr.time_slot`

    console.log('🔍 [REPORTS] Executing monthly reports query', {
      queryText: queryText.substring(0, 200) + '...',
      paramsCount: params.length
    })

    const result = await query(queryText, params)
    
    console.log('✅ [REPORTS] Monthly reports fetched successfully', {
      year,
      month,
      count: result.rows.length,
      reports: result.rows.map(r => ({ id: r.id, student_name: r.student_name, teacher_name: r.teacher_name, lesson_date: r.lesson_date }))
    })

    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('❌ [REPORTS] Get monthly reports error:', error)
    return errorResponse(500, 'Failed to fetch monthly reports')
  }
}

// Bulk create reports
async function bulkCreateReports(event, user) {
  console.log('🔍 [REPORTS] bulkCreateReports called', {
    userId: user.userId,
    role: user.role,
    reportsCount: JSON.parse(event.body).reports?.length
  })

  try {
    const { reports } = JSON.parse(event.body)

    console.log('📋 [REPORTS] Bulk create parameters', {
      reportsCount: reports?.length,
      isArray: Array.isArray(reports)
    })

    if (!Array.isArray(reports)) {
      console.log('❌ [REPORTS] Invalid reports format', { type: typeof reports })
      return errorResponse(400, 'reports must be an array')
    }

    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')
      console.log('🔍 [REPORTS] Transaction started')

      let createdCount = 0
      let skippedCount = 0

      for (const report of reports) {
        const { student_id, lesson_date, time_slot, comment } = report

        console.log('🔍 [REPORTS] Processing report', {
          student_id,
          lesson_date,
          time_slot,
          hasComment: !!comment
        })

        // Check permissions for each report
        if (user.role === 'teacher') {
          const studentCheck = await client.query(
            'SELECT 1 FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_active = true',
            [student_id, user.teacherId]
          )
          
          if (studentCheck.rows.length === 0) {
            console.log('⚠️ [REPORTS] Skipping report - not teacher\'s student', {
              student_id,
              userTeacherId: user.teacherId
            })
            skippedCount++
            continue
          }
        }

        await client.query(
          'INSERT INTO lesson_reports (teacher_id, student_id, lesson_date, time_slot, comment) VALUES ($1, $2, $3, $4, $5)',
          [user.role === 'admin' ? report.teacher_id : user.teacherId, student_id, lesson_date, time_slot, comment || null]
        )
        
        createdCount++
        console.log('✅ [REPORTS] Report created', { student_id, lesson_date })
      }

      await client.query('COMMIT')
      
      console.log('✅ [REPORTS] Bulk create completed successfully', {
        createdCount,
        skippedCount,
        totalProcessed: reports.length
      })

      return successResponse({ 
        message: 'Reports created successfully',
        created: createdCount,
        skipped: skippedCount
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.log('❌ [REPORTS] Transaction rolled back due to error')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ [REPORTS] Bulk create reports error:', error)
    return errorResponse(500, 'Failed to create reports')
  }
}

// Export reports data
async function exportReports(event, user) {
  console.log('🔍 [REPORTS] exportReports called', {
    userId: user.userId,
    role: user.role,
    queryParams: event.queryStringParameters
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [REPORTS] Export forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const { date_from, date_to } = event.queryStringParameters || {}

    console.log('📋 [REPORTS] Export parameters', { date_from, date_to })

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

    console.log('🔍 [REPORTS] Executing export query', {
      queryText: queryText.substring(0, 200) + '...',
      paramsCount: params.length
    })

    const result = await query(queryText, params)
    
    console.log('✅ [REPORTS] Export completed successfully', {
      count: result.rows.length
    })

    return successResponse({ reports: result.rows })
  } catch (error) {
    console.error('❌ [REPORTS] Export reports error:', error)
    return errorResponse(500, 'Failed to export reports data')
  }
}

// getWeekStart function is now imported from utils/database.js
