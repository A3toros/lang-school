require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders, getPool  } = require('./utils/database.js')

const handler = async (event, context) => {
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
    // Check if this is a public endpoint that doesn't require authentication
    let user = null
    let isPublicEndpoint = false

    if ((path === '/api/content/mission' && method === 'GET') || 
        (path === '/api/content/courses' && method === 'GET') ||
        (path === '/api/content/showcase/public' && method === 'GET')) {
      // Mission content, courses, and public showcase settings are public - no authentication required
      isPublicEndpoint = true
    } else {
      // All other routes require authentication
      try {
        user = verifyToken(event)
      } catch (error) {
        return errorResponse(401, 'Unauthorized')
      }
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
    } else if (path === '/api/content/showcase/public' && method === 'GET') {
      // Public access to showcase settings (no authentication required)
      return await getShowcaseSettings(event, null)
    } else if (path === '/api/content/featured-teachers' && method === 'POST') {
      return await setFeaturedTeachers(event, user)
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
  console.log('🔍 [CONTENT] getMissionContent called', {
    userId: user?.userId || 'public',
    role: user?.role || 'public',
    isPublicAccess: !user
  })

  try {
    const queryText = `
      SELECT * FROM mission_content 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    console.log('🔍 [CONTENT] Executing mission content query')
    
    const result = await query(queryText)
    
    if (result.rows.length === 0) {
      console.log('📋 [CONTENT] No mission content found, returning default')
      return successResponse({ 
        mission: {
          title: 'Our Mission',
          content: 'Welcome to LangSchool - your gateway to language learning excellence.',
          banner_image: null,
          banner_image_public_id: null
        }
      })
    }

    console.log('✅ [CONTENT] Mission content fetched successfully', {
      title: result.rows[0].title,
      hasBanner: !!result.rows[0].banner_image
    })

    return successResponse({ mission: result.rows[0] })
  } catch (error) {
    console.error('❌ [CONTENT] Get mission content error:', error)
    return errorResponse(500, 'Failed to fetch mission content')
  }
}

// Update mission content
async function updateMissionContent(event, user) {
  console.log('🔍 [CONTENT] updateMissionContent called', {
    userId: user.userId,
    role: user.role,
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [CONTENT] Update forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const { title, content, banner_image, banner_image_public_id } = JSON.parse(event.body)

    console.log('📋 [CONTENT] Mission content validation', {
      title: !!title,
      content: !!content,
      hasBanner: !!banner_image,
      hasBannerId: !!banner_image_public_id
    })

    if (!title || !content) {
      console.log('❌ [CONTENT] Missing required fields', {
        title: !!title,
        content: !!content
      })
      return errorResponse(400, 'title and content are required')
    }

    // Check if mission content exists
    console.log('🔍 [CONTENT] Checking for existing mission content')
    const existingCheck = await query('SELECT id FROM mission_content WHERE is_active = true LIMIT 1')
    
    let result
    if (existingCheck.rows.length > 0) {
      console.log('📝 [CONTENT] Updating existing mission content')
      // Update existing
      const queryText = `
        UPDATE mission_content 
        SET title = $1, content = $2, banner_image = $3, banner_image_public_id = $4, updated_at = CURRENT_TIMESTAMP
        WHERE is_active = true
        RETURNING *
      `
      result = await query(queryText, [title, content, banner_image, banner_image_public_id])
    } else {
      console.log('➕ [CONTENT] Creating new mission content')
      // Create new
      const queryText = `
        INSERT INTO mission_content (title, content, banner_image, banner_image_public_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `
      result = await query(queryText, [title, content, banner_image, banner_image_public_id])
    }

    console.log('✅ [CONTENT] Mission content updated successfully', {
      id: result.rows[0].id,
      title: result.rows[0].title
    })

    return successResponse({ mission: result.rows[0] })
  } catch (error) {
    console.error('❌ [CONTENT] Update mission content error:', error)
    return errorResponse(500, 'Failed to update mission content')
  }
}

// Get all courses
async function getCourses(event, user) {
  console.log('🔍 [CONTENT] getCourses called', {
    userId: user?.userId || 'public',
    role: user?.role || 'public',
    isPublicAccess: !user,
    queryParams: event.queryStringParameters
  })

  try {
    const { active_only } = event.queryStringParameters || {}

    console.log('📋 [CONTENT] Courses parameters', {
      active_only,
      filterActive: active_only === 'true'
    })

    let queryText = `
      SELECT * FROM courses
    `
    let params = []

    if (active_only === 'true') {
      queryText += ` WHERE is_active = true`
      console.log('🔍 [CONTENT] Filtering for active courses only')
    }

    queryText += ` ORDER BY display_order, name`

    console.log('🔍 [CONTENT] Executing courses query', {
      queryText: queryText.substring(0, 100) + '...',
      paramsCount: params.length
    })

    const result = await query(queryText, params)
    
    console.log('✅ [CONTENT] Courses fetched successfully', {
      count: result.rows.length,
      courses: result.rows.map(c => ({ 
        id: c.id, 
        name: c.name, 
        description: c.description,
        background_image: c.background_image,
        background_image_public_id: c.background_image_public_id,
        detailed_description: c.detailed_description,
        is_active: c.is_active, 
        display_order: c.display_order 
      }))
    })

    return successResponse({ courses: result.rows })
  } catch (error) {
    console.error('❌ [CONTENT] Get courses error:', error)
    return errorResponse(500, 'Failed to fetch courses')
  }
}

// Get specific course
async function getCourse(event, user) {
  console.log('🔍 [CONTENT] getCourse called', {
    userId: user.userId,
    role: user.role,
    courseId: event.path.split('/')[4]
  })

  try {
    const courseId = parseInt(event.path.split('/')[4])

    console.log('📋 [CONTENT] Fetching course', { courseId })

    const queryText = `SELECT * FROM courses WHERE id = $1`
    const result = await query(queryText, [courseId])
    
    if (result.rows.length === 0) {
      console.log('❌ [CONTENT] Course not found', { courseId })
      return errorResponse(404, 'Course not found')
    }

    console.log('✅ [CONTENT] Course fetched successfully', {
      courseId,
      name: result.rows[0].name,
      is_active: result.rows[0].is_active
    })

    return successResponse({ course: result.rows[0] })
  } catch (error) {
    console.error('❌ [CONTENT] Get course error:', error)
    return errorResponse(500, 'Failed to fetch course')
  }
}

// Create new course
async function createCourse(event, user) {
  console.log('🔍 [CONTENT] createCourse called', {
    userId: user.userId,
    role: user.role,
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [CONTENT] Create forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const { name, description, background_image, background_image_public_id, detailed_description, display_order } = JSON.parse(event.body)

    console.log('📋 [CONTENT] Course data validation', {
      name: !!name,
      description: !!description,
      hasBackgroundImage: !!background_image,
      hasDetailedDescription: !!detailed_description,
      display_order
    })

    if (!name || !description) {
      console.log('❌ [CONTENT] Missing required fields', {
        name: !!name,
        description: !!description
      })
      return errorResponse(400, 'name and description are required')
    }

    // Get next display order if not provided
    let order = display_order
    if (!order) {
      console.log('🔍 [CONTENT] Getting next display order')
      const maxOrderResult = await query('SELECT MAX(display_order) as max_order FROM courses')
      order = (maxOrderResult.rows[0].max_order || 0) + 1
      console.log('📋 [CONTENT] Next display order', { order })
    }

    const queryText = `
      INSERT INTO courses (name, description, background_image, background_image_public_id, detailed_description, display_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `
    
    console.log('🔍 [CONTENT] Creating course', {
      name,
      description: description.substring(0, 50) + '...',
      order
    })
    
    const result = await query(queryText, [name, description, background_image, background_image_public_id, detailed_description, order])
    
    console.log('✅ [CONTENT] Course created successfully', {
      courseId: result.rows[0].id,
      name: result.rows[0].name,
      display_order: result.rows[0].display_order
    })

    return successResponse({ course: result.rows[0] }, 201)
  } catch (error) {
    console.error('❌ [CONTENT] Create course error:', error)
    return errorResponse(500, 'Failed to create course')
  }
}

// Update course
async function updateCourse(event, user) {
  console.log('🔍 [CONTENT] updateCourse called', {
    userId: user.userId,
    role: user.role,
    courseId: event.path.split('/')[4],
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [CONTENT] Update forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const courseId = parseInt(event.path.split('/')[4])
    const { name, description, background_image, background_image_public_id, detailed_description, display_order, is_active } = JSON.parse(event.body)

    console.log('📋 [CONTENT] Course update data', {
      courseId,
      name: !!name,
      description: !!description,
      hasBackgroundImage: !!background_image,
      hasDetailedDescription: !!detailed_description,
      display_order,
      is_active
    })

    const queryText = `
      UPDATE courses 
      SET name = $1, description = $2, background_image = $3, background_image_public_id = $4, 
          detailed_description = $5, display_order = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `
    
    console.log('🔍 [CONTENT] Updating course', {
      courseId,
      name: name?.substring(0, 50) + '...'
    })
    
    const result = await query(queryText, [name, description, background_image, background_image_public_id, detailed_description, display_order, is_active, courseId])
    
    if (result.rows.length === 0) {
      console.log('❌ [CONTENT] Course not found', { courseId })
      return errorResponse(404, 'Course not found')
    }

    console.log('✅ [CONTENT] Course updated successfully', {
      courseId,
      name: result.rows[0].name,
      is_active: result.rows[0].is_active
    })

    return successResponse({ course: result.rows[0] })
  } catch (error) {
    console.error('❌ [CONTENT] Update course error:', error)
    return errorResponse(500, 'Failed to update course')
  }
}

// Delete course
async function deleteCourse(event, user) {
  console.log('🔍 [CONTENT] deleteCourse called', {
    userId: user.userId,
    role: user.role,
    courseId: event.path.split('/')[4]
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [CONTENT] Delete forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const courseId = parseInt(event.path.split('/')[4])
    
    console.log('📋 [CONTENT] Deleting course', { courseId })
    
    await query('DELETE FROM courses WHERE id = $1', [courseId])
    
    console.log('✅ [CONTENT] Course deleted successfully', { courseId })

    return successResponse({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('❌ [CONTENT] Delete course error:', error)
    return errorResponse(500, 'Failed to delete course')
  }
}

// Get teacher showcase settings (public access)
async function getShowcaseSettings(event, user) {
  console.log('🔍 [CONTENT] getShowcaseSettings called', {
    userId: user?.userId || 'public',
    role: user?.role || 'public'
  })

  try {
    const queryText = `
      SELECT * FROM teacher_showcase_settings 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    console.log('🔍 [CONTENT] Executing showcase settings query')
    
    const result = await query(queryText)
    
    if (result.rows.length === 0) {
      console.log('📋 [CONTENT] No showcase settings found, returning default')
      return successResponse({ 
        settings: {
          display_count: 3,
          rotation_type: 'random'
        }
      })
    }

    console.log('✅ [CONTENT] Showcase settings fetched successfully', {
      display_count: result.rows[0].display_count,
      rotation_type: result.rows[0].rotation_type
    })

    return successResponse({ settings: result.rows[0] })
  } catch (error) {
    console.error('❌ [CONTENT] Get showcase settings error:', error)
    return errorResponse(500, 'Failed to fetch showcase settings')
  }
}

// Update teacher showcase settings
async function updateShowcaseSettings(event, user) {
  console.log('🔍 [CONTENT] updateShowcaseSettings called', {
    userId: user.userId,
    role: user.role,
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [CONTENT] Update forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const { display_count, rotation_type } = JSON.parse(event.body)

    console.log('📋 [CONTENT] Showcase settings validation', {
      display_count,
      rotation_type,
      hasDisplayCount: !!display_count,
      hasRotationType: !!rotation_type
    })

    if (!display_count || !rotation_type) {
      console.log('❌ [CONTENT] Missing required fields', {
        display_count: !!display_count,
        rotation_type: !!rotation_type
      })
      return errorResponse(400, 'display_count and rotation_type are required')
    }

    // Check if settings exist
    console.log('🔍 [CONTENT] Checking for existing showcase settings')
    const existingCheck = await query('SELECT id FROM teacher_showcase_settings WHERE is_active = true LIMIT 1')
    
    let result
    if (existingCheck.rows.length > 0) {
      console.log('📝 [CONTENT] Updating existing showcase settings')
      // Update existing
      const queryText = `
        UPDATE teacher_showcase_settings 
        SET display_count = $1, rotation_type = $2, updated_at = CURRENT_TIMESTAMP
        WHERE is_active = true
        RETURNING *
      `
      result = await query(queryText, [display_count, rotation_type])
    } else {
      console.log('➕ [CONTENT] Creating new showcase settings')
      // Create new
      const queryText = `
        INSERT INTO teacher_showcase_settings (display_count, rotation_type)
        VALUES ($1, $2)
        RETURNING *
      `
      result = await query(queryText, [display_count, rotation_type])
    }

    console.log('✅ [CONTENT] Showcase settings updated successfully', {
      id: result.rows[0].id,
      display_count: result.rows[0].display_count,
      rotation_type: result.rows[0].rotation_type
    })

    return successResponse({ settings: result.rows[0] })
  } catch (error) {
    console.error('❌ [CONTENT] Update showcase settings error:', error)
    return errorResponse(500, 'Failed to update showcase settings')
  }
}

// Set featured teachers
async function setFeaturedTeachers(event, user) {
  console.log('🔍 [CONTENT] setFeaturedTeachers called', {
    userId: user.userId,
    role: user.role,
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [CONTENT] Set featured teachers forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const { teacher_ids } = JSON.parse(event.body)

    console.log('📋 [CONTENT] Featured teachers data', {
      teacher_ids,
      isArray: Array.isArray(teacher_ids),
      count: teacher_ids?.length
    })

    if (!Array.isArray(teacher_ids)) {
      console.log('❌ [CONTENT] Invalid teacher_ids format', { type: typeof teacher_ids })
      return errorResponse(400, 'teacher_ids must be an array')
    }

    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')
      console.log('🔍 [CONTENT] Transaction started for featured teachers')

      // Clear existing featured teachers
      console.log('🧹 [CONTENT] Clearing existing featured teachers')
      await client.query('UPDATE featured_teachers SET is_active = false')

      let addedCount = 0
      let skippedCount = 0

      // Add new featured teachers
      for (let i = 0; i < teacher_ids.length; i++) {
        const teacherId = teacher_ids[i]
        
        console.log('🔍 [CONTENT] Processing teacher', { teacherId, index: i + 1 })
        
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
          addedCount++
          console.log('✅ [CONTENT] Teacher added to featured', { teacherId, display_order: i + 1 })
        } else {
          skippedCount++
          console.log('⚠️ [CONTENT] Teacher skipped - not found or inactive', { teacherId })
        }
      }

      await client.query('COMMIT')
      
      console.log('✅ [CONTENT] Featured teachers updated successfully', {
        added: addedCount,
        skipped: skippedCount,
        total: teacher_ids.length
      })

      return successResponse({ 
        message: 'Featured teachers updated successfully',
        added: addedCount,
        skipped: skippedCount
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.log('❌ [CONTENT] Transaction rolled back due to error')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ [CONTENT] Set featured teachers error:', error)
    return errorResponse(500, 'Failed to set featured teachers')
  }
}


// Toggle course active status
async function toggleCourse(event, user) {
  console.log('🔍 [CONTENT] toggleCourse called', {
    userId: user.userId,
    role: user.role,
    courseId: event.path.split('/')[4],
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [CONTENT] Toggle forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const courseId = parseInt(event.path.split('/')[4])
    const { is_active } = JSON.parse(event.body)

    console.log('📋 [CONTENT] Course toggle data', {
      courseId,
      is_active,
      newStatus: is_active ? 'active' : 'inactive'
    })

    const queryText = `
      UPDATE courses 
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `
    
    console.log('🔍 [CONTENT] Toggling course status', { courseId, is_active })
    
    const result = await query(queryText, [is_active, courseId])
    
    if (result.rows.length === 0) {
      console.log('❌ [CONTENT] Course not found', { courseId })
      return errorResponse(404, 'Course not found')
    }

    console.log('✅ [CONTENT] Course status toggled successfully', {
      courseId,
      name: result.rows[0].name,
      is_active: result.rows[0].is_active
    })

    return successResponse({ course: result.rows[0] })
  } catch (error) {
    console.error('❌ [CONTENT] Toggle course error:', error)
    return errorResponse(500, 'Failed to toggle course')
  }
}

// Reorder courses
async function reorderCourses(event, user) {
  console.log('🔍 [CONTENT] reorderCourses called', {
    userId: user.userId,
    role: user.role,
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [CONTENT] Reorder forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const { course_orders } = JSON.parse(event.body)

    console.log('📋 [CONTENT] Course reorder data', {
      course_orders,
      isArray: Array.isArray(course_orders),
      count: course_orders?.length
    })

    if (!Array.isArray(course_orders)) {
      console.log('❌ [CONTENT] Invalid course_orders format', { type: typeof course_orders })
      return errorResponse(400, 'course_orders must be an array')
    }

    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')
      console.log('🔍 [CONTENT] Transaction started for course reordering')

      let updatedCount = 0

      for (const { course_id, display_order } of course_orders) {
        console.log('🔍 [CONTENT] Updating course order', {
          course_id,
          display_order
        })
        
        await client.query(
          'UPDATE courses SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [display_order, course_id]
        )
        
        updatedCount++
        console.log('✅ [CONTENT] Course order updated', { course_id, display_order })
      }

      await client.query('COMMIT')
      
      console.log('✅ [CONTENT] Courses reordered successfully', {
        updated: updatedCount,
        total: course_orders.length
      })

      return successResponse({ 
        message: 'Courses reordered successfully',
        updated: updatedCount
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.log('❌ [CONTENT] Transaction rolled back due to error')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ [CONTENT] Reorder courses error:', error)
    return errorResponse(500, 'Failed to reorder courses')
  }
}

// Export content data
async function exportContent(event, user) {
  console.log('🔍 [CONTENT] exportContent called', {
    userId: user.userId,
    role: user.role
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [CONTENT] Export forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    console.log('🔍 [CONTENT] Fetching all content data for export')

    // Get all content data
    const [missionResult, coursesResult, settingsResult] = await Promise.all([
      query('SELECT * FROM mission_content WHERE is_active = true ORDER BY created_at DESC LIMIT 1'),
      query('SELECT * FROM courses ORDER BY display_order, name'),
      query('SELECT * FROM teacher_showcase_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1')
    ])

    console.log('✅ [CONTENT] Content data fetched for export', {
      mission: !!missionResult.rows[0],
      courses: coursesResult.rows.length,
      settings: !!settingsResult.rows[0]
    })

    return successResponse({
      mission: missionResult.rows[0] || null,
      courses: coursesResult.rows,
      showcase_settings: settingsResult.rows[0] || null
    })
  } catch (error) {
    console.error('❌ [CONTENT] Export content error:', error)
    return errorResponse(500, 'Failed to export content data')
  }
}

// Export the handler for Netlify Functions
module.exports = { handler }
