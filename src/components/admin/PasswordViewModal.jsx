import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Modal from '../common/Modal'
import Button from '../common/Button'
import apiService from '../../utils/api'

const PasswordViewModal = ({ 
  isOpen, 
  onClose, 
  teacherId,
  teacherName 
}) => {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isOpen && teacherId) {
      fetchPassword()
    }
  }, [isOpen, teacherId])

  const fetchPassword = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await apiService.getTeacherPassword(teacherId)
      
      if (response.success) {
        setPassword(response.password)
      } else {
        setError(response.error || 'Failed to fetch password')
      }
    } catch (error) {
      console.error('Error fetching password:', error)
      setError('Failed to fetch password')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    setShowPassword(false)
    onClose()
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy password:', error)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`View Password - ${teacherName}`}
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

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-3 text-neutral-600">Loading password...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Teacher Password
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  readOnly
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 py-2 text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-3 py-2 text-neutral-500 hover:text-neutral-700 transition-colors"
                  title="Copy to clipboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.726-1.36 3.491 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Security Notice
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This password is stored in plain text as per user preference. 
                      Please ensure this information is kept secure and not shared inappropriately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Close
          </Button>
          {!loading && password && (
            <Button
              type="button"
              variant="secondary"
              onClick={copyToClipboard}
              className="flex-1"
            >
              Copy Password
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default PasswordViewModal
