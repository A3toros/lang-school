/**
 * Password utility functions for validation, generation, and security
 */

/**
 * Validates password strength and returns detailed feedback
 * @param {string} password - The password to validate
 * @returns {object} - Validation result with score and requirements
 */
export const validatePasswordStrength = (password) => {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const hasNoSpaces = !/\s/.test(password)
  const hasNoCommonPatterns = !/(.)\1{2,}/.test(password) // No repeated characters

  const requirements = {
    minLength: password.length >= minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
    hasNoSpaces,
    hasNoCommonPatterns
  }

  // Calculate strength score (0-100)
  let score = 0
  if (requirements.minLength) score += 20
  if (requirements.hasUpperCase) score += 15
  if (requirements.hasLowerCase) score += 15
  if (requirements.hasNumbers) score += 15
  if (requirements.hasSpecialChar) score += 20
  if (requirements.hasNoSpaces) score += 10
  if (requirements.hasNoCommonPatterns) score += 5

  // Additional length bonus
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 5

  const strength = {
    score,
    level: score >= 80 ? 'strong' : score >= 60 ? 'medium' : score >= 40 ? 'weak' : 'very-weak',
    requirements,
    isValid: score >= 60 && requirements.minLength && requirements.hasNoSpaces
  }

  return strength
}

/**
 * Generates a secure random password
 * @param {number} length - Password length (default: 12)
 * @param {object} options - Generation options
 * @returns {string} - Generated password
 */
export const generatePassword = (length = 12, options = {}) => {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSpecialChars = true,
    excludeSimilar = true
  } = options

  let charset = ''
  
  if (includeLowercase) {
    charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz'
  }
  
  if (includeUppercase) {
    charset += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  }
  
  if (includeNumbers) {
    charset += excludeSimilar ? '23456789' : '0123456789'
  }
  
  if (includeSpecialChars) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  }

  if (charset.length === 0) {
    throw new Error('At least one character type must be included')
  }

  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }

  return password
}

/**
 * Checks if password meets minimum security requirements
 * @param {string} password - The password to check
 * @returns {boolean} - Whether password meets requirements
 */
export const meetsMinimumRequirements = (password) => {
  const validation = validatePasswordStrength(password)
  return validation.isValid
}

/**
 * Gets password strength feedback message
 * @param {object} strength - Password strength object
 * @returns {string} - Feedback message
 */
export const getPasswordFeedback = (strength) => {
  const { score, level, requirements } = strength

  if (level === 'strong') {
    return 'Excellent! Your password is strong and secure.'
  }

  const feedback = []
  
  if (!requirements.minLength) {
    feedback.push('Use at least 8 characters')
  }
  
  if (!requirements.hasUpperCase) {
    feedback.push('Include uppercase letters')
  }
  
  if (!requirements.hasLowerCase) {
    feedback.push('Include lowercase letters')
  }
  
  if (!requirements.hasNumbers) {
    feedback.push('Include numbers')
  }
  
  if (!requirements.hasSpecialChar) {
    feedback.push('Include special characters')
  }
  
  if (!requirements.hasNoSpaces) {
    feedback.push('Remove spaces')
  }
  
  if (!requirements.hasNoCommonPatterns) {
    feedback.push('Avoid repeated characters')
  }

  if (feedback.length === 0) {
    return 'Your password is good, but could be stronger.'
  }

  return `To improve your password: ${feedback.join(', ')}.`
}

/**
 * Checks if password is in common passwords list
 * @param {string} password - The password to check
 * @returns {boolean} - Whether password is common
 */
export const isCommonPassword = (password) => {
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
    '1234567890', 'password1', 'qwerty123', 'dragon', 'master'
  ]

  return commonPasswords.includes(password.toLowerCase())
}

/**
 * Validates password against user information
 * @param {string} password - The password to validate
 * @param {object} userInfo - User information to check against
 * @returns {object} - Validation result
 */
export const validatePasswordAgainstUser = (password, userInfo) => {
  const issues = []
  
  if (userInfo.username && password.toLowerCase().includes(userInfo.username.toLowerCase())) {
    issues.push('Password should not contain your username')
  }
  
  if (userInfo.email && password.toLowerCase().includes(userInfo.email.split('@')[0].toLowerCase())) {
    issues.push('Password should not contain your email')
  }
  
  if (userInfo.name && password.toLowerCase().includes(userInfo.name.toLowerCase())) {
    issues.push('Password should not contain your name')
  }

  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Masks password for display (shows only first and last character)
 * @param {string} password - The password to mask
 * @returns {string} - Masked password
 */
export const maskPassword = (password) => {
  if (!password || password.length <= 2) {
    return '*'.repeat(password?.length || 0)
  }
  
  return password[0] + '*'.repeat(password.length - 2) + password[password.length - 1]
}

export default {
  validatePasswordStrength,
  generatePassword,
  meetsMinimumRequirements,
  getPasswordFeedback,
  isCommonPassword,
  validatePasswordAgainstUser,
  maskPassword
}
