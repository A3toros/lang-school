import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'
import StudentLevelBadge from '../common/StudentLevelBadge'

const LessonReportForm = ({ 
  teacherId, 
  student, 
  lessonDate, 
  timeSlot, 
  onClose, 
  onSubmit 
}) => {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!comment.trim()) {
      setError('Please enter a comment')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const response = await apiService.createReport({
        teacher_id: teacherId,
        student_id: student.id,
        lesson_date: lessonDate,
        time_slot: timeSlot,
        comment: comment.trim()
      })

      if (response.success) {
        onSubmit?.()
        onClose?.()
      } else {
        setError(response.error || 'Failed to save report')
      }
    } catch (err) {
      console.error('Error creating report:', err)
      setError('Failed to save lesson report')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose?.()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-800">
                Lesson Report
              </h3>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Student Info */}
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-neutral-600">Student:</span>
                  <div className="flex items-center space-x-2">
                    <p className="text-neutral-800">{student.name}</p>
                    {student.student_level && (
                      <StudentLevelBadge level={student.student_level} size="xs" />
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-neutral-600">Date:</span>
                  <p className="text-neutral-800">
                    {new Date(lessonDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-neutral-600">Time:</span>
                  <p className="text-neutral-800">{timeSlot}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-600">Teacher ID:</span>
                  <p className="text-neutral-800">{teacherId}</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-neutral-700 mb-2">
                  Lesson Comments
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter your comments about this lesson..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none"
                  rows={6}
                  required
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Describe the student's progress, areas of improvement, homework assigned, etc.
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={loading || !comment.trim()}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Report'
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default LessonReportForm
