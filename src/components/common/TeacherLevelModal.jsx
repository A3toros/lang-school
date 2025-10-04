import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'
import TeacherLevelBadge from './TeacherLevelBadge'

const TeacherLevelModal = ({ isOpen, onClose, teacher, onUpdate }) => {
  const [selectedLevel, setSelectedLevel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const levels = [
    { value: '', label: 'No Level Assigned' },
    { value: 'A1', label: 'A1 – Beginner' },
    { value: 'A1+', label: 'A1+ – High Beginner / Pre-A2' },
    { value: 'A2', label: 'A2 – Pre-Intermediate' },
    { value: 'B1', label: 'B1 – Intermediate' },
    { value: 'B2', label: 'B2 – Upper-Intermediate' },
    { value: 'C1', label: 'C1 – Advanced' },
    { value: 'C2', label: 'C2 – Proficient' }
  ]

  useEffect(() => {
    if (teacher) {
      setSelectedLevel(teacher.teacher_level || '')
      setError('')
    }
  }, [teacher])

  const handleSave = () => {
    console.log('🔍 [TEACHER LEVEL] handleSave called - showing confirmation popup')
    if (!teacher) return

    // Validate level if provided
    const validLevels = ['A1', 'A1+', 'A2', 'B1', 'B2', 'C1', 'C2']
    if (selectedLevel && !validLevels.includes(selectedLevel)) {
      setError('Invalid teacher level')
      return
    }

    // Show confirmation popup
    setShowConfirm(true)
  }

  const handleConfirmSave = async () => {
    if (!teacher) return

    try {
      setLoading(true)
      setError('')
      setShowConfirm(false)
      
      const response = await apiService.updateTeacherLevel(teacher.id, selectedLevel)
      
      if (response.success) {
        // Close modal and update parent immediately
        onUpdate(response.teacher)
        onClose()
      } else {
        setError(response.error || 'Failed to update teacher level')
      }
    } catch (err) {
      console.error('Error updating teacher level:', err)
      setError('Failed to update teacher level')
    } finally {
      setLoading(false)
    }
  }

  const handleLevelChange = (newLevel) => {
    setSelectedLevel(newLevel)
    setError('')
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen || !teacher) return null

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Update Teacher Level
                  </h3>
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{teacher.name}</h4>
                      <p className="text-sm text-gray-600">Current Level</p>
                    </div>
                    {teacher.teacher_level && (
                      <TeacherLevelBadge level={teacher.teacher_level} />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select New Level
                    </label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => handleLevelChange(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {levels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Level Change
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to change {teacher?.name}'s level to <strong>{selectedLevel || 'No Level'}</strong>?
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TeacherLevelModal
