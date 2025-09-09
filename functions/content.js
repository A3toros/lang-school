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
    if (path === '/api/content/mission' && method === 'GET') {
      return await getMissionContent(event, user)
    } else if (path === '/api/content/mission' && method === 'PUT') {
      return await updateMissionContent(event, user)
    } else if (path === '/api/content/courses' && method === 'GET') {
      return await getCourses(event, user)
    } else if (path.match(/^\/api\/content\/courses\/\d+$/) && method === 'GET') {
      return await getCourse(event, user)
    } else if (path === '/api/content/courses' && method === 'POST') {
      return await createCourse(event, user)
    } else if (path.match(/^\/api\/content\/courses\/\d+$/) && method === 'PUT') {
      return await updateCourse(event, user)
    } else if (path.match(/^\/api\/content\/courses\/\d+$/) && method === 'DELETE') {
      return await deleteCourse(event, user)
    } else if (path === '/api/content/showcase' && method === 'GET') {
      return await getShowcaseSettings(event, user)
    } else if (path === '/api/content/showcase' && method === 'PUT') {
      return await updateShowcaseSettings(event, user)
    } else if (path === '/api/content/featured-teachers' && method === 'POST') {
      return await setFeaturedTeachers(event, user)
    } else if (path === '/api/content/courses/active' && method === 'GET') {
      return await getActiveCourses(event, user)
    } else if (path.match(/^\/api\/content\/courses\/\d+\/toggle$/) && method === 'PUT') {
      return await toggleCourse(event, user)
    } else if (path === '/api/content/courses/reorder' && method === 'POST') {
      return await reorderCourses(event, user)
    } else if (path === '/api/content/export' && method === 'GET') {
      return await exportContent(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Content API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get mission content
async function getMissionContent(event, user) {
  try {
    const queryText = `
      SELECT * FROM mission_content 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    const result = await query(queryText)
    
    if (result.rows.length === 0) {
      return successResponse({ 
        mission: {
          title: 'Our Mission',
          content: 'Welcome to LangSchool - your gateway to language learning excellence.',
          banner_image: null,
          banner_image_public_id: null
        }
      })
    }

    return successResponse({ mission: result.rows[0] })
  } catch (error) {
    console.error('Get mission content error:', error)
    return errorResponse(500, 'Failed to fetch mission content')
  }
}

// Update mission content
async function updateMissionContent(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { title, content, banner_image, banner_image_public_id } = JSON.parse(event.body)

    if (!title || !content) {
      return errorResponse(400, 'title and content are required')
    }

    // Check if mission content exists
    const existingCheck = await query('SELECT id FROM mission_content WHERE is_active = true LIMIT 1')
    
    let result
    if (existingCheck.rows.length > 0) {
      // Update existing
      const queryText = `
        UPDATE mission_content 
        SET title = $1, content = $2, banner_image = $3, banner_image_public_id = $4, updated_at = CURRENT_TIMESTAMP
        WHERE is_active = true
        RETURNING *
      `
      result = await query(queryText, [title, content, banner_image, banner_image_public_id])
    } else {
      // Create new
      const queryText = `
        INSERT INTO mission_content (title, content, banner_image, banner_image_public_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `
      result = await query(queryText, [title, content, banner_image, banner_image_public_id])
    }

    return successResponse({ mission: result.rows[0] })
  } catch (error) {
    console.error('Update mission content error:', error)
    return errorResponse(500, 'Failed to update mission content')
  }
}

// Get all courses
async function getCourses(event, user) {
  try {
    const { active_only } = event.queryStringParameters || {}

    let queryText = `
      SELECT * FROM courses
    `
    let params = []

    if (active_only === 'true') {
      queryText += ` WHERE is_active = true`
    }

    queryText += ` ORDER BY display_order, name`

    const result = await query(queryText, params)
    return successResponse({ courses: result.rows })
  } catch (error) {
    console.error('Get courses error:', error)
    return errorResponse(500, 'Failed to fetch courses')
  }
}

// Get specific course
async function getCourse(event, user) {
  try {
    const courseId = parseInt(event.path.split('/')[4])

    const queryText = `SELECT * FROM courses WHERE id = $1`
    const result = await query(queryText, [courseId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Course not found')
    }

    return successResponse({ course: result.rows[0] })
  } catch (error) {
    console.error('Get course error:', error)
    return errorResponse(500, 'Failed to fetch course')
  }
}

// Create new course
async function createCourse(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { name, description, background_image, background_image_public_id, detailed_description, display_order } = JSON.parse(event.body)

    if (!name || !description) {
      return errorResponse(400, 'name and description are required')
    }

    // Get next display order if not provided
    let order = display_order
    if (!order) {
      const maxOrderResult = await query('SELECT MAX(display_order) as max_order FROM courses')
      order = (maxOrderResult.rows[0].max_order || 0) + 1
    }

    const queryText = `
      INSERT INTO courses (name, description, background_image, background_image_public_id, detailed_description, display_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `
    
    const result = await query(queryText, [name, description, background_image, background_image_public_id, detailed_description, order])
    return successResponse({ course: result.rows[0] }, 201)
  } catch (error) {
    console.error('Create course error:', error)
    return errorResponse(500, 'Failed to create course')
  }
}

// Update course
async function updateCourse(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const courseId = parseInt(event.path.split('/')[4])
    const { name, description, background_image, background_image_public_id, detailed_description, display_order, is_active } = JSON.parse(event.body)

    const queryText = `
      UPDATE courses 
      SET name = $1, description = $2, background_image = $3, background_image_public_id = $4, 
          detailed_description = $5, display_order = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `
    
    const result = await query(queryText, [name, description, background_image, background_image_public_id, detailed_description, display_order, is_active, courseId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Course not found')
    }

    return successResponse({ course: result.rows[0] })
  } catch (error) {
    console.error('Update course error:', error)
    return errorResponse(500, 'Failed to update course')
  }
}

// Delete course
async function deleteCourse(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const courseId = parseInt(event.path.split('/')[4])
    await query('DELETE FROM courses WHERE id = $1', [courseId])
    return successResponse({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Delete course error:', error)
    return errorResponse(500, 'Failed to delete course')
  }
}

// Get teacher showcase settings
async function getShowcaseSettings(event, user) {
  try {
    const queryText = `
      SELECT * FROM teacher_showcase_settings 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    const result = await query(queryText)
    
    if (result.rows.length === 0) {
      return successResponse({ 
        settings: {
          display_count: 3,
          rotation_type: 'random'
        }
      })
    }

    return successResponse({ settings: result.rows[0] })
  } catch (error) {
    console.error('Get showcase settings error:', error)
    return errorResponse(500, 'Failed to fetch showcase settings')
  }
}

// Update teacher showcase settings
async function updateShowcaseSettings(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { display_count, rotation_type } = JSON.parse(event.body)

    if (!display_count || !rotation_type) {
      return errorResponse(400, 'display_count and rotation_type are required')
    }

    // Check if settings exist
    const existingCheck = await query('SELECT id FROM teacher_showcase_settings WHERE is_active = true LIMIT 1')
    
    let result
    if (existingCheck.rows.length > 0) {
      // Update existing
      const queryText = `
        UPDATE teacher_showcase_settings 
        SET display_count = $1, rotation_type = $2, updated_at = CURRENT_TIMESTAMP
        WHERE is_active = true
        RETURNING *
      `
      result = await query(queryText, [display_count, rotation_type])
    } else {
      // Create new
      const queryText = `
        INSERT INTO teacher_showcase_settings (display_count, rotation_type)
        VALUES ($1, $2)
        RETURNING *
      `
      result = await query(queryText, [display_count, rotation_type])
    }

    return successResponse({ settings: result.rows[0] })
  } catch (error) {
    console.error('Update showcase settings error:', error)
    return errorResponse(500, 'Failed to update showcase settings')
  }
}

// Set featured teachers
async function setFeaturedTeachers(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { teacher_ids } = JSON.parse(event.body)

    if (!Array.isArray(teacher_ids)) {
      return errorResponse(400, 'teacher_ids must be an array')
    }

    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')

      // Clear existing featured teachers
      await client.query('UPDATE featured_teachers SET is_active = false')

      // Add new featured teachers
      for (let i = 0; i < teacher_ids.length; i++) {
        const teacherId = teacher_ids[i]
        
        // Check if teacher exists and is active
        const teacherCheck = await client.query(
          'SELECT id FROM teachers WHERE id = $1 AND is_active = true',
          [teacherId]
        )
        
        if (teacherCheck.rows.length > 0) {
          await client.query(
            'INSERT INTO featured_teachers (teacher_id, display_order, is_active) VALUES ($1, $2, true) ON CONFLICT (teacher_id) DO UPDATE SET display_order = $2, is_active = true',
            [teacherId, i + 1]
          )
        }
      }

      await client.query('COMMIT')
      return successResponse({ message: 'Featured teachers updated successfully' })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Set featured teachers error:', error)
    return errorResponse(500, 'Failed to set featured teachers')
  }
}

// Get active courses only
async function getActiveCourses(event, user) {
  try {
    const queryText = `
      SELECT * FROM courses 
      WHERE is_active = true 
      ORDER BY display_order, name
    `
    
    const result = await query(queryText)
    return successResponse({ courses: result.rows })
  } catch (error) {
    console.error('Get active courses error:', error)
    return errorResponse(500, 'Failed to fetch active courses')
  }
}

// Toggle course active status
async function toggleCourse(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const courseId = parseInt(event.path.split('/')[4])
    const { is_active } = JSON.parse(event.body)

    const queryText = `
      UPDATE courses 
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `
    
    const result = await query(queryText, [is_active, courseId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Course not found')
    }

    return successResponse({ course: result.rows[0] })
  } catch (error) {
    console.error('Toggle course error:', error)
    return errorResponse(500, 'Failed to toggle course')
  }
}

// Reorder courses
async function reorderCourses(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { course_orders } = JSON.parse(event.body)

    if (!Array.isArray(course_orders)) {
      return errorResponse(400, 'course_orders must be an array')
    }

    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')

      for (const { course_id, display_order } of course_orders) {
        await client.query(
          'UPDATE courses SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [display_order, course_id]
        )
      }

      await client.query('COMMIT')
      return successResponse({ message: 'Courses reordered successfully' })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Reorder courses error:', error)
    return errorResponse(500, 'Failed to reorder courses')
  }
}

// Export content data
async function exportContent(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    // Get all content data
    const [missionResult, coursesResult, settingsResult] = await Promise.all([
      query('SELECT * FROM mission_content WHERE is_active = true ORDER BY created_at DESC LIMIT 1'),
      query('SELECT * FROM courses ORDER BY display_order, name'),
      query('SELECT * FROM teacher_showcase_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1')
    ])

    return successResponse({
      mission: missionResult.rows[0] || null,
      courses: coursesResult.rows,
      showcase_settings: settingsResult.rows[0] || null
    })
  } catch (error) {
    console.error('Export content error:', error)
    return errorResponse(500, 'Failed to export content data')
  }
}
