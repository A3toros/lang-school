const { Pool } = require('pg')

// Database connection pool
let pool = null

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return pool
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

// JWT verification helper
const verifyToken = (event) => {
  const jwt = require('jsonwebtoken')
  const authHeader = event.headers.authorization || event.headers.Authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }

  const token = authHeader.split(' ')[1]
  return jwt.verify(token, process.env.JWT_SECRET)
}

// Error response helper
const errorResponse = (statusCode, message, headers = corsHeaders) => ({
  statusCode,
  headers,
  body: JSON.stringify({ error: message })
})

// Success response helper
const successResponse = (data, statusCode = 200, headers = corsHeaders) => ({
  statusCode,
  headers,
  body: JSON.stringify(data)
})

// Database query helper
const query = async (text, params = []) => {
  const pool = getPool()
  try {
    const result = await pool.query(text, params)
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw error
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
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

const getWeekStart = (date) => {
  const d = new Date(date)
  const dayOfWeek = d.getDay()
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

module.exports = {
  getPool,
  corsHeaders,
  verifyToken,
  errorResponse,
  successResponse,
  query,
  getPaginationParams,
  getCurrentWeekStart,
  getWeekStart
}
