require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders  } = require('./utils/database.js')

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
    // Verify authentication for all routes
    let user
    try {
      user = verifyToken(event)
    } catch (error) {
      return errorResponse(401, 'Unauthorized')
    }

    // Route to appropriate handler
    if (path.match(/^\/api\/passwords\/teacher\/\d+$/) && method === 'GET') {
      return await getTeacherPassword(event, user)
    } else if (path.match(/^\/api\/passwords\/teacher\/\d+$/) && method === 'PUT') {
      return await changeTeacherPassword(event, user)
    } else if (path.match(/^\/api\/passwords\/teacher\/\d+\/reset$/) && method === 'POST') {
      return await resetTeacherPassword(event, user)
    } else if (path === '/api/passwords/bulk-reset' && method === 'POST') {
      return await bulkResetPasswords(event, user)
    } else if (path.match(/^\/api\/passwords\/history\/\d+$/) && method === 'GET') {
      return await getPasswordHistory(event, user)
    } else if (path === '/api/passwords/validate' && method === 'POST') {
      return await validatePassword(event, user)
    } else if (path === '/api/passwords/policy' && method === 'GET') {
      return await getPasswordPolicy(event, user)
    } else if (path === '/api/passwords/check-current' && method === 'POST') {
      return await checkCurrentPassword(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Passwords API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get teacher password (admin only)
async function getTeacherPassword(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const teacherId = parseInt(event.path.split('/')[4])

    const queryText = `
      SELECT u.id, u.username, u.password, t.name as teacher_name, u.password_changed_at
      FROM users u
      JOIN teachers t ON u.teacher_id = t.id
      WHERE u.teacher_id = $1 AND u.role = 'teacher' AND u.is_active = true
    `
    
    const result = await query(queryText, [teacherId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Teacher not found')
    }

    return successResponse({ password_info: result.rows[0] })
  } catch (error) {
    console.error('Get teacher password error:', error)
    return errorResponse(500, 'Failed to fetch teacher password')
  }
}

// Change teacher password
async function changeTeacherPassword(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const teacherId = parseInt(event.path.split('/')[4])
    const { new_password } = JSON.parse(event.body)

    if (!new_password) {
      return errorResponse(400, 'new_password is required')
    }

    // Validate password strength
    if (new_password.length < 6) {
      return errorResponse(400, 'Password must be at least 6 characters long')
    }

    const queryText = `
      UPDATE users 
      SET password = $1, password_changed_by_admin = true, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE teacher_id = $2 AND role = 'teacher'
      RETURNING id, username, password_changed_at
    `
    
    const result = await query(queryText, [new_password, teacherId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Teacher not found')
    }

    return successResponse({ 
      message: 'Password changed successfully',
      password_info: result.rows[0]
    })
  } catch (error) {
    console.error('Change teacher password error:', error)
    return errorResponse(500, 'Failed to change password')
  }
}

// Reset teacher password
async function resetTeacherPassword(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const teacherId = parseInt(event.path.split('/')[4])
    const { new_password } = JSON.parse(event.body)

    // Generate new password if not provided
    const generatedPassword = new_password || generateRandomPassword()

    const queryText = `
      UPDATE users 
      SET password = $1, password_changed_by_admin = true, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE teacher_id = $2 AND role = 'teacher'
      RETURNING id, username, password_changed_at
    `
    
    const result = await query(queryText, [generatedPassword, teacherId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'Teacher not found')
    }

    return successResponse({ 
      message: 'Password reset successfully',
      new_password: generatedPassword,
      password_info: result.rows[0]
    })
  } catch (error) {
    console.error('Reset teacher password error:', error)
    return errorResponse(500, 'Failed to reset password')
  }
}

// Bulk reset passwords
async function bulkResetPasswords(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { teacher_ids, new_password } = JSON.parse(event.body)

    if (!Array.isArray(teacher_ids)) {
      return errorResponse(400, 'teacher_ids must be an array')
    }

    const generatedPassword = new_password || generateRandomPassword()

    const client = await getPool().connect()
    
    try {
      await client.query('BEGIN')

      const updatedTeachers = []
      for (const teacherId of teacher_ids) {
        const result = await client.query(
          'UPDATE users SET password = $1, password_changed_by_admin = true, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $2 AND role = \'teacher\' RETURNING id, username',
          [generatedPassword, teacherId]
        )
        
        if (result.rows.length > 0) {
          updatedTeachers.push(result.rows[0])
        }
      }

      await client.query('COMMIT')
      return successResponse({ 
        message: 'Passwords reset successfully',
        new_password: generatedPassword,
        updated_teachers: updatedTeachers
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Bulk reset passwords error:', error)
    return errorResponse(500, 'Failed to reset passwords')
  }
}

// Get password change history
async function getPasswordHistory(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const teacherId = parseInt(event.path.split('/')[4])

    const queryText = `
      SELECT u.id, u.username, u.password_changed_at, u.password_changed_by_admin, t.name as teacher_name
      FROM users u
      JOIN teachers t ON u.teacher_id = t.id
      WHERE u.teacher_id = $1 AND u.role = 'teacher'
      ORDER BY u.password_changed_at DESC
    `
    
    const result = await query(queryText, [teacherId])
    return successResponse({ password_history: result.rows })
  } catch (error) {
    console.error('Get password history error:', error)
    return errorResponse(500, 'Failed to fetch password history')
  }
}

// Validate password strength
async function validatePassword(event, user) {
  try {
    const { password } = JSON.parse(event.body)

    if (!password) {
      return errorResponse(400, 'password is required')
    }

    const validation = {
      is_valid: true,
      errors: [],
      strength: 'weak'
    }

    // Check length
    if (password.length < 6) {
      validation.is_valid = false
      validation.errors.push('Password must be at least 6 characters long')
    }

    // Check for uppercase
    if (!/[A-Z]/.test(password)) {
      validation.errors.push('Password should contain at least one uppercase letter')
    }

    // Check for lowercase
    if (!/[a-z]/.test(password)) {
      validation.errors.push('Password should contain at least one lowercase letter')
    }

    // Check for numbers
    if (!/\d/.test(password)) {
      validation.errors.push('Password should contain at least one number')
    }

    // Determine strength
    if (password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)) {
      validation.strength = 'strong'
    } else if (password.length >= 6 && (/[A-Z]/.test(password) || /[a-z]/.test(password) || /\d/.test(password))) {
      validation.strength = 'medium'
    }

    return successResponse({ validation })
  } catch (error) {
    console.error('Validate password error:', error)
    return errorResponse(500, 'Failed to validate password')
  }
}

// Get password policy requirements
async function getPasswordPolicy(event, user) {
  try {
    const policy = {
      min_length: 6,
      require_uppercase: false,
      require_lowercase: false,
      require_numbers: false,
      require_special_chars: false,
      max_length: 50,
      description: 'Password must be at least 6 characters long. For better security, include uppercase letters, lowercase letters, and numbers.'
    }

    return successResponse({ policy })
  } catch (error) {
    console.error('Get password policy error:', error)
    return errorResponse(500, 'Failed to fetch password policy')
  }
}

// Check current password
async function checkCurrentPassword(event, user) {
  try {
    const { password } = JSON.parse(event.body)

    if (!password) {
      return errorResponse(400, 'password is required')
    }

    const queryText = `
      SELECT password FROM users 
      WHERE id = $1
    `
    
    const result = await query(queryText, [user.userId])
    
    if (result.rows.length === 0) {
      return errorResponse(404, 'User not found')
    }

    const isCorrect = result.rows[0].password === password

    return successResponse({ is_correct: isCorrect })
  } catch (error) {
    console.error('Check current password error:', error)
    return errorResponse(500, 'Failed to check current password')
  }
}

// Helper function to generate random password
function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  
  // Ensure at least one character from each category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]
  
  // Fill the rest randomly
  for (let i = 3; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
