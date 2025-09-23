import { useState, useCallback } from 'react'
import apiService from '../utils/api'

/**
 * Custom hook for password management operations
 * Provides functions for changing passwords, validating strength, etc.
 */
export const usePasswordManagement = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔍 [PASSWORD_MGMT] Changing password')
      
      const result = await apiService.changePassword(oldPassword, newPassword)
      
      if (result.success) {
        console.log('✅ [PASSWORD_MGMT] Password changed successfully')
        return { success: true, message: 'Password changed successfully' }
      } else {
        console.log('❌ [PASSWORD_MGMT] Password change failed', result.error)
        setError(result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ [PASSWORD_MGMT] Password change error:', error)
      const errorMessage = error.message || 'Failed to change password'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const validatePasswordStrength = useCallback((password) => {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const strength = {
      score: 0,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      },
      isValid: false
    }

    // Calculate strength score
    if (strength.requirements.minLength) strength.score += 1
    if (strength.requirements.hasUpperCase) strength.score += 1
    if (strength.requirements.hasLowerCase) strength.score += 1
    if (strength.requirements.hasNumbers) strength.score += 1
    if (strength.requirements.hasSpecialChar) strength.score += 1

    strength.isValid = strength.score >= 4 && strength.requirements.minLength

    return strength
  }, [])

  const generatePassword = useCallback(() => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    
    return password
  }, [])

  const resetPassword = useCallback(async (userId) => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔍 [PASSWORD_MGMT] Resetting password for user', { userId })
      
      const result = await apiService.resetPassword(userId)
      
      if (result.success) {
        console.log('✅ [PASSWORD_MGMT] Password reset successfully')
        return { success: true, message: 'Password reset successfully', newPassword: result.newPassword }
      } else {
        console.log('❌ [PASSWORD_MGMT] Password reset failed', result.error)
        setError(result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ [PASSWORD_MGMT] Password reset error:', error)
      const errorMessage = error.message || 'Failed to reset password'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const getPasswordHistory = useCallback(async (userId) => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔍 [PASSWORD_MGMT] Getting password history for user', { userId })
      
      const result = await apiService.getPasswordHistory(userId)
      
      if (result.success) {
        console.log('✅ [PASSWORD_MGMT] Password history retrieved successfully')
        return { success: true, history: result.history }
      } else {
        console.log('❌ [PASSWORD_MGMT] Failed to get password history', result.error)
        setError(result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ [PASSWORD_MGMT] Password history error:', error)
      const errorMessage = error.message || 'Failed to get password history'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    changePassword,
    validatePasswordStrength,
    generatePassword,
    resetPassword,
    getPasswordHistory,
    clearError: () => setError(null)
  }
}

export default usePasswordManagement
