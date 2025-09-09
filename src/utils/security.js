// Security utility functions

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes to prevent injection
    .replace(/[&<>"']/g, (match) => {
      const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }
      return escapeMap[match]
    })
}

export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  
  const sanitized = {}
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key])
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key])
    } else {
      sanitized[key] = obj[key]
    }
  })
  
  return sanitized
}

export const validateCSRFToken = (token, expectedToken) => {
  if (!token || !expectedToken) return false
  return token === expectedToken
}

export const generateCSRFToken = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export const hashString = async (str) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const generateSecureId = (length = 16) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  return result
}

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const validateJWT = (token) => {
  if (!token || typeof token !== 'string') return false
  
  const parts = token.split('.')
  if (parts.length !== 3) return false
  
  try {
    // Decode header and payload without verification
    const header = JSON.parse(atob(parts[0]))
    const payload = JSON.parse(atob(parts[1]))
    
    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return false
    }
    
    return true
  } catch (error) {
    return false
  }
}

export const extractJWTClaims = (token) => {
  if (!validateJWT(token)) return null
  
  try {
    const parts = token.split('.')
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch (error) {
    return null
  }
}

export const isTokenExpired = (token) => {
  const claims = extractJWTClaims(token)
  if (!claims || !claims.exp) return true
  
  return claims.exp < Date.now() / 1000
}

export const getTokenExpiration = (token) => {
  const claims = extractJWTClaims(token)
  if (!claims || !claims.exp) return null
  
  return new Date(claims.exp * 1000)
}

export const validatePasswordStrength = (password) => {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const hasNoCommonPatterns = !/(.)\1{2,}/.test(password) // No repeated characters
  
  const score = [
    password.length >= minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
    hasNoCommonPatterns
  ].filter(Boolean).length
  
  return {
    score,
    strength: score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong',
    requirements: {
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      hasNoCommonPatterns
    }
  }
}

export const checkForSQLInjection = (input) => {
  if (typeof input !== 'string') return false
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(;|\-\-|\/\*|\*\/)/,
    /(\b(OR|AND)\b.*\b(OR|AND)\b)/i,
    /(\b(OR|AND)\b.*=.*\b(OR|AND)\b)/i,
    /(\b(OR|AND)\b.*'.*'.*(\b(OR|AND)\b|;))/i
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

export const checkForXSS = (input) => {
  if (typeof input !== 'string') return false
  
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /<link[^>]*>.*?<\/link>/gi,
    /<meta[^>]*>.*?<\/meta>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

export const sanitizeForDatabase = (input) => {
  if (typeof input !== 'string') return input
  
  // Remove or escape potentially dangerous characters
  return input
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/[--]/g, '') // Remove double dashes
    .replace(/\/\*/g, '') // Remove comment starts
    .replace(/\*\//g, '') // Remove comment ends
    .trim()
}

export const validateFileUpload = (file, allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  const errors = []
  
  if (!file) {
    errors.push('No file provided')
    return { valid: false, errors }
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`)
  }
  
  if (file.size > maxSize) {
    errors.push(`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`)
  }
  
  // Check for potentially dangerous file names
  const dangerousPatterns = [
    /\.\./, // Directory traversal
    /[<>:"|?*]/, // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i // Reserved names
  ]
  
  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    errors.push('Invalid file name')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export const generateSecurePassword = (length = 16) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one character from each category
  const categories = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    '!@#$%^&*'
  ]
  
  // Add one character from each category
  categories.forEach(category => {
    password += category.charAt(Math.floor(Math.random() * category.length))
  })
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export const rateLimitCheck = (key, limit = 10, windowMs = 60000) => {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // This is a simple in-memory rate limiter
  // In production, use Redis or similar
  if (!window.rateLimitStore) {
    window.rateLimitStore = new Map()
  }
  
  const store = window.rateLimitStore
  const requests = store.get(key) || []
  
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => timestamp > windowStart)
  
  if (validRequests.length >= limit) {
    return { allowed: false, remaining: 0, resetTime: validRequests[0] + windowMs }
  }
  
  // Add current request
  validRequests.push(now)
  store.set(key, validRequests)
  
  return { 
    allowed: true, 
    remaining: limit - validRequests.length, 
    resetTime: now + windowMs 
  }
}

export const validateOrigin = (origin, allowedOrigins) => {
  if (!origin || !allowedOrigins) return false
  
  return allowedOrigins.includes(origin) || 
         allowedOrigins.some(allowed => {
           if (allowed.includes('*')) {
             const pattern = allowed.replace(/\*/g, '.*')
             return new RegExp(`^${pattern}$`).test(origin)
           }
           return allowed === origin
         })
}

export default {
  sanitizeInput,
  sanitizeObject,
  validateCSRFToken,
  generateCSRFToken,
  hashString,
  generateSecureId,
  generateUUID,
  validateJWT,
  extractJWTClaims,
  isTokenExpired,
  getTokenExpiration,
  validatePasswordStrength,
  checkForSQLInjection,
  checkForXSS,
  sanitizeForDatabase,
  validateFileUpload,
  generateSecurePassword,
  rateLimitCheck,
  validateOrigin
}
