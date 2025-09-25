require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders, getPool } = require('./utils/database.js')
const { deleteImageByPublicId } = require('./cloudinary.js')
const crypto = require('crypto')

exports.handler = async (event, context) => {
  console.log('🚀 [TEACHERS_HANDLER] Handler called with:', { path: event.path, method: event.httpMethod })
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('🚀 [TEACHERS_HANDLER] Handling OPTIONS request')
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  const { path } = event
  const method = event.httpMethod

  try {
    // Check if this is a public route (no authentication required)
    const isPublicRoute = path.match(/^\/api\/teachers\/random\/\d+$/) && method === 'GET'
    
    let user
    if (!isPublicRoute) {
      // Verify authentication for all routes except public ones
      try {
        user = verifyToken(event)
      } catch (error) {
        return errorResponse(401, 'Unauthorized')
      }
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
    } else if (path.match(/^\/api\/teachers\/\d+\/deactivate$/) && method === 'POST') {
      return await deactivateTeacher(event, user)
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
    } else if (path === '/api/teachers/monthly-stats' && method === 'GET') {
      return await getMonthlyLessonStats(event, user)
    } else if (path.match(/^\/api\/teachers\/random\/\d+$/) && method === 'GET') {
      return await getRandomTeachers(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+\/monthly-stats\/\d+\/\d+$/) && method === 'GET') {
      return await getTeacherMonthlyStats(event, user)
    } else if (path === '/api/teachers/search' && method === 'GET') {
      return await searchTeachers(event, user)
    } else if (path === '/api/teachers/inactive' && method === 'GET') {
      return await getInactiveTeachers(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+\/attendance$/) && method === 'GET') {
      return await getTeacherAttendance(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+\/lessons$/) && method === 'GET') {
      return await getTeacherLessons(event, user)
    } else if (path.match(/^\/api\/teachers\/\d+\/upload-photo$/) && method === 'POST') {
      return await uploadTeacherPhoto(event, user)
    } else if (path === '/api/teachers/bulk-update' && method === 'POST') {
      return await bulkUpdateTeachers(event, user)
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
  console.log('🔍 [TEACHERS] getTeachers called', {
    userId: user.userId,
    role: user.role,
    teacherId: user.teacherId
  })

  try {
    const { status } = event.queryStringParameters || {}
    let queryText, params

    if (user.role === 'admin') {
      console.log('📋 [TEACHERS] Admin requesting teachers', { status })
      console.log('🔍 [TEACHERS] About to execute query...')
      // Admin can see all teachers with status filtering
      queryText = `
        SELECT t.*, u.username, u.is_active as user_active,
               COALESCE(st_counts.student_count, 0) as student_count
        FROM teachers t
        LEFT JOIN users u ON t.id = u.teacher_id
        LEFT JOIN (
          SELECT teacher_id, COUNT(DISTINCT student_id) as student_count
          FROM student_teachers 
          WHERE is_active = true
          GROUP BY teacher_id
        ) st_counts ON t.id = st_counts.teacher_id
        WHERE 1=1
      `
      
      // Add status filter
      if (status === 'active') {
        queryText += ` AND t.is_active = true`
      } else if (status === 'inactive') {
        queryText += ` AND t.is_active = false`
      } else {
        // Default: show only active teachers
        queryText += ` AND t.is_active = true`
      }
      
      queryText += ` ORDER BY t.name`
      params = []
      
      console.log('🔍 [TEACHERS] Final query:', queryText)
      console.log('🔍 [TEACHERS] Params:', params)
    } else if (user.role === 'teacher') {
      console.log('📋 [TEACHERS] Teacher requesting own data', { teacherId: user.teacherId })
      // Teacher can only see themselves
      queryText = `
        SELECT t.*, u.username, u.is_active as user_active,
               COUNT(DISTINCT st.student_id) as student_count
        FROM teachers t
        LEFT JOIN users u ON t.id = u.teacher_id
        LEFT JOIN student_teachers st ON t.id = st.teacher_id AND st.is_active = true
        WHERE t.id = $1 AND t.is_active = true
        GROUP BY t.id, u.username, u.is_active
      `
      params = [user.teacherId]
    } else {
      console.log('❌ [TEACHERS] Forbidden - invalid role', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    console.log('🔍 [TEACHERS] Executing query', {
      queryText: queryText.substring(0, 200) + '...',
      paramsCount: params.length
    })

    const result = await query(queryText, params)
    
    console.log('✅ [TEACHERS] Query executed successfully', {
      rowCount: result.rowCount,
      teachers: result.rows.map(t => ({ id: t.id, name: t.name, student_count: t.student_count }))
    })

    // ETag computation based on max(updated_at) and count
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

    console.log('🔍 [TEACHERS] Query result:', result.rows.map(t => ({ id: t.id, name: t.name, student_count: t.student_count })))
    return successResponse({ teachers: result.rows }, 200, headers)
  } catch (error) {
    console.error('❌ [TEACHERS] Get teachers error:', error)
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
             COUNT(DISTINCT st.student_id) as student_count
      FROM teachers t
      LEFT JOIN users u ON t.id = u.teacher_id
      LEFT JOIN student_teachers st ON t.id = st.teacher_id AND st.is_active = true
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

    const { name, email, photo_url, description, username, password, meeting_id, meeting_password } = JSON.parse(event.body)

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
    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')

      // Insert teacher
      const teacherResult = await client.query(
        'INSERT INTO teachers (name, email, photo_url, description, meeting_id, meeting_password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, email, photo_url || null, description || null, meeting_id || null, meeting_password || null]
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
    const { name, email, photo_url, description, meeting_id, meeting_password } = JSON.parse(event.body)

    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const queryText = `
      UPDATE teachers 
      SET name = $1, email = $2, photo_url = $3, description = $4, meeting_id = $5, meeting_password = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND is_active = true
      RETURNING *
    `
    
    const result = await query(queryText, [name, email, photo_url, description, meeting_id, meeting_password, teacherId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Teacher not found')
    }

    return successResponse({ teacher: result.rows[0] })
  } catch (error) {
    console.error('Update teacher error:', error)
    return errorResponse(500, 'Failed to update teacher')
  }
}

// Deactivate teacher (soft delete - preserve all data)
async function deactivateTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const teacherId = parseInt(event.path.split('/')[3])
    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Get teacher's photo info before deactivation
      const teacherResult = await client.query(
        'SELECT photo_url, photo_public_id FROM teachers WHERE id = $1',
        [teacherId]
      )
      
      if (teacherResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return errorResponse(404, 'Teacher not found')
      }
      
      const { photo_url, photo_public_id } = teacherResult.rows[0]
      
      // 2. Set students to unassigned (preserve student data, just remove teacher assignment)
      await client.query(
        'UPDATE students SET teacher_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $1',
        [teacherId]
      )
      
      // 2b. Deactivate all teacher assignments in student_teachers
      await client.query(
        'UPDATE student_teachers SET is_active = false WHERE teacher_id = $1',
        [teacherId]
      )
      
      // 3. DELETE future schedules (not just set teacher_id = NULL)
      const currentDate = new Date().toISOString().split('T')[0]
      await client.query(
        `DELETE FROM student_schedules 
         WHERE teacher_id = $1 AND week_start_date >= $2`,
        [teacherId, currentDate]
      )
      
      // 4. Soft delete teacher and user
      await client.query('UPDATE teachers SET is_active = false WHERE id = $1', [teacherId])
      await client.query('UPDATE users SET is_active = false WHERE teacher_id = $1', [teacherId])
      
      await client.query('COMMIT')
      
      return successResponse({ 
        message: 'Teacher deactivated successfully - future schedules removed',
        data_preserved: {
          lesson_reports: 'Preserved (historical data)',
          schedule_history: 'Preserved (audit trail)',
          historical_schedules: 'Preserved (attendance records)',
          students: 'Unassigned (teacher_id = NULL)',
          future_schedules: 'DELETED (not needed)',
          schedule_templates: 'DEACTIVATED (prevent regeneration)'
        }
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
    // Clean up optional tables (after successful DB transaction)
    try {
      const cleanupClient = await getPool().connect()
      
      // Deactivate schedule templates
      try {
        await cleanupClient.query(
          'UPDATE schedule_templates SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $1',
          [teacherId]
        )
      } catch (e) {
        console.log('🔍 [DEACTIVATE_TEACHER] Schedule templates update failed (table may not exist):', e.message)
      }
      
      // Log deactivation in schedule history
      try {
        await cleanupClient.query(
          `INSERT INTO schedule_history (action, old_teacher_id, new_teacher_id, changed_by, notes)
           VALUES ('deactivated', $1, NULL, $2, 'Teacher deactivated - future schedules removed')`,
          [teacherId, user.userId]
        )
      } catch (e) {
        console.log('🔍 [DEACTIVATE_TEACHER] Schedule history insert failed (table may not exist):', e.message)
      }
      
      // Remove from featured teachers
      try {
        await cleanupClient.query('DELETE FROM featured_teachers WHERE teacher_id = $1', [teacherId])
      } catch (e) {
        console.log('🔍 [DEACTIVATE_TEACHER] Featured teachers cleanup failed (table may not exist):', e.message)
      }
      
      cleanupClient.release()
    } catch (e) {
      console.log('🔍 [DEACTIVATE_TEACHER] Cleanup operations failed:', e.message)
    }
    
    // Delete photo from Cloudinary (after successful DB transaction and client release)
    let photoDeleted = false
    if (photo_public_id) {
      try {
        const cloudinaryResult = await deleteImageByPublicId(photo_public_id)
        photoDeleted = cloudinaryResult.success
        if (!cloudinaryResult.success) {
          console.error('Failed to delete photo from Cloudinary:', cloudinaryResult.error)
        }
      } catch (error) {
        console.error('Cloudinary deletion error:', error)
      }
    }
    
    // Update response with photo deletion status
    return successResponse({ 
      message: 'Teacher deactivated successfully - future schedules removed',
      photo_deleted: photoDeleted,
      data_preserved: {
        lesson_reports: 'Preserved (historical data)',
        schedule_history: 'Preserved (audit trail)',
        historical_schedules: 'Preserved (attendance records)',
        students: 'Unassigned (teacher_id = NULL)',
        future_schedules: 'DELETED (not needed)',
        schedule_templates: 'DEACTIVATED (prevent regeneration)'
      }
    })
  } catch (error) {
    console.error('Deactivate teacher error:', error)
    return errorResponse(500, 'Failed to deactivate teacher')
  }
}

// Delete teacher (hard delete - remove all data)
async function deleteTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const teacherId = parseInt(event.path.split('/')[3])
    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Get teacher's photo info before deletion
      const teacherResult = await client.query(
        'SELECT photo_url, photo_public_id FROM teachers WHERE id = $1',
        [teacherId]
      )
      
      if (teacherResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return errorResponse(404, 'Teacher not found')
      }
      
      const { photo_url, photo_public_id } = teacherResult.rows[0]
      
      // 2. Set students to unassigned (preserve student data, just remove teacher assignment)
      await client.query(
        'UPDATE students SET teacher_id = NULL, primary_teacher_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $1 OR primary_teacher_id = $1',
        [teacherId]
      )
      
      // 3. Delete all lesson reports first
      await client.query('DELETE FROM lesson_reports WHERE teacher_id = $1', [teacherId])
      
      // 4. Delete ALL schedules for this teacher (bypass audit protection for complete deletion)
      // We need to temporarily disable the trigger for this operation
      await client.query('ALTER TABLE student_schedules DISABLE TRIGGER trg_protect_past_schedules_delete')
      
      try {
        await client.query('DELETE FROM student_schedules WHERE teacher_id = $1', [teacherId])
        console.log('✅ [DELETE_TEACHER] Deleted all schedules for teacher')
      } finally {
        // Re-enable the trigger
        await client.query('ALTER TABLE student_schedules ENABLE TRIGGER trg_protect_past_schedules_delete')
      }
      
      // 5. Now we can delete schedule templates
      await client.query('DELETE FROM schedule_templates WHERE teacher_id = $1', [teacherId])
      
      // 6. Delete from featured teachers
      await client.query('DELETE FROM featured_teachers WHERE teacher_id = $1', [teacherId])
      
      // 7. Delete schedule history entries
      await client.query('DELETE FROM schedule_history WHERE old_teacher_id = $1 OR new_teacher_id = $2', [teacherId, teacherId])
      
      // 8. Delete user account (CASCADE will handle this)
      await client.query('DELETE FROM users WHERE teacher_id = $1', [teacherId])
      
      // 9. Delete teacher record (CASCADE will handle related data)
      await client.query('DELETE FROM teachers WHERE id = $1', [teacherId])
      
      await client.query('COMMIT')
      
      // 10. Delete photo from Cloudinary (after successful DB transaction)
      let photoDeleted = false
      if (photo_public_id) {
        try {
          const cloudinaryResult = await deleteImageByPublicId(photo_public_id)
          photoDeleted = cloudinaryResult.success
          if (!cloudinaryResult.success) {
            console.error('Failed to delete photo from Cloudinary:', cloudinaryResult.error)
          }
        } catch (error) {
          console.error('Cloudinary deletion error:', error)
        }
      }
      
      return successResponse({ 
        message: 'Teacher deleted successfully - all data removed',
        photo_deleted: photoDeleted,
        data_deleted: {
          teacher_record: 'Deleted',
          user_account: 'Deleted',
          lesson_reports: 'Deleted',
          schedules: 'All schedules deleted (including past schedules)',
          schedule_templates: 'Deleted',
          featured_teachers: 'Deleted',
          schedule_history: 'Deleted'
        }
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
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
      JOIN student_teachers st ON s.id = st.student_id
      LEFT JOIN student_lessons sl ON s.id = sl.student_id
      WHERE st.teacher_id = $1 AND st.is_active = true AND s.is_active = true
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

// REWRITTEN getTeacherSchedule function - Use upcoming_schedule_view for active schedules
async function getTeacherSchedule(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    const { week_start, include_history = 'false' } = event.queryStringParameters || {}
    
    console.log('🔍 [GET_TEACHER_SCHEDULE] Request params:', { teacherId, week_start, include_history })
    
    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const weekStart = week_start || getCurrentWeekStart()
    console.log('🔍 [GET_TEACHER_SCHEDULE] Using weekStart:', weekStart)
    
    // Debug: Check what get_current_week_start() returns in the database
    const debugResult = await query('SELECT get_current_week_start() as db_current_week, CURRENT_DATE as today')
    console.log('🔍 [GET_TEACHER_SCHEDULE] Database current week:', debugResult.rows[0])

    let queryText
    let params = [teacherId]

    if (include_history === 'true') {
      // Historical data
      queryText = `
        SELECT ss.*, s.name as student_name, s.id as student_id,
               CASE WHEN ss.attendance_status = 'completed' THEN 'completed'
                    WHEN ss.attendance_status = 'absent' THEN 'absent'
                    WHEN ss.attendance_status = 'absent_warned' THEN 'absent_warned'
                    ELSE 'scheduled'
               END as status
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      WHERE ss.teacher_id = $1 AND ss.week_start_date = $2 AND s.is_active = true
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
                     ss.day_of_week, ss.time_slot, ss.week_start_date::text,
                     ss.attendance_status, ss.lesson_type,
                     CASE WHEN ss.attendance_status = 'completed' THEN 'completed'
                          WHEN ss.attendance_status = 'absent' THEN 'absent'
                          WHEN ss.attendance_status = 'absent_warned' THEN 'absent_warned'
                          ELSE 'scheduled'
                     END as status
              FROM student_schedules ss
              JOIN students s ON ss.student_id = s.id
              JOIN teachers t ON ss.teacher_id = t.id
              WHERE ss.teacher_id = $1 AND ss.week_start_date = $2
              ORDER BY ss.day_of_week, ss.time_slot
            `
            params.push(weekStart)
            console.log('🔍 [GET_TEACHER_SCHEDULE] Query params:', params)
            console.log('🔍 [GET_TEACHER_SCHEDULE] Query text:', queryText)
          } else {
            queryText = `
              SELECT ss.id, s.id as student_id, s.name as student_name, 
                     t.id as teacher_id, t.name as teacher_name,
                     ss.day_of_week, ss.time_slot, ss.week_start_date::text,
                     ss.attendance_status, ss.lesson_type,
                     CASE WHEN ss.attendance_status = 'completed' THEN 'completed'
                          WHEN ss.attendance_status = 'absent' THEN 'absent'
                          WHEN ss.attendance_status = 'absent_warned' THEN 'absent_warned'
                          ELSE 'scheduled'
                     END as status
              FROM student_schedules ss
              JOIN students s ON ss.student_id = s.id
              JOIN teachers t ON ss.teacher_id = t.id
              WHERE ss.teacher_id = $1 AND ss.week_start_date >= get_current_week_start()
              ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot
            `
          }
        }
    
    const result = await query(queryText, params)
    console.log('🔍 [GET_TEACHER_SCHEDULE] Query result:', {
      rowCount: result.rowCount,
      rows: result.rows
    })
    return successResponse({ schedules: result.rows })
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

    const { week_start } = event.queryStringParameters || {}
    
    // Query 1: Get student count
    const studentQuery = `
      SELECT COUNT(DISTINCT st.student_id) as total_students
      FROM teachers t
      LEFT JOIN student_teachers st ON t.id = st.teacher_id AND st.is_active = true
      LEFT JOIN students s ON st.student_id = s.id AND s.is_active = true
      WHERE t.id = $1
    `
    
    // Query 2: Get lesson counts (week-specific or total)
    let lessonQuery
    let lessonParams = [teacherId]
    
    if (week_start) {
      // Get stats for specific week using lesson_statistics view
      lessonQuery = `
        SELECT 
          COALESCE(ls.completed_lessons, 0) as completed_lessons,
          COALESCE(ls.absent_lessons, 0) as absent_lessons
        FROM lesson_statistics ls
        WHERE ls.teacher_id = $1 AND ls.week_start_date = $2
      `
      lessonParams.push(week_start)
    } else {
      // Get total stats across all time
      lessonQuery = `
        SELECT 
          COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
          COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
        FROM teachers t
        LEFT JOIN student_teachers st ON t.id = st.teacher_id AND st.is_active = true
        LEFT JOIN students s ON st.student_id = s.id AND s.is_active = true
        LEFT JOIN student_schedules ss ON s.id = ss.student_id AND ss.teacher_id = t.id
        WHERE t.id = $1
      `
    }
    
    const [studentResult, lessonResult] = await Promise.all([
      query(studentQuery, [teacherId]),
      query(lessonQuery, lessonParams)
    ])
    
    const stats = {
      total_students: studentResult.rows[0].total_students,
      completed_lessons: lessonResult.rows[0]?.completed_lessons || 0,
      absent_lessons: lessonResult.rows[0]?.absent_lessons || 0
    }
    
    console.log(`🔍 [GET_TEACHER_STATS] Stats for teacher ${teacherId}:`, stats)
    return successResponse({ stats })
  } catch (error) {
    console.error('Get teacher stats error:', error)
    return errorResponse(500, 'Failed to fetch statistics')
  }
}

// Get monthly lesson statistics for all teachers
async function getMonthlyLessonStats(event, user) {
  try {
    const { month, year } = event.queryStringParameters || {}
    
    if (!month || !year) {
      return errorResponse(400, 'Month and year parameters are required')
    }

    // Get all lesson statistics for the specified month, grouped by teacher and week
    const queryText = `
      SELECT 
        ls.teacher_id,
        t.name as teacher_name,
        ls.week_start_date::text,
        SUM(ls.completed_lessons) as completed_lessons,
        SUM(ls.absent_lessons) as absent_lessons
      FROM lesson_statistics ls
      JOIN teachers t ON ls.teacher_id = t.id
      WHERE EXTRACT(YEAR FROM ls.week_start_date) = $1 
        AND EXTRACT(MONTH FROM ls.week_start_date) = $2
      GROUP BY ls.teacher_id, t.name, ls.week_start_date
      ORDER BY ls.teacher_id, ls.week_start_date
    `
    
    const result = await query(queryText, [parseInt(year), parseInt(month)])
    console.log(`🔍 [GET_MONTHLY_STATS] Fetched ${result.rows.length} records for ${year}-${month}`)
    
    return successResponse({ 
      monthlyStats: result.rows,
      month: parseInt(month),
      year: parseInt(year)
    })
  } catch (error) {
    console.error('Get monthly lesson stats error:', error)
    return errorResponse(500, 'Failed to fetch monthly statistics')
  }
}

// Get teachers for showcase (supports random, featured, and alphabetical)
async function getRandomTeachers(event, user) {
  try {
    const count = parseInt(event.path.split('/')[4]) || 3

    // First, get the showcase settings to determine rotation type
    const settingsQuery = `
      SELECT rotation_type FROM teacher_showcase_settings 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    const settingsResult = await query(settingsQuery)
    const rotationType = settingsResult.rows.length > 0 ? settingsResult.rows[0].rotation_type : 'random'

    let queryText
    let params = [count]

    if (rotationType === 'featured') {
      // Get featured teachers in display order
      queryText = `
        SELECT t.*
        FROM teachers t
        INNER JOIN featured_teachers ft ON t.id = ft.teacher_id
        WHERE t.is_active = true AND ft.is_active = true
        ORDER BY ft.display_order
        LIMIT $1
      `
    } else if (rotationType === 'alphabetical') {
      // Get teachers in alphabetical order
      queryText = `
        SELECT t.*
        FROM teachers t
        WHERE t.is_active = true
        ORDER BY t.name
        LIMIT $1
      `
    } else {
      // Default to random selection
      queryText = `
        SELECT t.*
        FROM teachers t
        WHERE t.is_active = true
        ORDER BY RANDOM()
        LIMIT $1
      `
    }
    
    const result = await query(queryText, params)
    
    console.log(`✅ [TEACHERS] Teachers fetched for showcase`, {
      rotationType,
      count: result.rows.length,
      teacherIds: result.rows.map(t => t.id)
    })
    
    return successResponse({ teachers: result.rows })
  } catch (error) {
    console.error('Get teachers for showcase error:', error)
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
             COUNT(DISTINCT st.student_id) as student_count
      FROM teachers t
      LEFT JOIN users u ON t.id = u.teacher_id
      LEFT JOIN student_teachers st ON t.id = st.teacher_id AND st.is_active = true
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

// Get teacher's attendance records
async function getTeacherAttendance(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    const { start_date, end_date } = event.queryStringParameters || {}
    
    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    let queryText = `
      SELECT sl.*, s.name as student_name, s.id as student_id
      FROM student_lessons sl
      JOIN students s ON sl.student_id = s.id
      JOIN student_teachers st ON s.id = st.student_id AND st.teacher_id = $1 AND st.is_active = true
      WHERE s.is_active = true
    `
    let params = [teacherId]

    if (start_date) {
      queryText += ` AND sl.lesson_date >= $${params.length + 1}`
      params.push(start_date)
    }

    if (end_date) {
      queryText += ` AND sl.lesson_date <= $${params.length + 1}`
      params.push(end_date)
    }

    queryText += ` ORDER BY sl.lesson_date DESC, sl.time_slot`
    
    console.log('🔍 [GET_TEACHER_ATTENDANCE] Query:', queryText)
    console.log('🔍 [GET_TEACHER_ATTENDANCE] Params:', params)
    console.log('🔍 [GET_TEACHER_ATTENDANCE] Teacher ID:', teacherId)
    console.log('🔍 [GET_TEACHER_ATTENDANCE] Start Date:', start_date)
    console.log('🔍 [GET_TEACHER_ATTENDANCE] End Date:', end_date)
    
    // First, let's check what records exist for this teacher without any filtering
    const checkQuery = `
      SELECT sl.id, sl.lesson_date, sl.time_slot, s.name as student_name
      FROM student_lessons sl
      JOIN students s ON sl.student_id = s.id
      JOIN student_teachers st ON s.id = st.student_id AND st.teacher_id = $1 AND st.is_active = true
      WHERE s.is_active = true
      ORDER BY sl.lesson_date DESC, sl.time_slot
      LIMIT 10
    `
    const checkResult = await query(checkQuery, [teacherId])
    console.log('🔍 [GET_TEACHER_ATTENDANCE] All records for teacher (first 10):', checkResult.rows)
    
    // Also check if there are ANY records for this teacher at all
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM student_lessons sl
      JOIN students s ON sl.student_id = s.id
      JOIN student_teachers st ON s.id = st.student_id AND st.teacher_id = $1 AND st.is_active = true
      WHERE s.is_active = true
    `
    const countResult = await query(countQuery, [teacherId])
    console.log('🔍 [GET_TEACHER_ATTENDANCE] Total records for teacher:', countResult.rows[0].total)
    
    const result = await query(queryText, params)
    console.log('🔍 [GET_TEACHER_ATTENDANCE] Filtered result rows:', result.rows.length)
    console.log('🔍 [GET_TEACHER_ATTENDANCE] Sample filtered rows:', result.rows.slice(0, 3))
    
    return successResponse({ attendance: result.rows })
  } catch (error) {
    console.error('Get teacher attendance error:', error)
    return errorResponse(500, 'Failed to fetch attendance records')
  }
}

// Get teacher's lesson history
async function getTeacherLessons(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    const { start_date, end_date, page, limit } = event.queryStringParameters || {}
    const { offset } = getPaginationParams({ page, limit })
    
    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    let queryText = `
      SELECT lr.*, s.name as student_name, s.id as student_id
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      WHERE lr.teacher_id = $1 AND s.is_active = true
    `
    let params = [teacherId]

    if (start_date) {
      queryText += ` AND lr.lesson_date >= $${params.length + 1}`
      params.push(start_date)
    }

    if (end_date) {
      queryText += ` AND lr.lesson_date <= $${params.length + 1}`
      params.push(end_date)
    }

    queryText += ` ORDER BY lr.lesson_date DESC, lr.time_slot LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await query(queryText, params)
    return successResponse({ lessons: result.rows })
  } catch (error) {
    console.error('Get teacher lessons error:', error)
    return errorResponse(500, 'Failed to fetch lesson history')
  }
}

// Upload teacher photo
async function uploadTeacherPhoto(event, user) {
  try {
    const teacherId = parseInt(event.path.split('/')[3])
    
    // Check permissions
    if (user.role === 'teacher' && user.teacherId !== teacherId) {
      return errorResponse(403, 'Forbidden')
    }

    const { photo_url } = JSON.parse(event.body)

    if (!photo_url) {
      return errorResponse(400, 'Photo URL is required')
    }

    const queryText = `
      UPDATE teachers 
      SET photo_url = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING *
    `
    
    const result = await query(queryText, [photo_url, teacherId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Teacher not found')
    }

    return successResponse({ teacher: result.rows[0] })
  } catch (error) {
    console.error('Upload teacher photo error:', error)
    return errorResponse(500, 'Failed to upload photo')
  }
}

// Bulk update teachers
async function bulkUpdateTeachers(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { teacherIds, updates } = JSON.parse(event.body)

    if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return errorResponse(400, 'Teacher IDs are required')
    }

    if (!updates || Object.keys(updates).length === 0) {
      return errorResponse(400, 'Updates are required')
    }

    const allowedFields = ['name', 'email', 'description', 'is_active']
    const updateFields = Object.keys(updates).filter(field => allowedFields.includes(field))
    
    if (updateFields.length === 0) {
      return errorResponse(400, 'No valid fields to update')
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ')
    const queryText = `
      UPDATE teachers 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1) AND is_active = true
      RETURNING *
    `

    const params = [teacherIds, ...updateFields.map(field => updates[field])]
    const result = await query(queryText, params)

    return successResponse({ 
      message: `Updated ${result.rows.length} teachers`,
      teachers: result.rows 
    })
  } catch (error) {
    console.error('Bulk update teachers error:', error)
    return errorResponse(500, 'Failed to bulk update teachers')
  }
}
