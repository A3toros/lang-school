require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders  } = require('./utils/database.js')

let telemetryTableInitialized = false

async function ensureTelemetryTable(query) {
  if (telemetryTableInitialized) return
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS cache_telemetry (
        id BIGSERIAL PRIMARY KEY,
        user_id INT NULL,
        user_role TEXT NULL,
        event TEXT NOT NULL,
        resource TEXT NULL,
        resource_id TEXT NULL,
        endpoint TEXT NULL,
        etag TEXT NULL,
        version TEXT NULL,
        status TEXT NULL,
        latency_ms INT NULL,
        ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
  } catch (e) {
    // ignore init errors to avoid impacting primary flows
  } finally {
    telemetryTableInitialized = true
  }
}

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

    // One-time ensure telemetry table exists
    await ensureTelemetryTable(query)

    // Route to appropriate handler
    if (path === '/api/analytics/overview' && method === 'GET') {
      return await getSystemOverview(event, user)
    } else if (path === '/api/analytics/teachers' && method === 'GET') {
      return await getTeacherAnalytics(event, user)
    } else if (path === '/api/analytics/students' && method === 'GET') {
      return await getStudentAnalytics(event, user)
    } else if (path === '/api/analytics/attendance' && method === 'GET') {
      return await getAttendanceAnalytics(event, user)
    } else if (path === '/api/analytics/monthly/:teacherId' && method === 'GET') {
      return await getMonthlyTeacherStats(event, user)
    } else if (path === '/api/analytics/trends' && method === 'GET') {
      return await getPerformanceTrends(event, user)
    } else if (path === '/api/analytics/export' && method === 'POST') {
      return await exportAnalyticsData(event, user)
    } else if (path === '/api/analytics/dashboard' && method === 'GET') {
      return await getDashboardData(event, user)
    } else if (path === '/api/analytics/performance' && method === 'GET') {
      return await getPerformanceMetrics(event, user)
    } else if (path === '/api/analytics/reports' && method === 'GET') {
      return await getAnalyticsReports(event, user)
    } else if (path.startsWith('/api/analytics/students/') && path.endsWith('/attendance') && method === 'GET') {
      return await getStudentAttendanceAnalytics(event, user)
    } else if (path === '/api/analytics/cache' && method === 'POST') {
      return await postCacheTelemetry(event, user)
    } else if (path === '/api/analytics/cache' && method === 'GET') {
      return await getCacheTelemetry(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}
// Lightweight cache telemetry endpoint (anonymized, sampled on client)
async function postCacheTelemetry(event, user) {
  try {
    const body = JSON.parse(event.body || '{}')
    const payload = {
      event: String(body.event || 'unknown'),
      resource: body.resource ? String(body.resource) : null,
      resource_id: body.resourceId ? String(body.resourceId) : null,
      endpoint: body.endpoint ? String(body.endpoint) : null,
      etag: body.etag ? String(body.etag) : null,
      version: body.version ? String(body.version) : null,
      status: body.status ? String(body.status) : null,
      latency_ms: typeof body.latencyMs === 'number' ? Math.min(Math.max(body.latencyMs, 0), 600000) : null,
      user_id: user.userId,
      user_role: user.role
    }
    await query(
      `INSERT INTO cache_telemetry (user_id, user_role, event, resource, resource_id, endpoint, etag, version, status, latency_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [payload.user_id, payload.user_role, payload.event, payload.resource, payload.resource_id, payload.endpoint, payload.etag, payload.version, payload.status, payload.latency_ms]
    )
    return successResponse({ ok: true })
  } catch (error) {
    return errorResponse(400, 'Invalid telemetry payload')
  }
}

async function getCacheTelemetry(event, user) {
  try {
    if (user.role !== 'admin') return errorResponse(403, 'Forbidden')
    const { limit = '100', resource, user_id } = event.queryStringParameters || {}
    let sql = 'SELECT id, ts, user_id, user_role, event, resource, resource_id, endpoint, etag, version, status, latency_ms FROM cache_telemetry'
    const params = []
    let where = []
    if (resource) { params.push(resource); where.push(`resource = $${params.length}`) }
    if (user_id) { params.push(parseInt(user_id)); where.push(`user_id = $${params.length}`) }
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += ` ORDER BY id DESC LIMIT $${params.length + 1}`
    params.push(parseInt(limit))
    const res = await query(sql, params)
    return successResponse({ events: res.rows })
  } catch (e) {
    return errorResponse(500, 'Failed to load cache telemetry')
  }
}

// Get system overview statistics
async function getSystemOverview(event, user) {
  console.log('🔍 [ANALYTICS] getSystemOverview called', { 
    userId: user.userId, 
    role: user.role, 
    period: event.queryStringParameters?.period 
  })
  
  try {
    const { period = '30' } = event.queryStringParameters || {}
    const days = parseInt(period)
    console.log('📊 [ANALYTICS] Fetching system overview', { period, days })

    const overviewQuery = `
      SELECT 
        (SELECT COUNT(*) FROM teachers WHERE is_active = true) as total_teachers,
        (SELECT COUNT(*) FROM students WHERE is_active = true) as total_students,
        (SELECT COUNT(*) FROM student_schedules WHERE week_start_date = CURRENT_DATE) as today_lessons,
        (SELECT COUNT(*) FROM lesson_reports WHERE lesson_date = CURRENT_DATE) as today_reports,
        (SELECT COUNT(*) FROM student_schedules 
         WHERE attendance_status = 'completed' 
         AND attendance_date >= CURRENT_DATE - INTERVAL '${days} days') as completed_lessons,
        (SELECT COUNT(*) FROM student_schedules 
         WHERE attendance_status = 'absent' 
         AND attendance_date >= CURRENT_DATE - INTERVAL '${days} days') as absent_lessons
    `

    console.log('🔄 [ANALYTICS] Executing overview query')
    const result = await query(overviewQuery)
    const overview = result.rows[0]

    console.log('✅ [ANALYTICS] System overview fetched successfully', {
      totalTeachers: overview?.total_teachers,
      totalStudents: overview?.total_students,
      todayLessons: overview?.today_lessons,
      completedLessons: overview?.completed_lessons
    })

    return successResponse(overview)
  } catch (error) {
    console.error('❌ [ANALYTICS] Get system overview error:', error)
    return errorResponse(500, 'Failed to get system overview')
  }
}

// Get teacher analytics
async function getTeacherAnalytics(event, user) {
  try {
    const { period = '30' } = event.queryStringParameters || {}
    const days = parseInt(period)

    const teacherAnalyticsQuery = `
      SELECT 
        t.id,
        t.name,
        t.email,
        COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END) as total_lessons,
        COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent') THEN 1 END) as completed_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
        ROUND(
          (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent') THEN ss.id END), 0)) * 100, 2
        ) as attendance_rate,
        COUNT(DISTINCT s.id) as unique_students,
        COUNT(lr.id) as total_reports
      FROM teachers t
      LEFT JOIN student_schedules ss ON t.id = ss.teacher_id 
        AND ss.attendance_date >= CURRENT_DATE - INTERVAL '${days} days'
      LEFT JOIN students s ON ss.student_id = s.id AND s.is_active = true
      LEFT JOIN lesson_reports lr ON t.id = lr.teacher_id 
        AND lr.lesson_date >= CURRENT_DATE - INTERVAL '${days} days'
      WHERE t.is_active = true
      GROUP BY t.id, t.name, t.email
      ORDER BY completed_lessons DESC
    `

    const result = await query(teacherAnalyticsQuery)
    return successResponse({ teachers: result.rows })
  } catch (error) {
    console.error('Get teacher analytics error:', error)
    return errorResponse(500, 'Failed to get teacher analytics')
  }
}

// Get student analytics
async function getStudentAnalytics(event, user) {
  try {
    const { period = '30' } = event.queryStringParameters || {}
    const days = parseInt(period)

    const studentAnalyticsQuery = `
      SELECT 
        s.id,
        s.name,
        t.name as teacher_name,
        s.lessons_per_week,
        s.added_date,
        COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END) as total_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
        ROUND(
          (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END), 0)) * 100, 2
        ) as attendance_rate,
        COUNT(lr.id) as total_reports
      FROM students s
      LEFT JOIN student_teachers st ON s.id = st.student_id AND st.is_active = true
      LEFT JOIN teachers t ON st.teacher_id = t.id
      LEFT JOIN student_schedules ss ON s.id = ss.student_id 
        AND ss.attendance_date >= CURRENT_DATE - INTERVAL '${days} days'
      LEFT JOIN lesson_reports lr ON s.id = lr.student_id 
        AND lr.lesson_date >= CURRENT_DATE - INTERVAL '${days} days'
      WHERE s.is_active = true
      GROUP BY s.id, s.name, t.name, s.lessons_per_week, s.added_date
      ORDER BY completed_lessons DESC
    `

    const result = await query(studentAnalyticsQuery)
    return successResponse({ students: result.rows })
  } catch (error) {
    console.error('Get student analytics error:', error)
    return errorResponse(500, 'Failed to get student analytics')
  }
}

// Get attendance analytics
async function getAttendanceAnalytics(event, user) {
  try {
    const { period = '30' } = event.queryStringParameters || {}
    const days = parseInt(period)

    const attendanceQuery = `
      SELECT 
        DATE_TRUNC('day', attendance_date) as date,
        COUNT(CASE WHEN attendance_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent,
        COUNT(ss.id) as total
      FROM student_schedules ss
      WHERE attendance_date >= CURRENT_DATE - INTERVAL '${days} days'
        AND attendance_date IS NOT NULL
      GROUP BY DATE_TRUNC('day', attendance_date)
      ORDER BY date DESC
    `

    const result = await query(attendanceQuery)
    return successResponse({ attendance: result.rows })
  } catch (error) {
    console.error('Get attendance analytics error:', error)
    return errorResponse(500, 'Failed to get attendance analytics')
  }
}

// Get monthly teacher stats
async function getMonthlyTeacherStats(event, user) {
  try {
    const teacherId = event.path.split('/').pop()
    const { year, month } = event.queryStringParameters || {}
    
    if (!year || !month) {
      return errorResponse(400, 'Year and month are required')
    }

    const result = await query(
      'SELECT * FROM get_teacher_monthly_stats($1, $2, $3)',
      [teacherId, year, month]
    )

    return successResponse({ stats: result.rows })
  } catch (error) {
    console.error('Get monthly teacher stats error:', error)
    return errorResponse(500, 'Failed to get monthly teacher stats')
  }
}

// Get performance trends
async function getPerformanceTrends(event, user) {
  try {
    const { period = '90' } = event.queryStringParameters || {}
    const days = parseInt(period)

    const trendsQuery = `
      SELECT 
        DATE_TRUNC('week', attendance_date) as week,
        COUNT(CASE WHEN attendance_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent,
        ROUND(
          (COUNT(CASE WHEN attendance_status = 'completed' THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END), 0)) * 100, 2
        ) as attendance_rate
      FROM student_schedules ss
      WHERE attendance_date >= CURRENT_DATE - INTERVAL '${days} days'
        AND attendance_date IS NOT NULL
      GROUP BY DATE_TRUNC('week', attendance_date)
      ORDER BY week DESC
    `

    const result = await query(trendsQuery)
    return successResponse({ trends: result.rows })
  } catch (error) {
    console.error('Get performance trends error:', error)
    return errorResponse(500, 'Failed to get performance trends')
  }
}

// Export analytics data
async function exportAnalyticsData(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { type, format = 'json' } = JSON.parse(event.body)
    
    let data
    switch (type) {
      case 'teachers':
        data = await getTeacherAnalytics(event, user)
        break
      case 'students':
        data = await getStudentAnalytics(event, user)
        break
      case 'attendance':
        data = await getAttendanceAnalytics(event, user)
        break
      default:
        return errorResponse(400, 'Invalid export type')
    }

    return successResponse({ 
      data: data.body ? JSON.parse(data.body) : data,
      format,
      exported_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Export analytics data error:', error)
    return errorResponse(500, 'Failed to export analytics data')
  }
}

// Get dashboard data
async function getDashboardData(event, user) {
  try {
    const overview = await getSystemOverview(event, user)
    const teachers = await getTeacherAnalytics(event, user)
    const attendance = await getAttendanceAnalytics(event, user)

    return successResponse({
      overview: overview.body ? JSON.parse(overview.body) : overview,
      teachers: teachers.body ? JSON.parse(teachers.body) : teachers,
      attendance: attendance.body ? JSON.parse(attendance.body) : attendance
    })
  } catch (error) {
    console.error('Get dashboard data error:', error)
    return errorResponse(500, 'Failed to get dashboard data')
  }
}

// Get performance metrics
async function getPerformanceMetrics(event, user) {
  try {
    const { teacherId } = event.queryStringParameters || {}
    
    let queryStr = `
      SELECT 
        t.id,
        t.name,
        AVG(CASE WHEN ss.attendance_status = 'completed' THEN 1.0 ELSE 0.0 END) as avg_attendance,
        COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END) as total_lessons,
        COUNT(lr.id) as total_reports,
        COUNT(DISTINCT s.id) as unique_students
      FROM teachers t
      LEFT JOIN student_schedules ss ON t.id = ss.teacher_id
      LEFT JOIN students s ON ss.student_id = s.id
      LEFT JOIN lesson_reports lr ON t.id = lr.teacher_id
      WHERE t.is_active = true
    `
    
    const params = []
    if (teacherId) {
      queryStr += ' AND t.id = $1'
      params.push(teacherId)
    }
    
    queryStr += ' GROUP BY t.id, t.name ORDER BY avg_attendance DESC'

    const result = await query(queryStr, params)
    return successResponse({ metrics: result.rows })
  } catch (error) {
    console.error('Get performance metrics error:', error)
    return errorResponse(500, 'Failed to get performance metrics')
  }
}

// Get analytics reports
async function getAnalyticsReports(event, user) {
  try {
    const { type, period = '30' } = event.queryStringParameters || {}
    const days = parseInt(period)

    let reportData
    switch (type) {
      case 'weekly':
        reportData = await getPerformanceTrends(event, user)
        break
      case 'monthly':
        reportData = await getAttendanceAnalytics(event, user)
        break
      default:
        reportData = await getDashboardData(event, user)
    }

    return successResponse({ 
      report: reportData.body ? JSON.parse(reportData.body) : reportData,
      generated_at: new Date().toISOString(),
      period: days
    })
  } catch (error) {
    console.error('Get analytics reports error:', error)
    return errorResponse(500, 'Failed to get analytics reports')
  }
}

// Get student attendance analytics
async function getStudentAttendanceAnalytics(event, user) {
  try {
    const { from, to, bucket = 'week' } = event.queryStringParameters || {}
    
    // Extract student ID from path: /api/analytics/students/{id}/attendance
    const pathParts = event.path.split('/')
    const studentId = pathParts[pathParts.length - 2] // Get ID before 'attendance'
    
    if (!studentId || isNaN(studentId)) {
      return errorResponse(400, 'Invalid student ID')
    }

    let queryText = `
      SELECT 
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as warned,
        COUNT(ss.id) as total
      FROM student_schedules ss
      WHERE ss.student_id = $1
        AND ss.attendance_status IN ('completed', 'absent', 'absent_warned')
    `
    
    let params = [studentId]
    let paramCount = 1

    // Add date filtering if provided (check for valid dates, not "null" strings)
    if (from && to && from !== 'null' && to !== 'null') {
      queryText += ` AND ss.attendance_date >= $${++paramCount} AND ss.attendance_date <= $${++paramCount}`
      params.push(from, to)
    }

    const result = await query(queryText, params)
    
    if (result.rows.length === 0) {
      return successResponse({
        completed: 0,
        absent: 0,
        warned: 0,
        total: 0,
        period: from && to ? `${from} to ${to}` : 'all time'
      })
    }

    const stats = result.rows[0]
    
    return successResponse({
      completed: parseInt(stats.completed) || 0,
      absent: parseInt(stats.absent) || 0,
      warned: parseInt(stats.warned) || 0,
      total: parseInt(stats.total) || 0,
      period: from && to ? `${from} to ${to}` : 'all time'
    })
  } catch (error) {
    console.error('Get student attendance analytics error:', error)
    return errorResponse(500, 'Failed to get student attendance analytics')
  }
}
