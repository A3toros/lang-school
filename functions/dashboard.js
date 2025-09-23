require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders  } = require('./utils/database.js')

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
    if (path === '/api/dashboard/admin' && method === 'GET') {
      return await getAdminDashboard(event, user)
    } else if (path === '/api/dashboard/teacher' && method === 'GET') {
      return await getTeacherDashboard(event, user)
    } else if (path === '/api/dashboard/stats' && method === 'GET') {
      return await getDashboardStats(event, user)
    } else if (path === '/api/dashboard/notifications' && method === 'GET') {
      return await getNotifications(event, user)
    } else if (path === '/api/dashboard/notifications/read' && method === 'POST') {
      return await markNotificationRead(event, user)
    } else if (path === '/api/dashboard/upcoming' && method === 'GET') {
      return await getUpcomingLessons(event, user)
    } else if (path === '/api/dashboard/recent' && method === 'GET') {
      return await getRecentActivity(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Dashboard API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get admin dashboard data
async function getAdminDashboard(event, user) {
  console.log('🔍 [DASHBOARD] getAdminDashboard called', { 
    userId: user.userId, 
    role: user.role, 
    period: event.queryStringParameters?.period 
  })
  
  try {
    if (user.role !== 'admin') {
      console.log('❌ [DASHBOARD] Access denied - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const { period = '30' } = event.queryStringParameters || {}
    const days = parseInt(period)
    console.log('📊 [DASHBOARD] Fetching admin dashboard data', { period, days })

    // Get system overview
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

    // Get teacher performance
    const teacherPerformanceQuery = `
      SELECT 
        t.id,
        t.name,
        COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END) as total_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
        ROUND(
          (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END), 0)) * 100, 2
        ) as attendance_rate,
        COUNT(DISTINCT s.id) as unique_students
      FROM teachers t
      LEFT JOIN student_schedules ss ON t.id = ss.teacher_id 
        AND ss.attendance_date >= CURRENT_DATE - INTERVAL '${days} days'
      LEFT JOIN students s ON ss.student_id = s.id AND s.is_active = true
      WHERE t.is_active = true
      GROUP BY t.id, t.name
      ORDER BY completed_lessons DESC
      LIMIT 5
    `

    // Get recent activity
    const recentActivityQuery = `
      SELECT 
        'lesson_completed' as activity_type,
        ss.attendance_date as activity_date,
        t.name as teacher_name,
        s.name as student_name,
        ss.time_slot
      FROM student_schedules ss
      JOIN teachers t ON ss.teacher_id = t.id
      JOIN students s ON ss.student_id = s.id
      WHERE ss.attendance_status = 'completed'
        AND ss.attendance_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY ss.attendance_date DESC
      LIMIT 10
    `

    console.log('🔄 [DASHBOARD] Executing queries in parallel')
    const [overviewResult, teacherResult, activityResult] = await Promise.all([
      query(overviewQuery),
      query(teacherPerformanceQuery),
      query(recentActivityQuery)
    ])

    console.log('✅ [DASHBOARD] Queries completed successfully', {
      overviewCount: overviewResult.rows.length,
      teacherCount: teacherResult.rows.length,
      activityCount: activityResult.rows.length
    })

    const response = {
      overview: overviewResult.rows[0],
      teacher_performance: teacherResult.rows,
      recent_activity: activityResult.rows
    }

    console.log('📈 [DASHBOARD] Admin dashboard data prepared', {
      totalTeachers: response.overview?.total_teachers,
      totalStudents: response.overview?.total_students,
      todayLessons: response.overview?.today_lessons
    })

    return successResponse(response)
  } catch (error) {
    console.error('❌ [DASHBOARD] Get admin dashboard error:', error)
    return errorResponse(500, 'Failed to get admin dashboard')
  }
}

// Get teacher dashboard data
async function getTeacherDashboard(event, user) {
  try {
    if (user.role !== 'teacher') {
      return errorResponse(403, 'Forbidden')
    }

    const teacherId = user.teacherId
    const { period = '30' } = event.queryStringParameters || {}
    const days = parseInt(period)

    // Get teacher stats
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END) as total_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
        COUNT(CASE WHEN ss.attendance_status = 'scheduled' THEN 1 END) as scheduled_lessons,
        COUNT(DISTINCT s.id) as unique_students
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      WHERE ss.teacher_id = $1
        AND ss.attendance_date >= CURRENT_DATE - INTERVAL '${days} days'
    `

    // Get upcoming lessons (next 7 days)
    const upcomingQuery = `
      SELECT 
        ss.id,
        s.name as student_name,
        ss.day_of_week,
        ss.time_slot,
        ss.week_start_date,
        ss.attendance_status
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      WHERE ss.teacher_id = $1
        AND ss.week_start_date >= CURRENT_DATE
        AND ss.week_start_date <= CURRENT_DATE + INTERVAL '7 days'
      ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot
    `

    // Get recent lesson reports
    const reportsQuery = `
      SELECT 
        lr.id,
        s.name as student_name,
        lr.lesson_date,
        lr.time_slot,
        lr.comment,
        lr.created_at
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      WHERE lr.teacher_id = $1
      ORDER BY lr.lesson_date DESC
      LIMIT 5
    `

    const [statsResult, upcomingResult, reportsResult] = await Promise.all([
      query(statsQuery, [teacherId]),
      query(upcomingQuery, [teacherId]),
      query(reportsQuery, [teacherId])
    ])

    return successResponse({
      stats: statsResult.rows[0],
      upcoming_lessons: upcomingResult.rows,
      recent_reports: reportsResult.rows
    })
  } catch (error) {
    console.error('Get teacher dashboard error:', error)
    return errorResponse(500, 'Failed to get teacher dashboard')
  }
}

// Get dashboard statistics
async function getDashboardStats(event, user) {
  try {
    const { period = '30' } = event.queryStringParameters || {}
    const days = parseInt(period)

    let statsQuery
    if (user.role === 'admin') {
      statsQuery = `
        SELECT 
          'system' as type,
          COUNT(DISTINCT t.id) as teachers,
          COUNT(DISTINCT s.id) as students,
          COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END) as total_lessons,
          COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons
        FROM teachers t
        LEFT JOIN student_teachers st ON t.id = st.teacher_id AND st.is_active = true
        LEFT JOIN students s ON st.student_id = s.id AND s.is_active = true
        LEFT JOIN student_schedules ss ON s.id = ss.student_id 
          AND ss.attendance_date >= CURRENT_DATE - INTERVAL '${days} days'
        WHERE t.is_active = true
      `
    } else {
      statsQuery = `
        SELECT 
          'teacher' as type,
          COUNT(DISTINCT s.id) as students,
          COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END) as total_lessons,
          COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons
        FROM student_schedules ss
        JOIN students s ON ss.student_id = s.id
        WHERE ss.teacher_id = $1
          AND ss.attendance_date >= CURRENT_DATE - INTERVAL '${days} days'
      `
    }

    const params = user.role === 'teacher' ? [user.teacherId] : []
    const result = await query(statsQuery, params)

    return successResponse({ stats: result.rows[0] })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    return errorResponse(500, 'Failed to get dashboard stats')
  }
}

// Get notifications
async function getNotifications(event, user) {
  try {
    // This is a simplified notification system
    // In a real app, you'd have a notifications table
    const notifications = []

    if (user.role === 'admin') {
      // Check for system alerts
      const alertQuery = `
        SELECT 
          'system_alert' as type,
          'Low attendance rate detected' as message,
          CURRENT_TIMESTAMP as created_at
        FROM student_schedules ss
        WHERE ss.attendance_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY ss.teacher_id
        HAVING ROUND(
          (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(CASE WHEN ss.attendance_status IN ('completed', 'absent', 'absent_warned') THEN ss.id END), 0)) * 100, 2
        ) < 70
        LIMIT 1
      `
      
      const alertResult = await query(alertQuery)
      if (alertResult.rows.length > 0) {
        notifications.push(alertResult.rows[0])
      }
    }

    return successResponse({ notifications })
  } catch (error) {
    console.error('Get notifications error:', error)
    return errorResponse(500, 'Failed to get notifications')
  }
}

// Mark notification as read
async function markNotificationRead(event, user) {
  try {
    const { notification_id } = JSON.parse(event.body)
    
    // In a real app, you'd update the notification status in the database
    return successResponse({ message: 'Notification marked as read' })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return errorResponse(500, 'Failed to mark notification as read')
  }
}

// Get upcoming lessons
async function getUpcomingLessons(event, user) {
  try {
    const { days = 7 } = event.queryStringParameters || {}
    const dayCount = parseInt(days)

    let queryStr
    let params

    if (user.role === 'admin') {
      queryStr = `
        SELECT 
          ss.id,
          t.name as teacher_name,
          s.name as student_name,
          ss.day_of_week,
          ss.time_slot,
          ss.week_start_date,
          ss.attendance_status
        FROM student_schedules ss
        JOIN teachers t ON ss.teacher_id = t.id
        JOIN students s ON ss.student_id = s.id
        WHERE ss.week_start_date >= CURRENT_DATE
          AND ss.week_start_date <= CURRENT_DATE + INTERVAL '${dayCount} days'
        ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot
      `
      params = []
    } else {
      queryStr = `
        SELECT 
          ss.id,
          s.name as student_name,
          ss.day_of_week,
          ss.time_slot,
          ss.week_start_date,
          ss.attendance_status
        FROM student_schedules ss
        JOIN students s ON ss.student_id = s.id
        WHERE ss.teacher_id = $1
          AND ss.week_start_date >= CURRENT_DATE
          AND ss.week_start_date <= CURRENT_DATE + INTERVAL '${dayCount} days'
        ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot
      `
      params = [user.teacherId]
    }

    const result = await query(queryStr, params)
    return successResponse({ lessons: result.rows })
  } catch (error) {
    console.error('Get upcoming lessons error:', error)
    return errorResponse(500, 'Failed to get upcoming lessons')
  }
}

// Get recent activity
async function getRecentActivity(event, user) {
  try {
    const { limit = 10 } = event.queryStringParameters || {}
    const limitCount = parseInt(limit)

    let queryStr
    let params

    if (user.role === 'admin') {
      queryStr = `
        SELECT 
          'lesson_completed' as activity_type,
          ss.attendance_date as activity_date,
          t.name as teacher_name,
          s.name as student_name,
          ss.time_slot
        FROM student_schedules ss
        JOIN teachers t ON ss.teacher_id = t.id
        JOIN students s ON ss.student_id = s.id
        WHERE ss.attendance_status = 'completed'
          AND ss.attendance_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY ss.attendance_date DESC
        LIMIT $1
      `
      params = [limitCount]
    } else {
      queryStr = `
        SELECT 
          'lesson_completed' as activity_type,
          ss.attendance_date as activity_date,
          s.name as student_name,
          ss.time_slot
        FROM student_schedules ss
        JOIN students s ON ss.student_id = s.id
        WHERE ss.teacher_id = $1
          AND ss.attendance_status = 'completed'
          AND ss.attendance_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY ss.attendance_date DESC
        LIMIT $2
      `
      params = [user.teacherId, limitCount]
    }

    const result = await query(queryStr, params)
    return successResponse({ activities: result.rows })
  } catch (error) {
    console.error('Get recent activity error:', error)
    return errorResponse(500, 'Failed to get recent activity')
  }
}
