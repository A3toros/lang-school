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
    if (path === '/api/users' && method === 'GET') {
      return await getAllUsers(event, user)
    } else if (path.startsWith('/api/users/') && method === 'GET') {
      return await getUser(event, user)
    } else if (path === '/api/users' && method === 'POST') {
      return await createUser(event, user)
    } else if (path.startsWith('/api/users/') && method === 'PUT') {
      return await updateUser(event, user)
    } else if (path.startsWith('/api/users/') && method === 'DELETE') {
      return await deleteUser(event, user)
    } else if (path.includes('/suspend') && method === 'POST') {
      return await suspendUser(event, user)
    } else if (path.includes('/unsuspend') && method === 'POST') {
      return await unsuspendUser(event, user)
    } else if (path.includes('/activity/') && method === 'GET') {
      return await getUserActivity(event, user)
    } else if (path === '/api/users/roles' && method === 'GET') {
      return await getUserRoles(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Users API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get all users (admin only)
async function getAllUsers(event, user) {
  console.log('🔍 [USERS] getAllUsers called', { 
    userId: user.userId, 
    role: user.role, 
    queryParams: event.queryStringParameters 
  })
  
  try {
    if (user.role !== 'admin') {
      console.log('❌ [USERS] Access denied - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const { page = 1, limit = 50, role, is_active } = event.queryStringParameters || {}
    const offset = (parseInt(page) - 1) * parseInt(limit)
    console.log('📊 [USERS] Fetching users with filters', { page, limit, role, is_active, offset })

    let queryStr = `
      SELECT 
        u.id,
        u.username,
        u.role,
        u.is_active,
        u.password_changed_by_admin,
        u.password_changed_at,
        u.created_at,
        u.updated_at,
        t.name as teacher_name,
        t.email as teacher_email
      FROM users u
      LEFT JOIN teachers t ON u.teacher_id = t.id
      WHERE 1=1
    `
    
    const params = []
    let paramCount = 0

    if (role) {
      paramCount++
      queryStr += ` AND u.role = $${paramCount}`
      params.push(role)
    }

    if (is_active !== undefined) {
      paramCount++
      queryStr += ` AND u.is_active = $${paramCount}`
      params.push(is_active === 'true')
    }

    queryStr += ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(parseInt(limit), offset)

    const result = await query(queryStr, params)

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE 1=1
    `
    
    const countParams = []
    let countParamCount = 0

    if (role) {
      countParamCount++
      countQuery += ` AND u.role = $${countParamCount}`
      countParams.push(role)
    }

    if (is_active !== undefined) {
      countParamCount++
      countQuery += ` AND u.is_active = $${countParamCount}`
      countParams.push(is_active === 'true')
    }

    console.log('🔄 [USERS] Executing count query')
    const countResult = await query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    console.log('✅ [USERS] Users fetched successfully', {
      userCount: result.rows.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    })

    const response = {
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }

    console.log('📋 [USERS] Users response prepared', {
      users: result.rows.map(u => ({ id: u.id, username: u.username, role: u.role })),
      pagination: response.pagination
    })

    return successResponse(response)
  } catch (error) {
    console.error('❌ [USERS] Get all users error:', error)
    return errorResponse(500, 'Failed to get users')
  }
}

// Get specific user
async function getUser(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const userId = event.path.split('/').pop()
    
    const result = await query(`
      SELECT 
        u.id,
        u.username,
        u.role,
        u.is_active,
        u.password_changed_by_admin,
        u.password_changed_at,
        u.created_at,
        u.updated_at,
        t.name as teacher_name,
        t.email as teacher_email
      FROM users u
      LEFT JOIN teachers t ON u.teacher_id = t.id
      WHERE u.id = $1
    `, [userId])

    if (result.rows.length === 0) {
      return errorResponse(404, 'User not found')
    }

    return successResponse({ user: result.rows[0] })
  } catch (error) {
    console.error('Get user error:', error)
    return errorResponse(500, 'Failed to get user')
  }
}

// Create new user
async function createUser(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { username, password, role, teacher_id } = JSON.parse(event.body)

    if (!username || !password || !role) {
      return errorResponse(400, 'Username, password, and role are required')
    }

    if (role === 'teacher' && !teacher_id) {
      return errorResponse(400, 'Teacher ID is required for teacher role')
    }

    if (role === 'admin' && teacher_id) {
      return errorResponse(400, 'Admin users cannot have teacher ID')
    }

    // Check if username already exists
    const existingUser = await query('SELECT id FROM users WHERE username = $1', [username])
    if (existingUser.rows.length > 0) {
      return errorResponse(400, 'Username already exists')
    }

    // Create user
    const result = await query(`
      INSERT INTO users (username, password, role, teacher_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [username, password, role, teacher_id])

    return successResponse({ user: result.rows[0] })
  } catch (error) {
    console.error('Create user error:', error)
    return errorResponse(500, 'Failed to create user')
  }
}

// Update user
async function updateUser(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const userId = event.path.split('/').pop()
    const { username, password, role, teacher_id, is_active } = JSON.parse(event.body)

    const updateFields = []
    const params = []
    let paramCount = 0

    if (username) {
      paramCount++
      updateFields.push(`username = $${paramCount}`)
      params.push(username)
    }

    if (password) {
      paramCount++
      updateFields.push(`password = $${paramCount}`)
      params.push(password)
    }

    if (role) {
      paramCount++
      updateFields.push(`role = $${paramCount}`)
      params.push(role)
    }

    if (teacher_id !== undefined) {
      paramCount++
      updateFields.push(`teacher_id = $${paramCount}`)
      params.push(teacher_id)
    }

    if (is_active !== undefined) {
      paramCount++
      updateFields.push(`is_active = $${paramCount}`)
      params.push(is_active)
    }

    if (updateFields.length === 0) {
      return errorResponse(400, 'No fields to update')
    }

    paramCount++
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(userId)

    const result = await query(`
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, params)

    if (result.rows.length === 0) {
      return errorResponse(404, 'User not found')
    }

    return successResponse({ user: result.rows[0] })
  } catch (error) {
    console.error('Update user error:', error)
    return errorResponse(500, 'Failed to update user')
  }
}

// Delete user
async function deleteUser(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const userId = event.path.split('/').pop()

    if (parseInt(userId) === user.id) {
      return errorResponse(400, 'Cannot delete your own account')
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [userId])

    if (result.rows.length === 0) {
      return errorResponse(404, 'User not found')
    }

    return successResponse({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return errorResponse(500, 'Failed to delete user')
  }
}

// Suspend user
async function suspendUser(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const userId = event.path.split('/')[3]
    const { reason } = JSON.parse(event.body)

    if (parseInt(userId) === user.id) {
      return errorResponse(400, 'Cannot suspend your own account')
    }

    const result = await query(`
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [userId])

    if (result.rows.length === 0) {
      return errorResponse(404, 'User not found')
    }

    return successResponse({ 
      message: 'User suspended successfully',
      reason: reason || 'No reason provided'
    })
  } catch (error) {
    console.error('Suspend user error:', error)
    return errorResponse(500, 'Failed to suspend user')
  }
}

// Unsuspend user
async function unsuspendUser(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const userId = event.path.split('/')[3]

    const result = await query(`
      UPDATE users 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [userId])

    if (result.rows.length === 0) {
      return errorResponse(404, 'User not found')
    }

    return successResponse({ message: 'User unsuspended successfully' })
  } catch (error) {
    console.error('Unsuspend user error:', error)
    return errorResponse(500, 'Failed to unsuspend user')
  }
}

// Get user activity
async function getUserActivity(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const userId = event.path.split('/')[3]
    const { period = '30' } = event.queryStringParameters || {}
    const days = parseInt(period)

    // This is a simplified activity log - in a real app, you'd have an activity_logs table
    const result = await query(`
      SELECT 
        'login' as activity_type,
        created_at as activity_date,
        'User account created' as description
      FROM users 
      WHERE id = $1
      UNION ALL
      SELECT 
        'password_change' as activity_type,
        password_changed_at as activity_date,
        CASE 
          WHEN password_changed_by_admin THEN 'Password changed by admin'
          ELSE 'Password changed by user'
        END as description
      FROM users 
      WHERE id = $1 AND password_changed_at IS NOT NULL
      ORDER BY activity_date DESC
    `, [userId])

    return successResponse({ activities: result.rows })
  } catch (error) {
    console.error('Get user activity error:', error)
    return errorResponse(500, 'Failed to get user activity')
  }
}

// Get available user roles
async function getUserRoles(event, user) {
  try {
    const roles = [
      { value: 'admin', label: 'Administrator' },
      { value: 'teacher', label: 'Teacher' }
    ]

    return successResponse({ roles })
  } catch (error) {
    console.error('Get user roles error:', error)
    return errorResponse(500, 'Failed to get user roles')
  }
}
