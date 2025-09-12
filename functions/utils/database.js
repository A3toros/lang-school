require('dotenv').config();

const { Pool } = require('pg')
const jwt = require('jsonwebtoken')

// Database connection pool
let pool = null

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 10000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    })
  }
  return pool
}

// Function to recreate pool on connection errors
const recreatePool = () => {
  if (pool) {
    pool.end()
    pool = null
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

// JWT verification helper
const verifyToken = (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }

  const token = authHeader.split(' ')[1]
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  
  // Log token verification for debugging
  console.log('Token verified for user:', {
    userId: decoded.userId,
    username: decoded.username,
    role: decoded.role,
    teacherId: decoded.teacherId
  })
  
  return decoded
}

// Error response helper
const errorResponse = (statusCode, message, headers = corsHeaders) => ({
  statusCode,
  headers,
  body: JSON.stringify({ 
    success: false,
    error: message 
  })
})

// Success response helper
const successResponse = (data, statusCode = 200, headers = corsHeaders) => ({
  statusCode,
  headers,
  body: JSON.stringify({
    success: true,
    ...data
  })
})

// Database query helper
const query = async (text, params = []) => {
  const pool = getPool()
  let client = null
  
  try {
    console.log('🔍 [DATABASE] Executing query', {
      query: text.substring(0, 100) + '...',
      params: params.length
    })
    
    client = await pool.connect()
    const result = await client.query(text, params)
    
    console.log('✅ [DATABASE] Query executed successfully', {
      rowCount: result.rowCount,
      rows: result.rows.length
    })
    
    return result
  } catch (error) {
    console.error('❌ [DATABASE] Query error:', {
      message: error.message,
      code: error.code,
      query: text.substring(0, 100) + '...'
    })
    
    // If it's a connection error, try to recreate the pool
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.message.includes('Connection terminated')) {
      console.log('🔄 [DATABASE] Connection error detected, recreating pool')
      recreatePool()
    }
    
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Pagination helper
const getPaginationParams = (queryStringParameters) => {
  const page = parseInt(queryStringParameters?.page) || 1
  const limit = parseInt(queryStringParameters?.limit) || 50
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

// Date helpers
const getCurrentWeekStart = () => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  // JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
  // Calculate days to subtract to get to Monday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  // Use setDate to avoid timezone issues
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToMonday)
  return monday.toISOString().split('T')[0]
}

const getWeekStart = (date) => {
  const d = new Date(date)
  const dayOfWeek = d.getDay()
  // JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
  // Calculate days to subtract to get to Monday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  // Use setDate to avoid timezone issues
  const monday = new Date(d)
  monday.setDate(d.getDate() - daysToMonday)
  return monday.toISOString().split('T')[0]
}

module.exports = {
  getPool,
  recreatePool,
  corsHeaders,
  verifyToken,
  errorResponse,
  successResponse,
  query,
  getPaginationParams,
  getCurrentWeekStart,
  getWeekStart
}
