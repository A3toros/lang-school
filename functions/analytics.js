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
    if (path.startsWith('/api/analytics/students/') && path.endsWith('/attendance') && method === 'GET') {
      return await getStudentAttendanceAnalytics(event, user)
    } else if (path.startsWith('/api/analytics/teachers/') && path.endsWith('/attendance') && method === 'GET') {
      return await getTeacherAttendanceAnalytics(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return errorResponse(500, 'Internal server error')
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

// Get teacher attendance analytics
async function getTeacherAttendanceAnalytics(event, user) {
  try {
    const { from, to, bucket = 'week' } = event.queryStringParameters || {}
    
    // Extract teacher ID from path: /api/analytics/teachers/{id}/attendance or /api/analytics/teachers/me/attendance
    const pathParts = event.path.split('/')
    const teacherIdParam = pathParts[pathParts.length - 2] // Get ID before 'attendance'
    
    let teacherId
    if (teacherIdParam === 'me') {
      // For /teachers/me/attendance, use the current user's teacher ID
      teacherId = user.teacherId
      if (!teacherId) {
        return errorResponse(400, 'User is not a teacher')
      }
    } else {
      teacherId = teacherIdParam
      if (!teacherId || isNaN(teacherId)) {
        return errorResponse(400, 'Invalid teacher ID')
      }
    }

    let queryText = `
      SELECT 
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as warned,
        COUNT(ss.id) as total
      FROM student_schedules ss
      WHERE ss.teacher_id = $1
        AND ss.attendance_status IN ('completed', 'absent', 'absent_warned')
    `
    
    let params = [teacherId]
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
    console.error('Get teacher attendance analytics error:', error)
    return errorResponse(500, 'Failed to get teacher attendance analytics')
  }
}