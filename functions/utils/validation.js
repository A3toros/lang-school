require('dotenv').config();

// Validation utility functions for Netlify Functions

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return {
    valid: emailRegex.test(email),
    message: emailRegex.test(email) ? '' : 'Please enter a valid email address'
  }
}

const validatePassword = (password) => {
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

const calculatePasswordStrength = (password) => {
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

const validateUsername = (username) => {
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

const validateName = (name, fieldName = 'Name') => {
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

const validateRequired = (value, fieldName = 'Field') => {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return { valid: false, message: `${fieldName} is required` }
  }
  return { valid: true, message: '' }
}

const validateNumber = (value, fieldName = 'Field', min = null, max = null) => {
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

const validateInteger = (value, fieldName = 'Field', min = null, max = null) => {
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

const validateDate = (date, fieldName = 'Date') => {
  if (!date) {
    return { valid: false, message: `${fieldName} is required` }
  }

  const d = new Date(date)
  if (isNaN(d.getTime())) {
    return { valid: false, message: `${fieldName} must be a valid date` }
  }

  return { valid: true, message: '' }
}

const validateArray = (array, fieldName = 'Field', minLength = 0, maxLength = null) => {
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

const sanitizeString = (str) => {
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

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  
  const sanitized = {}
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeString(obj[key])
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key])
    } else {
      sanitized[key] = obj[key]
    }
  })
  
  return sanitized
}

const validateForm = (formData, validationRules) => {
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

const validateTeacherData = (teacherData) => {
  const rules = {
    name: [value => validateName(value, 'Teacher name')],
    email: [value => validateEmail(value)],
    username: [value => validateUsername(value)],
    password: [value => validatePassword(value)]
  }

  return validateForm(teacherData, rules)
}

const validateStudentData = (studentData) => {
  const rules = {
    name: [value => validateName(value, 'Student name')],
    teacher_id: [value => validateRequired(value, 'Teacher')],
    lessons_per_week: [value => validateInteger(value, 'Lessons per week', 1, 7)]
  }

  return validateForm(studentData, rules)
}

const validateScheduleData = (scheduleData) => {
  const rules = {
    student_id: [value => validateRequired(value, 'Student')],
    teacher_id: [value => validateRequired(value, 'Teacher')],
    day_of_week: [value => validateInteger(value, 'Day of week', 0, 6)],
    time_slot: [value => validateRequired(value, 'Time slot')],
    week_start_date: [value => validateDate(value, 'Week start date')]
  }

  return validateForm(scheduleData, rules)
}

module.exports = {
  validateEmail,
  validatePassword,
  calculatePasswordStrength,
  validateUsername,
  validateName,
  validateRequired,
  validateNumber,
  validateInteger,
  validateDate,
  validateArray,
  sanitizeString,
  sanitizeObject,
  validateForm,
  validateTeacherData,
  validateStudentData,
  validateScheduleData
}
