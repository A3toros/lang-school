// Validation utility functions


export const validatePassword = (password) => {
  const minLength = 6
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const errors = []

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`)
  }

  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!hasNumbers) {
    errors.push('Password must contain at least one number')
  }

  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  }
}

export const calculatePasswordStrength = (password) => {
  let score = 0
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }

  Object.values(checks).forEach(check => {
    if (check) score++
  })

  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

export const validateUsername = (username) => {
  const minLength = 3
  const maxLength = 50
  const usernameRegex = /^[a-zA-Z0-9._-]+$/

  if (!username || username.trim().length === 0) {
    return { valid: false, message: 'Username is required' }
  }

  if (username.length < minLength) {
    return { valid: false, message: `Username must be at least ${minLength} characters` }
  }

  if (username.length > maxLength) {
    return { valid: false, message: `Username must be no more than ${maxLength} characters` }
  }

  if (!usernameRegex.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, dots, underscores, and hyphens' }
  }

  return { valid: true, message: '' }
}

export const validateName = (name, fieldName = 'Name') => {
  const minLength = 2
  const maxLength = 100
  const nameRegex = /^[a-zA-Z\s'-]+$/

  if (!name || name.trim().length === 0) {
    return { valid: false, message: `${fieldName} is required` }
  }

  if (name.length < minLength) {
    return { valid: false, message: `${fieldName} must be at least ${minLength} characters` }
  }

  if (name.length > maxLength) {
    return { valid: false, message: `${fieldName} must be no more than ${maxLength} characters` }
  }

  if (!nameRegex.test(name)) {
    return { valid: false, message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` }
  }

  return { valid: true, message: '' }
}

export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  
  if (!phone || phone.trim().length === 0) {
    return { valid: true, message: '' } // Phone is optional
  }

  const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  return {
    valid: phoneRegex.test(cleanedPhone),
    message: phoneRegex.test(cleanedPhone) ? '' : 'Please enter a valid phone number'
  }
}

export const validateURL = (url) => {
  try {
    new URL(url)
    return { valid: true, message: '' }
  } catch {
    return { valid: false, message: 'Please enter a valid URL' }
  }
}

export const validateRequired = (value, fieldName = 'Field') => {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return { valid: false, message: `${fieldName} is required` }
  }
  return { valid: true, message: '' }
}

export const validateMinLength = (value, minLength, fieldName = 'Field') => {
  if (!value || value.length < minLength) {
    return { valid: false, message: `${fieldName} must be at least ${minLength} characters` }
  }
  return { valid: true, message: '' }
}

export const validateMaxLength = (value, maxLength, fieldName = 'Field') => {
  if (value && value.length > maxLength) {
    return { valid: false, message: `${fieldName} must be no more than ${maxLength} characters` }
  }
  return { valid: true, message: '' }
}

export const validateNumber = (value, fieldName = 'Field', min = null, max = null) => {
  const num = Number(value)
  
  if (isNaN(num)) {
    return { valid: false, message: `${fieldName} must be a valid number` }
  }

  if (min !== null && num < min) {
    return { valid: false, message: `${fieldName} must be at least ${min}` }
  }

  if (max !== null && num > max) {
    return { valid: false, message: `${fieldName} must be no more than ${max}` }
  }

  return { valid: true, message: '' }
}

export const validateInteger = (value, fieldName = 'Field', min = null, max = null) => {
  const num = Number(value)
  
  if (!Number.isInteger(num)) {
    return { valid: false, message: `${fieldName} must be a whole number` }
  }

  if (min !== null && num < min) {
    return { valid: false, message: `${fieldName} must be at least ${min}` }
  }

  if (max !== null && num > max) {
    return { valid: false, message: `${fieldName} must be no more than ${max}` }
  }

  return { valid: true, message: '' }
}

export const validateDate = (date, fieldName = 'Date') => {
  if (!date) {
    return { valid: false, message: `${fieldName} is required` }
  }

  const d = new Date(date)
  if (isNaN(d.getTime())) {
    return { valid: false, message: `${fieldName} must be a valid date` }
  }

  return { valid: true, message: '' }
}

export const validateFutureDate = (date, fieldName = 'Date') => {
  const dateValidation = validateDate(date, fieldName)
  if (!dateValidation.valid) return dateValidation

  const d = new Date(date)
  const now = new Date()
  
  if (d <= now) {
    return { valid: false, message: `${fieldName} must be in the future` }
  }

  return { valid: true, message: '' }
}

export const validatePastDate = (date, fieldName = 'Date') => {
  const dateValidation = validateDate(date, fieldName)
  if (!dateValidation.valid) return dateValidation

  const d = new Date(date)
  const now = new Date()
  
  if (d >= now) {
    return { valid: false, message: `${fieldName} must be in the past` }
  }

  return { valid: true, message: '' }
}

export const validateArray = (array, fieldName = 'Field', minLength = 0, maxLength = null) => {
  if (!Array.isArray(array)) {
    return { valid: false, message: `${fieldName} must be an array` }
  }

  if (array.length < minLength) {
    return { valid: false, message: `${fieldName} must have at least ${minLength} items` }
  }

  if (maxLength !== null && array.length > maxLength) {
    return { valid: false, message: `${fieldName} must have no more than ${maxLength} items` }
  }

  return { valid: true, message: '' }
}

export const validateObject = (obj, requiredFields = [], fieldName = 'Object') => {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, message: `${fieldName} must be an object` }
  }

  const missingFields = requiredFields.filter(field => !(field in obj))
  
  if (missingFields.length > 0) {
    return { valid: false, message: `${fieldName} is missing required fields: ${missingFields.join(', ')}` }
  }

  return { valid: true, message: '' }
}

export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
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

export const validateForm = (formData, validationRules) => {
  const errors = {}
  let isValid = true

  Object.keys(validationRules).forEach(field => {
    const rules = validationRules[field]
    const value = formData[field]

    for (const rule of rules) {
      const result = rule(value, field)
      if (!result.valid) {
        errors[field] = result.message
        isValid = false
        break
      }
    }
  })

  return { isValid, errors }
}

export default {
  validatePassword,
  calculatePasswordStrength,
  validateUsername,
  validateName,
  validatePhoneNumber,
  validateURL,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumber,
  validateInteger,
  validateDate,
  validateFutureDate,
  validatePastDate,
  validateArray,
  validateObject,
  sanitizeString,
  validateForm
}
