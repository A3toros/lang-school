import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Modal from '../common/Modal'
import Button from '../common/Button'
import apiService from '../../utils/api'

const TeacherPasswordManager = ({ teacher, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (teacher) {
      fetchCurrentPassword()
    }
  }, [teacher])

  const fetchCurrentPassword = async () => {
    try {
      const response = await apiService.getTeacherPassword(teacher.id)
      if (response.success) {
        setCurrentPassword(response.password)
      }
    } catch (error) {
      console.error('Error fetching password:', error)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const response = await apiService.changeTeacherPassword(teacher.id, newPassword)
      
      if (response.success) {
        setSuccess('Password changed successfully')
        setNewPassword('')
        setConfirmPassword('')
        // Refresh the current password display
        await fetchCurrentPassword()
      } else {
        setError(response.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setError('Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!window.confirm('Are you sure you want to reset this teacher\'s password? This will generate a new random password.')) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const response = await apiService.resetTeacherPassword(teacher.id)
      
      if (response.success) {
        setSuccess('Password reset successfully')
        setCurrentPassword(response.newPassword)
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setError(response.error || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      setError('Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!teacher) return null

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Password Management - ${teacher.name}`}
      size="md"
    >
      <div className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm"
          >
            {success}
          </motion.div>
        )}

        {/* Current Password Display */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Current Password
          </label>
          <div className="flex items-center space-x-2">
            <input
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              readOnly
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="px-3 py-2 text-neutral-500 hover:text-neutral-700"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="warning"
              onClick={handleResetPassword}
              disabled={loading}
              className="flex-1"
            >
              Reset Password
            </Button>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="flex-1"
            >
              Change Password
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default TeacherPasswordManager
