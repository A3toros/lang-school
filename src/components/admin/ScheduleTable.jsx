import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'
import { getWeekDates, formatDate, getCurrentMonth, addDays, subtractDays, getWeekInfoForMonth, getWeekNavigationInfo } from '../../utils/dateUtils'

const ScheduleTable = ({ teacherId, weekStart, onWeekChange }) => {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)
  const [availableStudents, setAvailableStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Enhanced input functionality
  const [editingCell, setEditingCell] = useState(null)
  const [studentInput, setStudentInput] = useState('')
  const [filteredStudents, setFilteredStudents] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showMultipleLessonConfirm, setShowMultipleLessonConfirm] = useState(false)
  const [multipleLessonData, setMultipleLessonData] = useState(null)
  const [showPastLessonConfirm, setShowPastLessonConfirm] = useState(false)
  const [pastLessonData, setPastLessonData] = useState(null)
  const [showFutureLessonConfirm, setShowFutureLessonConfirm] = useState(false)
  const [futureLessonData, setFutureLessonData] = useState(null)
  const [showAutofillTip, setShowAutofillTip] = useState(false)
  const [autofillStudent, setAutofillStudent] = useState(null)

  useEffect(() => {
    if (teacherId) {
      fetchSchedule()
    } else {
      setLoading(false)
    }
  }, [teacherId, weekStart])

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      const response = await apiService.getTeacherSchedule(teacherId, weekStart)
      setSchedule(response.schedules || [])
    } catch (err) {
      setError('Failed to load schedule')
      console.error('Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableStudents = async () => {
    try {
      console.log('🔍 [FETCH_STUDENTS] Fetching available students for teacher:', teacherId)
      
      // Get unassigned students (teacher_id is null)
      const unassignedResponse = await apiService.getStudents({ 
        status: 'active', 
        teacher_id: null, 
        limit: 100 
      })
      
      // Get students assigned to current teacher
      const teacherStudentsResponse = await apiService.getStudentsByTeacher(teacherId)
      
      console.log('📊 [FETCH_STUDENTS] Unassigned response:', unassignedResponse)
      console.log('📊 [FETCH_STUDENTS] Teacher students response:', teacherStudentsResponse)
      
      const availableStudentsList = []
      
      // Add unassigned students
      if (unassignedResponse.success && unassignedResponse.students) {
        availableStudentsList.push(...unassignedResponse.students)
        console.log('✅ [FETCH_STUDENTS] Added unassigned students:', unassignedResponse.students.length)
      }
      
      // Add students assigned to current teacher
      if (teacherStudentsResponse.success && teacherStudentsResponse.students) {
        availableStudentsList.push(...teacherStudentsResponse.students)
        console.log('✅ [FETCH_STUDENTS] Added teacher students:', teacherStudentsResponse.students.length)
      }
      
      // Remove duplicates (in case a student appears in both lists)
      const uniqueStudents = availableStudentsList.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      )
      
      console.log('🎯 [FETCH_STUDENTS] Total available students:', uniqueStudents.length)
      setAvailableStudents(uniqueStudents)
    } catch (err) {
      console.error('Error fetching available students:', err)
    }
  }

  // Enhanced input functionality
  const filterStudents = (input) => {
    if (!input.trim()) {
      setFilteredStudents([])
      setShowSuggestions(false)
      setShowAutofillTip(false)
      setAutofillStudent(null)
      return
    }
    
    const filtered = availableStudents.filter(student =>
      student.name.toLowerCase().startsWith(input.toLowerCase().trim())
    )
    
    setFilteredStudents(filtered)
    setShowSuggestions(true)
    
    // Auto-fill if 3 or fewer students found
    if (filtered.length <= 3 && filtered.length > 0) {
      const firstStudent = filtered[0]
      console.log('🎯 [AUTOFILL] Showing tip for:', firstStudent.name, 'Input:', input)
      setSelectedStudent(firstStudent)
      setShowSuggestions(false)
      setShowAutofillTip(true)
      setAutofillStudent(firstStudent)
      
      // Hide tip after 3 seconds
      setTimeout(() => {
        console.log('⏰ [AUTOFILL] Hiding tip after timeout')
        setShowAutofillTip(false)
        setAutofillStudent(null)
      }, 3000)
    } else {
      console.log('❌ [AUTOFILL] No tip - filtered.length:', filtered.length)
      setShowAutofillTip(false)
      setAutofillStudent(null)
    }
  }

  const handleStudentInputChange = (e) => {
    const value = e.target.value
    setStudentInput(value)
    setSelectedStudent(null)
    
    // Hide autofill tip if user is typing something different
    if (showAutofillTip && autofillStudent) {
      const currentInput = value.toLowerCase().trim()
      const autofillName = autofillStudent.name.toLowerCase()
      
      // If user is typing something that doesn't match the autofilled student, hide tip
      if (!autofillName.includes(currentInput) || currentInput.length < autofillName.length) {
        setShowAutofillTip(false)
        setAutofillStudent(null)
      }
    }
    
    filterStudents(value)
  }

  const handleStudentSelect = (student) => {
    setSelectedStudent(student)
    setStudentInput(student.name)
    setShowSuggestions(false)
    setShowAutofillTip(false)
    setAutofillStudent(null)
  }

  const handleCellDoubleClick = (dayIndex, timeSlot) => {
    const cellKey = `${dayIndex}-${timeSlot}`
    setEditingCell(cellKey)
    setStudentInput('')
    setSelectedStudent(null)
    setShowSuggestions(false)
    setShowAutofillTip(false)
    setAutofillStudent(null)
    
    // Fetch available students for this teacher
    fetchAvailableStudents()
    
    // Focus input after state update
    setTimeout(() => {
      const input = document.getElementById(`student-input-${cellKey}`)
      if (input) input.focus()
    }, 0)
  }

  const handleCellClickOutside = () => {
    setEditingCell(null)
    setStudentInput('')
    setSelectedStudent(null)
    setShowSuggestions(false)
    setShowAutofillTip(false)
    setAutofillStudent(null)
  }

  const handleAddStudentClick = (timeSlot) => {
    setSelectedTimeSlot(timeSlot)
    setShowAddStudentModal(true)
    fetchAvailableStudents()
  }

  const getDayNumber = (dayName) => {
    // Convert day name to integer as expected by database
    // Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4, Saturday=5, Sunday=6
    const dayMap = {
      'Monday': 0,
      'Tuesday': 1,
      'Wednesday': 2,
      'Thursday': 3,
      'Friday': 4,
      'Saturday': 5,
      'Sunday': 6
    }
    return dayMap[dayName] !== undefined ? dayMap[dayName] : 0
  }

  const handleAddStudentToSchedule = async (student = null, dayIndex = null, timeSlot = null) => {
    const studentToUse = student || availableStudents.find(s => s.id === selectedStudentId)
    const timeSlotToUse = timeSlot || selectedTimeSlot
    
    if (!studentToUse || !timeSlotToUse) return

    // Validate that student is either unassigned or belongs to current teacher
    if (studentToUse.teacher_id && studentToUse.teacher_id !== teacherId) {
      alert(`Cannot add student "${studentToUse.name}" to schedule. This student is already assigned to another teacher.`)
      return
    }

    try {
      const dayNumber = dayIndex !== null ? dayIndex : getDayNumber(timeSlotToUse.day)
      
      const scheduleData = {
        teacher_id: teacherId,
        student_id: studentToUse.id,
        day_of_week: dayNumber,
        time_slot: timeSlotToUse.time || timeSlotToUse,
        week_start_date: weekStart
      }

      // Check if student has multiple lessons per week
      if (studentToUse.lessons_per_week > 1) {
        // Show confirmation modal for multiple lessons
        setShowMultipleLessonConfirm(true)
        setMultipleLessonData({
          student: studentToUse,
          timeSlot: timeSlotToUse,
          lessonsPerWeek: studentToUse.lessons_per_week,
          scheduleData
        })
      } else {
        // Single lesson - proceed directly
        await createSchedule(scheduleData)
      }
    } catch (err) {
      console.error('Error adding student to schedule:', err)
      alert('Failed to add student to schedule: ' + err.message)
    }
  }

  const createSchedule = async (scheduleData) => {
    try {
      const response = await apiService.createSchedule(scheduleData)
      if (response.success) {
        // Refresh the schedule
        await fetchSchedule()
        setShowAddStudentModal(false)
        setSelectedStudentId('')
        setSelectedTimeSlot(null)
        setEditingCell(null)
        setStudentInput('')
        setSelectedStudent(null)
        setShowSuggestions(false)
        alert('Schedule created successfully!')
      } else {
        alert('Failed to create schedule: ' + response.error)
      }
    } catch (err) {
      console.error('Error creating schedule:', err)
      alert('Error creating schedule: ' + err.message)
    }
  }

  const confirmMultipleLessons = async () => {
    if (multipleLessonData) {
      await createSchedule(multipleLessonData.scheduleData)
      setShowMultipleLessonConfirm(false)
      setMultipleLessonData(null)
    }
  }

  const timeSlots = [
    '6:30-7:00', '7:00-7:30', '7:30-8:00', '8:00-8:30', '8:30-9:00',
    '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00', '11:00-11:30',
    '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
    '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30',
    '16:30-17:00', '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00',
    '19:00-19:30', '19:30-20:00', '20:00-20:30', '20:30-21:00', '21:00-21:30',
    '21:30-22:00'
  ]

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  // Get week dates and month information
  const weekDates = weekStart ? getWeekDates(weekStart) : []
  const currentMonth = getCurrentMonth()
  
  // Determine the target month and year for week numbering
  // Use the month that contains the most days in this week
  const monthCounts = {}
  weekDates.forEach(date => {
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
  })
  
  const targetMonthKey = Object.keys(monthCounts).reduce((a, b) => 
    monthCounts[a] > monthCounts[b] ? a : b, Object.keys(monthCounts)[0]
  )
  
  const [targetYear, targetMonth] = targetMonthKey ? targetMonthKey.split('-').map(Number) : [currentMonth.year, currentMonth.month]
  
  // Get week information with complex month boundary logic
  const weekInfo = weekStart ? getWeekInfoForMonth(weekStart, targetMonth, targetYear) : null
  const navigationInfo = weekStart ? getWeekNavigationInfo(weekStart, targetMonth, targetYear) : null
  
  // Get the month name for the week
  const weekMonth = weekDates.length > 0 ? 
    weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
    currentMonth.name + ' ' + currentMonth.year

  const getStudentForSlot = (dayOfWeek, timeSlot) => {
    return schedule.find(s => s.day_of_week === dayOfWeek && s.time_slot === timeSlot)
  }

  // Enhanced lesson deletion functionality
  const handleDeleteLesson = async (schedule) => {
    const isPast = new Date(schedule.week_start_date) < new Date()
    
    if (isPast) {
      // Show confirmation for past lesson cancellation
      setShowPastLessonConfirm(true)
      setPastLessonData(schedule)
    } else {
      // Show confirmation for future lesson deletion
      setShowFutureLessonConfirm(true)
      setFutureLessonData(schedule)
    }
  }

  const confirmPastLessonCancellation = async () => {
    if (pastLessonData) {
      try {
        const response = await apiService.deleteSchedule(pastLessonData.id)
        if (response.success) {
          await fetchSchedule()
          alert('Past lesson marked as cancelled')
        } else {
          alert('Failed to cancel lesson: ' + response.error)
        }
      } catch (err) {
        console.error('Error cancelling lesson:', err)
        alert('Error cancelling lesson: ' + err.message)
      }
      setShowPastLessonConfirm(false)
      setPastLessonData(null)
    }
  }

  const confirmFutureLessonDeletion = async () => {
    if (futureLessonData) {
      try {
        const response = await apiService.deleteSchedule(futureLessonData.id)
        if (response.success) {
          await fetchSchedule()
          alert('Future lessons deleted successfully')
        } else {
          alert('Failed to delete lessons: ' + response.error)
        }
      } catch (err) {
        console.error('Error deleting lessons:', err)
        alert('Error deleting lessons: ' + err.message)
      }
      setShowFutureLessonConfirm(false)
      setFutureLessonData(null)
    }
  }

  // Enhanced cell content rendering
  const renderCellContent = (dayIndex, timeSlot, existingSchedule) => {
    const cellKey = `${dayIndex}-${timeSlot}`
    const isEditing = editingCell === cellKey

    if (isEditing) {
      return (
        <div className="relative w-full">
          <input
            id={`student-input-${cellKey}`}
            type="text"
            value={studentInput}
            onChange={handleStudentInputChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Type student name..."
            className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedStudent) {
                handleAddStudentToSchedule(selectedStudent, dayIndex, timeSlot)
                setEditingCell(null)
              } else if (e.key === 'Escape') {
                setEditingCell(null)
                setStudentInput('')
                setSelectedStudent(null)
              }
            }}
          />
          
          {/* In-cell suggestions */}
          {showSuggestions && filteredStudents.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredStudents.slice(0, 5).map((student) => (
                <div
                  key={student.id}
                  onClick={() => {
                    // Prevent selection of students assigned to other teachers
                    if (student.teacher_id && student.teacher_id !== teacherId) {
                      return
                    }
                    setSelectedStudent(student)
                    setStudentInput(student.name)
                    setShowSuggestions(false)
                  }}
                  className={`px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 ${
                    student.teacher_id && student.teacher_id !== teacherId
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-gray-500">
                        {student.lessons_per_week} lessons
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      {!student.teacher_id ? (
                        <span className="text-xs text-green-600 font-medium">Unassigned</span>
                      ) : student.teacher_id === teacherId ? (
                        <span className="text-xs text-blue-600 font-medium">Current Teacher</span>
                      ) : (
                        <span className="text-xs text-red-600 font-medium">Other Teacher</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Autofill Tip */}
          {showAutofillTip && autofillStudent && (
            <div className="absolute z-30 w-full mt-1 bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Auto-filled:</span> {autofillStudent.name}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Press <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> to confirm or continue typing
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAutofillTip(false)
                    setAutofillStudent(null)
                  }}
                  className="flex-shrink-0 text-blue-400 hover:text-blue-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (existingSchedule) {
      return (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{existingSchedule.student_name}</span>
          <button
            onClick={() => handleDeleteLesson(existingSchedule)}
            className="text-red-500 hover:text-red-700 text-xs"
          >
            ×
          </button>
        </div>
      )
    }

    return (
      <div
        className="w-full h-full flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50"
        onDoubleClick={() => handleCellDoubleClick(dayIndex, timeSlot)}
      >
        <span className="text-xs">Double-click to add student</span>
      </div>
    )
  }

  // Animation variants
  const tableVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  const weekTransitionVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  }

  const dayVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  }

  const handlePreviousWeek = async () => {
    if (onWeekChange && weekStart && !isTransitioning) {
      setIsTransitioning(true)
      const previousWeek = subtractDays(weekStart, 7)
      onWeekChange(previousWeek)
      // Reset transition state after animation
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  const handleNextWeek = async () => {
    if (onWeekChange && weekStart && !isTransitioning) {
      setIsTransitioning(true)
      const nextWeek = addDays(weekStart, 7)
      onWeekChange(nextWeek)
      // Reset transition state after animation
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  const handleCurrentWeek = async () => {
    if (onWeekChange && !isTransitioning) {
      setIsTransitioning(true)
      const today = new Date()
      const currentWeekStart = today.toISOString().split('T')[0]
      onWeekChange(currentWeekStart)
      // Reset transition state after animation
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  const getAttendanceStatus = (student) => {
    if (!student) return 'scheduled'
    return student.attendance_status || 'scheduled'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-white'
      case 'absent':
        return 'bg-error text-white'
      default:
        return 'bg-neutral-200 text-neutral-700'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-neutral-800">Weekly Schedule</h3>
            
            {/* Week Navigation */}
            {onWeekChange && (
              <motion.div 
                className="flex items-center space-x-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.button
                  onClick={handlePreviousWeek}
                  disabled={isTransitioning}
                  className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous Week"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.svg 
                    className="w-4 h-4 text-neutral-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    animate={isTransitioning ? { x: [-2, 2, -2] } : { x: 0 }}
                    transition={{ duration: 0.1, repeat: isTransitioning ? Infinity : 0 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </motion.svg>
                </motion.button>
                
                <motion.button
                  onClick={handleCurrentWeek}
                  disabled={isTransitioning}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                    navigationInfo?.isCurrentWeek 
                      ? 'bg-primary-500 text-white' 
                      : 'text-neutral-700 bg-neutral-100 hover:bg-neutral-200'
                  }`}
                  title={navigationInfo?.weekLabel || "Current Week"}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.span
                    key={navigationInfo?.weekLabel || "Week 1"}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {navigationInfo?.weekLabel || "Week 1"}
                  </motion.span>
                </motion.button>
                
                <motion.button
                  onClick={handleNextWeek}
                  disabled={isTransitioning}
                  className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next Week"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.svg 
                    className="w-4 h-4 text-neutral-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    animate={isTransitioning ? { x: [2, -2, 2] } : { x: 0 }}
                    transition={{ duration: 0.1, repeat: isTransitioning ? Infinity : 0 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </motion.svg>
                </motion.button>
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-neutral-700">Read Mode</span>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  editMode ? 'bg-primary-500' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    editMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-neutral-700">Edit Mode</span>
            </div>
            {editMode && (
              <button className="btn-primary text-sm">
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="overflow-x-auto">
        <AnimatePresence mode="wait">
          <motion.table 
            key={weekStart} 
            className="w-full"
            variants={tableVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <thead className="bg-neutral-50">
              {/* Month and Year Row */}
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-neutral-800 w-24"></th>
                <th colSpan="7" className="px-4 py-2 text-center text-lg font-bold text-neutral-800">
                  <motion.span
                    key={weekMonth}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {weekMonth}
                  </motion.span>
                </th>
              </tr>
              {/* Day Names and Dates Row */}
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 w-24">Time</th>
                {days.map((day, index) => {
                  const dayInfo = weekInfo?.days?.[index]
                  const isCurrentMonth = dayInfo?.isCurrentMonth ?? true
                  const isEditable = dayInfo?.isEditable ?? true
                  
                  return (
                    <motion.th 
                      key={`${day}-${weekStart}`}
                      className={`px-4 py-3 text-center text-sm font-medium min-w-[120px] ${
                        isCurrentMonth 
                          ? 'text-neutral-700' 
                          : 'text-neutral-400 bg-neutral-100'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="flex flex-col">
                        <div className={`font-semibold ${!isCurrentMonth ? 'opacity-50' : ''}`}>
                          {day}
                        </div>
                        {weekDates.length > index && (
                          <motion.div 
                            className={`text-xs mt-1 ${isCurrentMonth ? 'text-neutral-500' : 'text-neutral-400'}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
                          >
                            {formatDate(weekDates[index], 'short')}
                          </motion.div>
                        )}
                      </div>
                    </motion.th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((timeSlot, timeIndex) => (
                <motion.tr 
                  key={timeSlot} 
                  className="border-b border-neutral-100"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: timeIndex * 0.02 }}
                >
                  <td className="px-4 py-3 text-sm text-neutral-600 font-medium">
                    {timeSlot}
                  </td>
                  {days.map((day, dayIndex) => {
                    const dayOfWeek = getDayNumber(day)
                    const student = getStudentForSlot(dayOfWeek, timeSlot)
                    const status = getAttendanceStatus(student)
                    const dayInfo = weekInfo?.days?.[dayIndex]
                    const isCurrentMonth = dayInfo?.isCurrentMonth ?? true
                    const isEditable = dayInfo?.isEditable ?? true
                    
                    return (
                      <motion.td 
                        key={`${dayIndex}-${timeIndex}-${weekStart}`}
                        className={`px-2 py-2 h-16 relative ${!isCurrentMonth ? 'bg-neutral-50' : ''}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: (timeIndex * 0.02) + (dayIndex * 0.01) }}
                        onClick={handleCellClickOutside}
                      >
                        <AnimatePresence mode="wait">
                          {student ? (
                            <motion.div
                              key={`student-${student.id}-${weekStart}`}
                              className={`p-2 rounded-lg text-xs font-medium text-center transition-all duration-200 ${getStatusColor(status)} ${
                                isEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                              }`}
                              whileHover={isEditable ? { scale: 1.02 } : {}}
                              whileTap={isEditable ? { scale: 0.98 } : {}}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="truncate">{student.student_name}</div>
                              {editMode && isEditable && (
                                <div className="mt-1 text-xs opacity-75">
                                  Click to edit
                                </div>
                              )}
                            </motion.div>
                          ) : editMode && isEditable ? (
                            <motion.div
                              key={`enhanced-cell-${dayIndex}-${timeIndex}-${weekStart}`}
                              className="w-full h-full"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2 }}
                            >
                              {renderCellContent(dayOfWeek, timeSlot, null)}
                            </motion.div>
                          ) : (
                            <motion.div 
                              key={`empty-${dayIndex}-${timeIndex}-${weekStart}`}
                              className={`w-full h-12 flex items-center justify-center ${
                                isCurrentMonth ? 'text-neutral-300' : 'text-neutral-200'
                              }`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {isCurrentMonth ? '-' : ''}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.td>
                    )
                  })}
                </motion.tr>
              ))}
            </tbody>
          </motion.table>
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-success rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-error rounded"></div>
            <span>Absent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-neutral-200 rounded"></div>
            <span>Scheduled</span>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
          >
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">
              Add Student to Schedule
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              {selectedTimeSlot && `Adding student for ${selectedTimeSlot.day} at ${selectedTimeSlot.time}`}
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Choose a student...</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} {!student.teacher_id ? '(Unassigned)' : student.teacher_id === teacherId ? '(Current Teacher)' : '(Other Teacher)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddStudentModal(false)
                  setSelectedStudentId('')
                  setSelectedTimeSlot(null)
                }}
                className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudentToSchedule}
                disabled={!selectedStudentId}
                className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                Add Student
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Multiple Lesson Confirmation Modal */}
      {showMultipleLessonConfirm && multipleLessonData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Create Multiple Lessons
            </h3>
            <p className="text-gray-600 mb-4">
              <strong>{multipleLessonData.student.name}</strong> has{' '}
              <strong>{multipleLessonData.lessonsPerWeek} lessons/week</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              This will create {multipleLessonData.lessonsPerWeek} schedule entries for{' '}
              {multipleLessonData.timeSlot.day} at {multipleLessonData.timeSlot.time}.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMultipleLessonConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmMultipleLessons}
                className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
              >
                Create {multipleLessonData.lessonsPerWeek} Lessons
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Lesson Cancellation Modal */}
      {showPastLessonConfirm && pastLessonData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-yellow-600">
              Cancel Past Lesson
            </h3>
            <p className="text-gray-600 mb-4">
              This lesson will be marked as <strong>cancelled</strong> but preserved for historical records.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              It will <strong>not affect</strong> the student's total lessons count.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPastLessonConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmPastLessonCancellation}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
              >
                Mark as Cancelled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Future Lesson Deletion Modal */}
      {showFutureLessonConfirm && futureLessonData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              Delete Future Lessons
            </h3>
            <p className="text-gray-600 mb-4">
              This will delete <strong>all future lessons</strong> with the same pattern.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Past lessons will be <strong>preserved</strong> for historical records.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFutureLessonConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmFutureLessonDeletion}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Delete Future Lessons
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleTable
