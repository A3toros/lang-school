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
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [weeksInMonth, setWeeksInMonth] = useState([])
  const [showWeekDropdown, setShowWeekDropdown] = useState(false)
  const [monthlyStats, setMonthlyStats] = useState({})

  // Load teachers data
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true)
        setError('')
        
        const response = await apiService.getTeachers()
        
        if (response.success) {
          console.log('🔍 [TEACHERS_TABLE] Teachers data:', response.teachers.map(t => ({ id: t.id, name: t.name, student_count: t.student_count })))
          response.teachers.forEach(teacher => {
            console.log(`🔍 [TEACHER] ${teacher.name} (ID: ${teacher.id}): ${teacher.student_count || 0} students`)
          })
          setTeachers(response.teachers || [])
          
          // Don't fetch individual stats - we'll use monthly stats instead
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

  // Toggle teacher expansion - only one teacher can be expanded at a time
  const toggleTeacher = async (teacherId) => {
    const newExpanded = new Set()
    
    if (!expandedTeachers.has(teacherId)) {
      // If this teacher is not currently expanded, expand only this one
      newExpanded.add(teacherId)
      // Fetch students when expanding
      await fetchTeacherStudents(teacherId)
    }
    // If this teacher is already expanded, close it (newExpanded remains empty)
    
    setExpandedTeachers(newExpanded)
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }

  // Generate weeks for current month
  const generateWeeksInMonth = (month) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    
    // Get first day of month
    const firstDay = new Date(year, monthIndex, 1)
    // Get last day of month
    const lastDay = new Date(year, monthIndex + 1, 0)
    
    const weeks = []
    let currentWeekStart = new Date(firstDay)
    let weekNumber = 1
    
    // Find the Monday of the first week
    const dayOfWeek = firstDay.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    currentWeekStart.setDate(firstDay.getDate() + daysToMonday)
    
    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart)
      weekEnd.setDate(currentWeekStart.getDate() + 6)
      
      // Only include weeks that overlap with the current month
      if (weekEnd >= firstDay && currentWeekStart <= lastDay) {
        weeks.push({
          weekNumber,
          start: currentWeekStart.getFullYear() + '-' + 
            String(currentWeekStart.getMonth() + 1).padStart(2, '0') + '-' + 
            String(currentWeekStart.getDate()).padStart(2, '0'), // Store as string (timezone-safe)
          end: weekEnd.getFullYear() + '-' + 
            String(weekEnd.getMonth() + 1).padStart(2, '0') + '-' + 
            String(weekEnd.getDate()).padStart(2, '0'), // Store as string (timezone-safe)
          label: `${currentWeekStart.getDate()}-${weekEnd.getDate()} ${month.toLocaleString('default', { month: 'short' })}`
        })
      }
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
      weekNumber++
    }
    
    return weeks
  }

  // Get lesson count with week filtering
  const getLessonCount = (teacherId) => {
    // If a specific week is selected, return week-specific data from monthly stats
    if (selectedWeek) {
      const teacherStats = monthlyStats[teacherId]
      if (!teacherStats) {
        console.log(`🔍 [GET_LESSON_COUNT] No monthly stats for teacher ${teacherId}`)
        return 0
      }
      
      // Find the week that matches the selected week
      // We need to match by week start date (Monday)
      // selectedWeek.start is now a string, so we can use it directly
      const selectedWeekStart = selectedWeek.start
      console.log(`🔍 [GET_LESSON_COUNT] Looking for week ${selectedWeekStart} in teacher ${teacherId} stats:`, teacherStats)
      
      // Look through all weeks for this teacher and find matching week
      for (const [weekDate, weekData] of Object.entries(teacherStats)) {
        // Convert backend date to match frontend format (avoid timezone conversion)
        const backendDateObj = new Date(weekDate)
        const backendDate = backendDateObj.getFullYear() + '-' + 
          String(backendDateObj.getMonth() + 1).padStart(2, '0') + '-' + 
          String(backendDateObj.getDate()).padStart(2, '0')
        if (backendDate === selectedWeekStart) {
          console.log(`🔍 [GET_LESSON_COUNT] Found matching week ${weekDate} (${backendDate}):`, weekData)
          return weekData.total_lessons || 0
        }
      }
      console.log(`🔍 [GET_LESSON_COUNT] No matching week found for ${selectedWeekStart}`)
      return 0
    }
    
    // If no week selected, return total for the current month from monthly stats
    const teacherStats = monthlyStats[teacherId]
    if (!teacherStats) return 0
    
    // Sum up all weeks for this teacher in the current month
    let totalLessons = 0
    Object.values(teacherStats).forEach(weekData => {
      totalLessons += weekData.total_lessons || 0
    })
    
    return totalLessons
  }

  // Generate weeks and fetch monthly stats when month changes
  useEffect(() => {
    const weeks = generateWeeksInMonth(currentMonth)
    setWeeksInMonth(weeks)
    setSelectedWeek(null) // Reset selected week when month changes
    
    // Fetch monthly stats for all teachers
    const fetchMonthlyStats = async () => {
      try {
        setFiltering(true)
        const month = currentMonth.getMonth() + 1
        const year = currentMonth.getFullYear()
        
        console.log('🔍 [TEACHERS_TABLE] Fetching monthly stats for:', year, month)
        
        const response = await apiService.getMonthlyLessonStats(month, year)
        if (response.success) {
          // Group stats by teacher and week
          const groupedStats = {}
          response.monthlyStats.forEach(stat => {
            const teacherId = stat.teacher_id
            const weekStart = stat.week_start_date
            
            if (!groupedStats[teacherId]) {
              groupedStats[teacherId] = {}
            }
            
            groupedStats[teacherId][weekStart] = {
              completed_lessons: Number(stat.completed_lessons),
              absent_lessons: Number(stat.absent_lessons),
              total_lessons: Number(stat.completed_lessons) + Number(stat.absent_lessons)
            }
          })
          
          setMonthlyStats(groupedStats)
          console.log('🔍 [TEACHERS_TABLE] Monthly stats loaded:', groupedStats)
        }
      } catch (error) {
        console.error('Error fetching monthly stats:', error)
      } finally {
        setFiltering(false)
      }
    }
    
    fetchMonthlyStats()
  }, [currentMonth])


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
      <div className="mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-neutral-800 mb-4">Teachers Overview</h3>
        
        {/* Month Navigation and Week Selector - Below title, left aligned */}
        <div className="flex items-center justify-start space-x-4">
          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              ←
            </button>
            <h3 className="text-lg font-semibold text-gray-800">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              →
            </button>
          </div>
          
          {/* Week Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowWeekDropdown(!showWeekDropdown)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {selectedWeek ? selectedWeek.label : 'All Weeks'}
            </button>
            
            {showWeekDropdown && (
              <div className="absolute mt-1 bg-white border rounded shadow-lg z-10 min-w-64 right-0">
                <button
                  onClick={() => {
                    setSelectedWeek(null)
                    setShowWeekDropdown(false)
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                >
                  All Weeks
                </button>
                {weeksInMonth.map((week, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      console.log('🔍 [WEEK_SELECT] Selected week:', week)
                      setSelectedWeek(week)
                      setShowWeekDropdown(false)
                    }}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                  >
                    Week {week.weekNumber}: {new Date(week.start).toLocaleDateString()} - {new Date(week.end).toLocaleDateString()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Week info display */}
        {selectedWeek && (
          <p className="text-xs sm:text-base text-neutral-600 mt-2">
            Showing lessons for week: {selectedWeek.label}
            {filtering && <span className="ml-2 text-primary-600">(Filtering...)</span>}
          </p>
        )}
      </div>

      {/* Teachers Table */}
      <div className="w-full">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-1 sm:py-2 px-1 sm:px-2 font-semibold text-2xs sm:text-sm text-neutral-700">Teacher</th>
              <th className="text-left py-1 sm:py-2 px-1 sm:px-2 font-semibold text-2xs sm:text-sm text-neutral-700 hidden sm:table-cell">Students</th>
              <th className="text-left py-1 sm:py-2 px-1 sm:px-2 font-semibold text-2xs sm:text-sm text-neutral-700 hidden md:table-cell">Lessons</th>
              <th className="text-left py-1 sm:py-2 px-1 sm:px-2 font-semibold text-2xs sm:text-sm text-neutral-700 w-1/3 sm:w-auto">Actions</th>
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
                    <span className="text-2xs sm:text-sm font-medium text-neutral-800">
                      {teacher.name}
                    </span>
                  </td>
                  
                  <td className="py-1 sm:py-2 px-1 sm:px-2 hidden sm:table-cell">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs sm:text-sm font-medium bg-primary-100 text-primary-800">
                      {teacher.student_count || 0} students
                    </span>
                  </td>
                  
                  <td className="py-1 sm:py-2 px-1 sm:px-2 hidden md:table-cell">
                    <span className="text-2xs sm:text-sm font-medium text-neutral-800">
                      {getLessonCount(teacher.id)}
                    </span>
                  </td>
                  
                  
                  <td className="py-1 sm:py-2 px-1 sm:px-2">
                    <button
                      onClick={() => toggleTeacher(teacher.id)}
                      className="inline-flex items-center px-1 sm:px-2 py-0.5 sm:py-1 border border-neutral-300 rounded-md text-2xs sm:text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
