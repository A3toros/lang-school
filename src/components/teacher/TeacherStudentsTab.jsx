import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'
import StudentLevelBadge from '../common/StudentLevelBadge'
import SuccessNotification from '../common/SuccessNotification'
import LoadingSpinnerModal from '../common/LoadingSpinnerModal'

const TeacherStudentsTab = ({ teacherId }) => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingStudent, setUpdatingStudent] = useState(null)
  const [showNotification, setShowNotification] = useState(false)
  const [notification, setNotification] = useState({ type: 'success', title: '', message: '' })
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmData, setConfirmData] = useState({ studentId: null, newLevel: '', studentName: '' })

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
    fetchStudents()
  }, [teacherId])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await apiService.getCurrentStudents(teacherId)
      
      if (response.success) {
        setStudents(response.students || [])
      } else {
        setError(response.error || 'Failed to load students')
      }
    } catch (err) {
      console.error('Error fetching students:', err)
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleLevelChange = (studentId, newLevel, studentName) => {
    // Show confirmation popup instead of saving immediately
    setConfirmData({ studentId, newLevel, studentName })
    setShowConfirm(true)
  }

  const handleConfirmSave = async () => {
    try {
      setUpdatingStudent(confirmData.studentId)
      
      const response = await apiService.updateStudentLevel(confirmData.studentId, confirmData.newLevel)
      
      if (response.success) {
        // Update local state
        setStudents(prev => prev.map(s => 
          s.id === confirmData.studentId 
            ? { ...s, student_level: confirmData.newLevel }
            : s
        ))
        
        // Show success notification
        setNotification({
          type: 'success',
          title: 'Success',
          message: `Student level updated to ${confirmData.newLevel || 'No level'}`
        })
        setShowNotification(true)
      } else {
        setNotification({
          type: 'error',
          title: 'Error',
          message: response.error || 'Failed to update student level'
        })
        setShowNotification(true)
      }
    } catch (err) {
      console.error('Error updating student level:', err)
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update student level'
      })
      setShowNotification(true)
    } finally {
      setUpdatingStudent(null)
      setShowConfirm(false)
      setConfirmData({ studentId: null, newLevel: '', studentName: '' })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button 
          onClick={fetchStudents}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          My Students ({students.length})
        </h3>
        <button
          onClick={fetchStudents}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">No students assigned</p>
          <p className="text-sm">You don't have any students assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {students.map((student) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {student.name}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      Assigned: {new Date(student.assigned_date).toLocaleDateString()}
                    </span>
                    {student.student_level && (
                      <StudentLevelBadge level={student.student_level} />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">
                      Level:
                    </label>
                    <select
                      value={student.student_level || ''}
                      onChange={(e) => handleLevelChange(student.id, e.target.value, student.name)}
                      disabled={updatingStudent === student.id}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {levels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {updatingStudent === student.id && (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Success Notification */}
      <SuccessNotification
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />

      {/* Loading Spinner Modal */}
      {updatingStudent && (
        <LoadingSpinnerModal
          isOpen={!!updatingStudent}
          message="Updating student level..."
        />
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Level Change
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to change <strong>{confirmData.studentName}</strong>'s level to <strong>{confirmData.newLevel || 'No Level'}</strong>?
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
                  disabled={updatingStudent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingStudent ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherStudentsTab
