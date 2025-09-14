import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Clock, UserPlus } from 'lucide-react'
import apiService from '../../utils/api'

const StudentSelectionModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  teacherId, 
  teacherName 
}) => {
  const [currentStudents, setCurrentStudents] = useState([])
  const [historyStudents, setHistoryStudents] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('current') // current, history, all

  useEffect(() => {
    if (isOpen && teacherId) {
      fetchStudentSuggestions()
    }
  }, [isOpen, teacherId])

  const fetchStudentSuggestions = async () => {
    try {
      setLoading(true)
      setError('')

      const [currentRes, historyRes, allRes] = await Promise.all([
        apiService.getCurrentStudents(teacherId),
        apiService.getHistoryStudents(teacherId),
        apiService.getStudents({ status: 'active' })
      ])

      if (currentRes.success) setCurrentStudents(currentRes.students || [])
      if (historyRes.success) setHistoryStudents(historyRes.students || [])
      if (allRes.success) setAllStudents(allRes.students || [])

    } catch (error) {
      console.error('Error fetching student suggestions:', error)
      setError('Failed to load student suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentSelect = (student) => {
    onSelect(student)
    onClose()
  }

  const getFilteredStudents = (students) => {
    if (!searchTerm) return students
    return students.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const getStudentStats = (student) => {
    if (student.lesson_count !== undefined) {
      return `${student.lesson_count} lessons`
    }
    if (student.total_lessons !== undefined) {
      return `${student.total_lessons} total lessons`
    }
    return ''
  }

  const getLastLessonDate = (student) => {
    if (student.last_lesson_date) {
      return new Date(student.last_lesson_date).toLocaleDateString()
    }
    return ''
  }

  const renderStudentList = (students, category, title, icon, color) => {
    const filteredStudents = getFilteredStudents(students)
    
    return (
      <div className="space-y-2">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${color} bg-opacity-10`}>
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-gray-500">({filteredStudents.length})</span>
        </div>
        
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filteredStudents.map((student) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStudentSelect(student)}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${color} border-opacity-30 hover:border-opacity-50`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{student.name}</div>
                  <div className="text-sm text-gray-500">
                    {getStudentStats(student)}
                    {getLastLessonDate(student) && ` • Last lesson: ${getLastLessonDate(student)}`}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {category === 'current' && 'Current'}
                  {category === 'history' && 'Previous'}
                  {category === 'all' && 'Available'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Select Student for {teacherName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose from current, previous, or all available students
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'current', label: 'Current Students', count: currentStudents.length },
            { id: 'history', label: 'Previous Students', count: historyStudents.length },
            { id: 'all', label: 'All Students', count: allStudents.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                selectedCategory === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchStudentSuggestions}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Retry
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {selectedCategory === 'current' && (
                <motion.div
                  key="current"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {renderStudentList(
                    currentStudents,
                    'current',
                    'Current Students',
                    <Users className="w-4 h-4 text-green-600" />,
                    'border-green-200 bg-green-50'
                  )}
                </motion.div>
              )}

              {selectedCategory === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {renderStudentList(
                    historyStudents,
                    'history',
                    'Previous Students',
                    <Clock className="w-4 h-4 text-blue-600" />,
                    'border-blue-200 bg-blue-50'
                  )}
                </motion.div>
              )}

              {selectedCategory === 'all' && (
                <motion.div
                  key="all"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {renderStudentList(
                    allStudents,
                    'all',
                    'All Available Students',
                    <UserPlus className="w-4 h-4 text-gray-600" />,
                    'border-gray-200 bg-gray-50'
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default StudentSelectionModal
