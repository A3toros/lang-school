require('dotenv').config();

const { Pool } = require('pg')
const jwt = require('jsonwebtoken')

// Database connection
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

// JWT secrets
const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
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
    // Route to appropriate handler
    if (path === '/api/auth/login' && method === 'POST') {
      return await handleLogin(event)
    } else if (path === '/api/auth/refresh' && method === 'POST') {
      return await handleRefresh(event)
    } else if (path === '/api/auth/logout' && method === 'POST') {
      return await handleLogout(event)
    } else if (path === '/api/auth/verify' && method === 'GET') {
      return await handleVerify(event)
    } else if (path === '/api/auth/change-password' && method === 'POST') {
      return await handleChangePassword(event)
    } else if (path === '/api/auth/profile' && method === 'GET') {
      return await handleGetProfile(event)
    } else if (path === '/api/auth/validate-credentials' && method === 'POST') {
      return await handleValidateCredentials(event)
    } else if (path.startsWith('/api/auth/check-username/') && method === 'GET') {
      return await handleCheckUsername(event)
    } else {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Not found' })
      }
    }
  } catch (error) {
    console.error('Auth function error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Login handler
async function handleLogin(event) {
  try {
    const { username, password } = JSON.parse(event.body)

    if (!username || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Username and password are required' })
      }
    }

    // Query user from database
    const query = `
      SELECT u.id, u.username, u.password, u.role, u.teacher_id, u.is_active, t.name as teacher_name
      FROM users u
      LEFT JOIN teachers t ON u.teacher_id = t.id
      WHERE u.username = $1 AND u.is_active = true
    `
    
    const result = await pool.query(query, [username])
    
    if (result.rows.length === 0) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid credentials' })
      }
    }

    const user = result.rows[0]

    // Check password (plain text comparison as per user requirements)
    if (user.password !== password) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid credentials' })
      }
    }

    // Generate tokens with role and teacherId
    const tokenPayload = { 
      userId: user.id, 
      username: user.username, 
      role: user.role, 
      teacherId: user.teacher_id 
    }
    
    console.log('Generating tokens for user:', {
      userId: user.id,
      username: user.username,
      role: user.role,
      teacherId: user.teacher_id,
      teacherName: user.teacher_name
    })

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30m' })
    const refreshToken = jwt.sign(tokenPayload, JWT_REFRESH_SECRET, { expiresIn: '7d' })

    // Return success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          teacher_id: user.teacher_id,
          teacher_name: user.teacher_name
        }
      })
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Login failed' })
    }
  }
}

// Refresh token handler
async function handleRefresh(event) {
  try {
    const { refreshToken } = JSON.parse(event.body)

    if (!refreshToken) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Refresh token is required' })
      }
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)

    // Generate new access token
    const newAccessToken = jwt.sign(
      { 
        userId: decoded.userId, 
        username: decoded.username, 
        role: decoded.role, 
        teacherId: decoded.teacherId 
      },
      JWT_SECRET,
      { expiresIn: '30m' }
    )

    // Generate new refresh token (token rotation)
    const newRefreshToken = jwt.sign(
      { 
        userId: decoded.userId, 
        username: decoded.username, 
        role: decoded.role, 
        teacherId: decoded.teacherId 
      },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      })
    }
  } catch (error) {
    console.error('Refresh error:', error)
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid refresh token' })
    }
  }
}

// Logout handler
async function handleLogout(event) {
  // For JWT tokens, logout is handled client-side by clearing tokens
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true })
  }
}

// Verify token handler
async function handleVerify(event) {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No token provided' })
      }
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)

    // Get user data from database
    const query = `
      SELECT u.id, u.username, u.role, u.teacher_id, u.is_active, t.name as teacher_name
      FROM users u
      LEFT JOIN teachers t ON u.teacher_id = t.id
      WHERE u.id = $1 AND u.is_active = true
    `
    
    const result = await pool.query(query, [decoded.userId])
    
    if (result.rows.length === 0) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    const user = result.rows[0]

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          teacher_id: user.teacher_id,
          teacher_name: user.teacher_name
        }
      })
    }
  } catch (error) {
    console.error('Verify error:', error)
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid token' })
    }
  }
}

// Change password handler
async function handleChangePassword(event) {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No token provided' })
      }
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)

    const { oldPassword, newPassword } = JSON.parse(event.body)

    if (!oldPassword || !newPassword) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Old password and new password are required' })
      }
    }

    // Get current user
    const userQuery = `
      SELECT id, password FROM users WHERE id = $1 AND is_active = true
    `
    const userResult = await pool.query(userQuery, [decoded.userId])
    
    if (userResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    const user = userResult.rows[0]

    // Verify old password
    if (user.password !== oldPassword) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Current password is incorrect' })
      }
    }

    // Update password
    const updateQuery = `
      UPDATE users 
      SET password = $1, password_changed_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `
    await pool.query(updateQuery, [newPassword, decoded.userId])

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: 'Password changed successfully' })
    }
  } catch (error) {
    console.error('Change password error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to change password' })
    }
  }
}

// Get profile handler
async function handleGetProfile(event) {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No token provided' })
      }
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)

    // Get user profile
    const query = `
      SELECT u.id, u.username, u.role, u.teacher_id, u.is_active, u.created_at, u.password_changed_at,
             t.name as teacher_name, t.email, t.photo_url, t.description
      FROM users u
      LEFT JOIN teachers t ON u.teacher_id = t.id
      WHERE u.id = $1 AND u.is_active = true
    `
    
    const result = await pool.query(query, [decoded.userId])
    
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    const user = result.rows[0]

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          teacher_id: user.teacher_id,
          teacher_name: user.teacher_name,
          email: user.email,
          photo_url: user.photo_url,
          description: user.description,
          is_active: user.is_active,
          created_at: user.created_at,
          password_changed_at: user.password_changed_at
        }
      })
    }
  } catch (error) {
    console.error('Get profile error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get profile' })
    }
  }
}

// Validate credentials handler
async function handleValidateCredentials(event) {
  try {
    const { username, password } = JSON.parse(event.body)

    if (!username || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Username and password are required' })
      }
    }

    // Query user from database
    const query = `
      SELECT u.id, u.username, u.password, u.role, u.teacher_id, u.is_active, t.name as teacher_name
      FROM users u
      LEFT JOIN teachers t ON u.teacher_id = t.id
      WHERE u.username = $1 AND u.is_active = true
    `
    
    const result = await pool.query(query, [username])
    
    if (result.rows.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ valid: false, error: 'Invalid credentials' })
      }
    }

    const user = result.rows[0]

    // Check password
    const isValid = user.password === password

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        valid: isValid,
        user: isValid ? {
          id: user.id,
          username: user.username,
          role: user.role,
          teacher_id: user.teacher_id,
          teacher_name: user.teacher_name
        } : null
      })
    }
  } catch (error) {
    console.error('Validate credentials error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to validate credentials' })
    }
  }
}

// Check username availability handler
async function handleCheckUsername(event) {
  try {
    const username = event.path.split('/').pop()

    if (!username) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Username is required' })
      }
    }

    // Check if username exists
    const query = `
      SELECT COUNT(*) as count FROM users WHERE username = $1
    `
    
    const result = await pool.query(query, [username])
    const count = parseInt(result.rows[0].count)

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        available: count === 0,
        username: username
      })
    }
  } catch (error) {
    console.error('Check username error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to check username' })
    }
  }
}
