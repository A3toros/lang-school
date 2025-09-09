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

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role, 
        teacherId: user.teacher_id 
      },
      JWT_SECRET,
      { expiresIn: '30m' }
    )

    const refreshToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role, 
        teacherId: user.teacher_id 
      },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

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
