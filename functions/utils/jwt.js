require('dotenv').config();

const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const ACCESS_TOKEN_EXPIRY = '30m'
const REFRESH_TOKEN_EXPIRY = '7d'

// Generate access token (30 minutes)
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'lang-school',
    audience: 'lang-school-users'
  })
}

// Generate refresh token (7 days)
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'lang-school',
    audience: 'lang-school-users'
  })
}

// Verify access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'lang-school',
      audience: 'lang-school-users'
    })
  } catch (error) {
    throw new Error('Invalid or expired access token')
  }
}

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'lang-school',
      audience: 'lang-school-users'
    })
  } catch (error) {
    throw new Error('Invalid or expired refresh token')
  }
}

// Decode token without verification
const decodeToken = (token) => {
  try {
    return jwt.decode(token)
  } catch (error) {
    return null
  }
}

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) return true
    
    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime
  } catch (error) {
    return true
  }
}

// Get token expiration time
const getTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) return null
    
    return new Date(decoded.exp * 1000)
  } catch (error) {
    return null
  }
}

// Check if token should be refreshed (5 minutes before expiry)
const shouldRefreshToken = (token) => {
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) return true
    
    const currentTime = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = decoded.exp - currentTime
    const fiveMinutes = 5 * 60 // 5 minutes in seconds
    
    return timeUntilExpiry < fiveMinutes
  } catch (error) {
    return true
  }
}

// Generate both tokens
const generateTokens = (userData) => {
  const payload = {
    userId: userData.id,
    username: userData.username,
    role: userData.role,
    teacherId: userData.teacher_id || null,
    teacherName: userData.teacher_name || null
  }

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: 30 * 60, // 30 minutes in seconds
    tokenType: 'Bearer'
  }
}

// Refresh access token using refresh token
const refreshAccessToken = (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken)
    
    // Generate new access token with same payload
    const payload = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      teacherId: decoded.teacherId,
      teacherName: decoded.teacherName
    }

    return {
      accessToken: generateAccessToken(payload),
      expiresIn: 30 * 60,
      tokenType: 'Bearer'
    }
  } catch (error) {
    throw new Error('Invalid refresh token')
  }
}

// Extract token from Authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

// Validate token and return user data
const validateToken = (token) => {
  try {
    const decoded = verifyAccessToken(token)
    return {
      valid: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        teacherId: decoded.teacherId,
        teacherName: decoded.teacherName
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message
    }
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  shouldRefreshToken,
  generateTokens,
  refreshAccessToken,
  extractTokenFromHeader,
  validateToken
}
