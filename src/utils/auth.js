// Authentication utility functions

export const validateCredentials = (username, password) => {
  if (!username || !password) {
    return { valid: false, error: 'Username and password are required' }
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }

  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' }
  }

  return { valid: true }
}


export const validatePasswordStrength = (password) => {
  const minLength = 6
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const strength = {
    score: 0,
    feedback: []
  }

  if (password.length >= minLength) {
    strength.score += 1
  } else {
    strength.feedback.push(`Password must be at least ${minLength} characters`)
  }

  if (hasUpperCase) strength.score += 1
  else strength.feedback.push('Add uppercase letters')

  if (hasLowerCase) strength.score += 1
  else strength.feedback.push('Add lowercase letters')

  if (hasNumbers) strength.score += 1
  else strength.feedback.push('Add numbers')

  if (hasSpecialChar) strength.score += 1
  else strength.feedback.push('Add special characters')

  return strength
}

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes to prevent injection
}

export const generatePassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  return password
}

export const hashPassword = async (password) => {
  // In a real application, you would use bcrypt or similar
  // For now, we'll use a simple hash (not secure for production)
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const comparePasswords = async (inputPassword, hashedPassword) => {
  const inputHash = await hashPassword(inputPassword)
  return inputHash === hashedPassword
}

export const checkPasswordExpiry = (passwordChangedAt, maxAgeDays = 90) => {
  if (!passwordChangedAt) return { expired: false, daysLeft: null }
  
  const changedDate = new Date(passwordChangedAt)
  const now = new Date()
  const daysSinceChange = Math.floor((now - changedDate) / (1000 * 60 * 60 * 24))
  
  return {
    expired: daysSinceChange > maxAgeDays,
    daysLeft: Math.max(0, maxAgeDays - daysSinceChange)
  }
}

export const validateRole = (role) => {
  const validRoles = ['admin', 'teacher']
  return validRoles.includes(role)
}

export const hasPermission = (userRole, requiredRole) => {
  const roleHierarchy = {
    'teacher': 1,
    'admin': 2
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export const formatAuthError = (error) => {
  const errorMessages = {
    'INVALID_CREDENTIALS': 'Invalid username or password',
    'ACCOUNT_LOCKED': 'Account is locked. Please contact administrator',
    'ACCOUNT_DISABLED': 'Account is disabled. Please contact administrator',
    'TOKEN_EXPIRED': 'Session expired. Please login again',
    'INVALID_TOKEN': 'Invalid session. Please login again',
    'NETWORK_ERROR': 'Network error. Please check your connection',
    'SERVER_ERROR': 'Server error. Please try again later'
  }
  
  return errorMessages[error] || 'Authentication failed. Please try again'
}

export default {
  validateCredentials,
  validatePasswordStrength,
  sanitizeInput,
  generatePassword,
  hashPassword,
  comparePasswords,
  checkPasswordExpiry,
  validateRole,
  hasPermission,
  formatAuthError
}
