import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'

const TeachersTable = () => {
  const [teachers, setTeachers] = useState([])
  const [teacherStats, setTeacherStats] = useState({})
  const [teacherStudents, setTeacherStudents] = useState({})
  const [expandedTeachers, setExpandedTeachers] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [filtering, setFiltering] = useState(false)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  // Load teachers data
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true)
        setError('')
        
        const response = await apiService.getTeachers()
        
        if (response.success) {
          setTeachers(response.teachers || [])
          
          // Fetch stats for each teacher
          const statsPromises = response.teachers.map(async (teacher) => {
            try {
              const statsResponse = await apiService.getTeacherStats(teacher.id)
              return {
                teacherId: teacher.id,
                stats: statsResponse.success ? statsResponse.stats : null
              }
            } catch (err) {
              console.error(`Error fetching stats for teacher ${teacher.id}:`, err)
              return { teacherId: teacher.id, stats: null }
            }
          })
          
          const statsResults = await Promise.all(statsPromises)
          const statsMap = {}
          statsResults.forEach(({ teacherId, stats }) => {
            statsMap[teacherId] = stats
          })
          setTeacherStats(statsMap)
        } else {
          throw new Error(response.error || 'Failed to load teachers')
        }
      } catch (err) {
        console.error('Error fetching teachers:', err)
        setError(`Failed to load teachers: ${err.message}`)
        setTeachers([])
      } finally {
        setLoading(false)
      }
    }

    fetchTeachers()
  }, [])

  // Fetch students for a specific teacher
  const fetchTeacherStudents = async (teacherId) => {
    if (teacherStudents[teacherId]) {
      return // Already loaded
    }

    try {
      const response = await apiService.getTeacherStudents(teacherId)
      if (response.success) {
        setTeacherStudents(prev => ({
          ...prev,
          [teacherId]: response.students || []
        }))
      }
    } catch (err) {
      console.error(`Error fetching students for teacher ${teacherId}:`, err)
    }
  }

  // Toggle teacher expansion
  const toggleTeacher = async (teacherId) => {
    const newExpanded = new Set(expandedTeachers)
    
    if (expandedTeachers.has(teacherId)) {
      newExpanded.delete(teacherId)
    } else {
      newExpanded.add(teacherId)
      // Fetch students when expanding
      await fetchTeacherStudents(teacherId)
    }
    
    setExpandedTeachers(newExpanded)
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }

  // Get lesson count with date filtering
  const getLessonCount = (teacherId) => {
    const stats = teacherStats[teacherId]
    if (!stats) return 0
    
    // If date range is selected, return filtered lessons, otherwise total
    if (dateRange.startDate && dateRange.endDate) {
      return stats.filtered_lessons || stats.completed_lessons || 0
    }
    
    return stats.completed_lessons || 0
  }

  // Fetch filtered lesson data when date range changes
  useEffect(() => {
    if (!dateRange.startDate || !dateRange.endDate) return

    const fetchFilteredLessons = async () => {
      setFiltering(true)
      const filteredStats = {}
      
      for (const teacher of teachers) {
        try {
          const response = await apiService.getTeacherAttendance(
            teacher.id, 
            dateRange.startDate, 
            dateRange.endDate
          )
          
          if (response.success) {
            const attendance = response.attendance || []
            const completedLessons = attendance.filter(a => a.attendance_status === 'completed').length
            const totalLessons = attendance.length
            
            filteredStats[teacher.id] = {
              ...teacherStats[teacher.id],
              filtered_lessons: totalLessons,
              completed_lessons: completedLessons
            }
          }
        } catch (err) {
          console.error(`Error fetching filtered attendance for teacher ${teacher.id}:`, err)
        }
      }
      
      setTeacherStats(prev => ({ ...prev, ...filteredStats }))
      setFiltering(false)
    }

    fetchFilteredLessons()
  }, [dateRange.startDate, dateRange.endDate, teachers])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="text-center py-8">
          <div className="text-error text-sm mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="text-primary-600 hover:text-primary-700 text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-neutral-800">Teachers Overview</h3>
          {dateRange.startDate && dateRange.endDate && (
            <p className="text-xs sm:text-sm text-neutral-600 mt-1">
              Showing lessons from {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
              {filtering && <span className="ml-2 text-primary-600">(Filtering...)</span>}
            </p>
          )}
        </div>
        
        {/* Date Range Picker */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
          <div className="flex gap-2 items-center">
            <label className="text-xs sm:text-sm font-medium text-neutral-700">From:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-2 sm:px-3 py-1 border border-neutral-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs sm:text-sm font-medium text-neutral-700">To:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-2 sm:px-3 py-1 border border-neutral-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {(dateRange.startDate || dateRange.endDate) && (
            <button
              onClick={() => setDateRange({ startDate: '', endDate: '' })}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-neutral-600 hover:text-neutral-800 underline"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Teachers Table */}
      <div className="w-full">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-1 sm:py-2 px-1 sm:px-2 font-semibold text-2xs text-neutral-700 w-1/3 sm:w-auto">Teacher</th>
              <th className="text-left py-1 sm:py-2 px-1 sm:px-2 font-semibold text-2xs text-neutral-700 hidden sm:table-cell">Students</th>
              <th className="text-left py-1 sm:py-2 px-1 sm:px-2 font-semibold text-2xs text-neutral-700 hidden md:table-cell">Lessons</th>
              <th className="text-left py-1 sm:py-2 px-1 sm:px-2 font-semibold text-2xs text-neutral-700 hidden lg:table-cell">Attendance</th>
              <th className="text-left py-1 sm:py-2 px-1 sm:px-2 font-semibold text-2xs text-neutral-700 w-1/3 sm:w-auto">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => {
              const stats = teacherStats[teacher.id]
              const isExpanded = expandedTeachers.has(teacher.id)
              const students = teacherStudents[teacher.id] || []
              
              return (
                <motion.tr
                  key={teacher.id}
                  className="border-b border-neutral-100 hover:bg-neutral-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <td className="py-1 sm:py-2 px-1 sm:px-2">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-2xs font-semibold text-primary-700">
                          {teacher.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-2xs text-neutral-800 truncate">{teacher.name}</div>
                        <div className="text-2xs text-neutral-500 truncate">{teacher.email}</div>
                        {/* Mobile: Show stats inline */}
                        <div className="sm:hidden mt-1 space-x-1">
                          <span className="inline-flex items-center px-1 py-0.5 rounded-full text-2xs font-medium bg-primary-100 text-primary-800">
                            {teacher.student_count || 0} students
                          </span>
                          <span className="text-2xs text-neutral-600">
                            {getLessonCount(teacher.id)} lessons
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-1 sm:py-2 px-1 sm:px-2 hidden sm:table-cell">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-medium bg-primary-100 text-primary-800">
                      {teacher.student_count || 0} students
                    </span>
                  </td>
                  
                  <td className="py-1 sm:py-2 px-1 sm:px-2 hidden md:table-cell">
                    <span className="text-2xs font-medium text-neutral-800">
                      {getLessonCount(teacher.id)}
                    </span>
                  </td>
                  
                  <td className="py-1 sm:py-2 px-1 sm:px-2 hidden lg:table-cell">
                    <span className="text-2xs font-medium text-neutral-800">
                      {stats?.attendance_rate ? `${stats.attendance_rate}%` : 'N/A'}
                    </span>
                  </td>
                  
                  <td className="py-1 sm:py-2 px-1 sm:px-2">
                    <button
                      onClick={() => toggleTeacher(teacher.id)}
                      className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 border border-neutral-300 rounded-md text-2xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <span className="hidden sm:inline">{isExpanded ? 'Hide Students' : 'Show Students'}</span>
                      <span className="sm:hidden">{isExpanded ? 'Hide' : 'Show'}</span>
                      <motion.svg
                        className="ml-2 w-4 h-4"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </button>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded Student Details */}
      <AnimatePresence>
        {teachers.map((teacher) => {
          const isExpanded = expandedTeachers.has(teacher.id)
          const students = teacherStudents[teacher.id] || []
          
          if (!isExpanded) return null
          
          return (
            <motion.div
              key={`students-${teacher.id}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-neutral-200 bg-neutral-50"
            >
              <div className="p-6">
                <h4 className="text-lg font-semibold text-neutral-800 mb-4">
                  Students for {teacher.name}
                </h4>
                
                {students.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <p>No students assigned to this teacher</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center">
                            <span className="text-xs font-semibold text-secondary-700">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-neutral-800">{student.name}</div>
                            <div className="text-sm text-neutral-500">
                              {student.lessons_per_week} lessons/week (auto)
                            </div>
                            <div className="text-xs text-neutral-400">
                              Added: {formatDate(student.added_date)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {teachers.length === 0 && !loading && (
        <div className="text-center py-8 text-neutral-500">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">No teachers found</p>
          <p className="text-sm text-neutral-400">
            There are no teachers in the database yet.
          </p>
        </div>
      )}
    </div>
  )
}

export default TeachersTable
