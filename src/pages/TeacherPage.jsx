import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import apiService from '../utils/api'
import { getCurrentWeekStart, getWeekEnd, getWeekStart, getWeekDates, formatDate, getCurrentMonth, addDays, subtractDays, getWeekInfoForMonth, getWeekNavigationInfo } from '../utils/dateUtils'
import FileLibrary from '../components/teacher/FileLibrary'
import LoadingSpinnerModal from '../components/common/LoadingSpinnerModal'

const TeacherPage = () => {
  const { user, logout } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekStart())
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [selectedDayIndex, setSelectedDayIndex] = useState(null)
  const [reportComment, setReportComment] = useState('')
  const [attendanceStats, setAttendanceStats] = useState({
    completed: 0,
    absent: 0,
    warned: 0
  })
  const [lessonsWithReports, setLessonsWithReports] = useState(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingReport, setPendingReport] = useState(null)
  const [showAttendanceConfirmModal, setShowAttendanceConfirmModal] = useState(false)
  const [pendingAttendance, setPendingAttendance] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [recentlySubmitted, setRecentlySubmitted] = useState(new Set())
  const [selectedReport, setSelectedReport] = useState(null)
  const [showReportViewModal, setShowReportViewModal] = useState(false)
  const [recentReports, setRecentReports] = useState([])
  const [activeTab, setActiveTab] = useState('schedule')
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  useEffect(() => {
    console.log('🔍 [TEACHER_PAGE] useEffect triggered with user:', user)
    console.log('🔍 [TEACHER_PAGE] user.teacherId:', user?.teacherId)
    if (user && user.teacherId) {
      console.log('✅ [TEACHER_PAGE] User and teacherId available, making API calls')
      fetchSchedule()
      fetchAttendanceStats()
      fetchExistingReports()
    } else {
      console.log('❌ [TEACHER_PAGE] User or teacherId not available:', { user: !!user, teacherId: user?.teacherId })
    }
  }, [currentWeek, user])

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      console.log('🔍 [TEACHER_PAGE] fetchSchedule called with user:', user)
      console.log('🔍 [TEACHER_PAGE] user.teacherId:', user.teacherId, 'currentWeek:', currentWeek)
      console.log('🔍 [TEACHER_PAGE] user object keys:', Object.keys(user || {}))
      
      if (!user.teacherId) {
        console.error('❌ [TEACHER_PAGE] teacherId is undefined, cannot fetch schedule')
        return
      }
      
      const response = await apiService.getTeacherSchedule(user.teacherId, currentWeek)
      console.log('🔍 [TEACHER_PAGE] Schedule API response:', response)
      if (response.success) {
        console.log('🔍 [TEACHER_PAGE] Setting schedule:', response.schedules)
        setSchedule(response.schedules || [])
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceStats = async () => {
    try {
      console.log('🔍 [TEACHER_PAGE] fetchAttendanceStats called with user:', user)
      console.log('🔍 [TEACHER_PAGE] user.teacherId:', user.teacherId, 'period:', `${currentWeek},${getWeekEnd(currentWeek)}`)
      const response = await apiService.getAttendanceStats(
        user.teacherId,
        null, // studentId - not needed for teacher stats
        `${currentWeek},${getWeekEnd(currentWeek)}`
      )
      if (response.success) {
        setAttendanceStats({
          completed: response.stats.completed_lessons || 0,
          absent: response.stats.absent_lessons || 0,
          warned: response.stats.warned_lessons || 0
        })
      }
    } catch (error) {
      console.error('Error fetching attendance stats:', error)
    }
  }

  const fetchExistingReports = async () => {
    try {
      console.log('🔍 [TEACHER_PAGE] fetchExistingReports called')
      // Fetch reports for the current week range instead of just one date
      const response = await apiService.getReports({
        teacher_id: user.teacherId,
        date_from: currentWeek,
        date_to: getWeekEnd(currentWeek)
      })
      
      console.log('🔍 [TEACHER_PAGE] Reports API response:', response)
      
      if (response.success && response.reports) {
        // We need to match reports to the current week's schedule
        // Since reports can be from different weeks, we'll check if any current week lessons have reports
        const currentWeekReports = response.reports.filter(report => {
          // Handle timezone issues by using the local date directly
          const reportDate = new Date(report.lesson_date)
          const reportDateStr = reportDate.getFullYear() + '-' + 
            String(reportDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(reportDate.getDate()).padStart(2, '0')
          const reportWeekStart = getWeekStart(reportDateStr)
          return reportWeekStart === currentWeek
        })
        
        const reportKeys = currentWeekReports.map(report => {
          // Use the actual lesson date for key generation to avoid collisions
          const reportDate = new Date(report.lesson_date)
          const reportDateStr = reportDate.getFullYear() + '-' + 
            String(reportDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(reportDate.getDate()).padStart(2, '0')
          const key = `${report.student_id}-${reportDateStr}-${report.time_slot}`
          console.log('🔍 [TEACHER_PAGE] Generated report key:', key, 'from report:', report)
          return key
        })
        setLessonsWithReports(new Set(reportKeys))
        setRecentReports(currentWeekReports) // Store reports for viewing
        console.log('🔍 [TEACHER_PAGE] Loaded existing reports for current week:', reportKeys)
      } else {
        console.log('🔍 [TEACHER_PAGE] No reports found or API failed')
      }
    } catch (error) {
      console.error('Error fetching existing reports:', error)
    }
  }

  const getWeekEnd = (weekStart) => {
    const endDate = new Date(weekStart)
    endDate.setDate(endDate.getDate() + 6)
    return endDate.toISOString().split('T')[0]
  }


  const handleWeekChange = (direction) => {
    const currentDate = new Date(currentWeek)
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 7)
    } else {
      currentDate.setDate(currentDate.getDate() + 7)
    }
    setCurrentWeek(getWeekStart(currentDate))
  }

  // Week navigation functions (matching admin implementation)
  const handlePreviousWeek = async () => {
    if (!isTransitioning) {
      setIsTransitioning(true)
      const previousWeek = subtractDays(currentWeek, 7)
      setCurrentWeek(previousWeek)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  const handleNextWeek = async () => {
    if (!isTransitioning) {
      setIsTransitioning(true)
      const nextWeek = addDays(currentWeek, 7)
      setCurrentWeek(nextWeek)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  const handleCurrentWeek = async () => {
    if (!isTransitioning) {
      setIsTransitioning(true)
      const today = new Date()
      const currentWeekStart = getWeekStart(today)
      setCurrentWeek(currentWeekStart)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  const handleMarkAttendance = async (scheduleId, status) => {
    try {
      const response = await apiService.markAttendance(scheduleId, status, new Date().toISOString().split('T')[0])
      if (response.success) {
        fetchSchedule()
        fetchAttendanceStats()
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      alert('Failed to mark attendance')
    }
  }

  const handleAttendanceClick = (scheduleId, status, studentName) => {
    console.log('🔍 [HANDLE_ATTENDANCE_CLICK] Called with:', { scheduleId, status, studentName })
    console.log('🔍 [HANDLE_ATTENDANCE_CLICK] Current modal state before:', showAttendanceConfirmModal)
    setPendingAttendance({ scheduleId, status, studentName })
    setShowAttendanceConfirmModal(true)
    console.log('🔍 [HANDLE_ATTENDANCE_CLICK] Setting modal to true, pending:', { scheduleId, status, studentName })
  }

  const confirmMarkAttendance = async () => {
    if (pendingAttendance) {
      try {
        setIsMarkingAttendance(true)
        await handleMarkAttendance(pendingAttendance.scheduleId, pendingAttendance.status)
        
        // Refresh only the schedule data (component-level refresh)
        await fetchSchedule()
        
        setShowAttendanceConfirmModal(false)
        setPendingAttendance(null)
      } finally {
        setIsMarkingAttendance(false)
      }
    }
  }

  const handleStudentClick = (student, timeSlot, scheduleItem, dayIndex) => {
    console.log('🔍 [HANDLE_STUDENT_CLICK] Called with:', { student, timeSlot, scheduleItem, dayIndex })
    
    // Use the actual lesson date from the schedule, not today's date
    const lessonDate = scheduleItem.week_start_date || currentWeek
    // Use week start date for consistent key generation
    const lessonWeekStart = getWeekStart(lessonDate)
    const lessonKey = `${student.id}-${lessonWeekStart}-${timeSlot}`
    
    console.log('🔍 [HANDLE_STUDENT_CLICK] Checking lesson key:', lessonKey)
    console.log('🔍 [HANDLE_STUDENT_CLICK] Current reports set:', Array.from(lessonsWithReports))
    console.log('🔍 [HANDLE_STUDENT_CLICK] Has report?', lessonsWithReports.has(lessonKey))
    
    if (lessonsWithReports.has(lessonKey)) {
      console.log('🔍 [HANDLE_STUDENT_CLICK] Report already exists, showing alert')
      alert('Report already submitted for this lesson')
      return
    }
    
    console.log('🔍 [HANDLE_STUDENT_CLICK] Setting up report modal with:', { student, timeSlot, dayIndex })
    setSelectedStudent(student)
    setSelectedTimeSlot(timeSlot)
    setSelectedDayIndex(dayIndex)
    setShowReportModal(true)
    console.log('🔍 [HANDLE_STUDENT_CLICK] Report modal should now be visible')
  }

  const handleSubmitReport = () => {
    if (!reportComment.trim()) {
      alert('Please enter a comment')
      return
    }

    // Find the schedule item that matches the selected day and time slot
    const scheduleItem = schedule.find(s => 
      s.student_id === selectedStudent.id && 
      s.time_slot === selectedTimeSlot &&
      s.day_of_week === selectedDayIndex
    )
    
    if (!scheduleItem) {
      alert('Schedule item not found for this day and time slot')
      return
    }
    
    const lessonDate = new Date(scheduleItem.week_start_date)
    lessonDate.setDate(lessonDate.getDate() + scheduleItem.day_of_week)
    const lessonDateStr = lessonDate.getFullYear() + '-' + 
      String(lessonDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(lessonDate.getDate()).padStart(2, '0')

    // Show confirmation dialog
    setPendingReport({
      student_id: selectedStudent.id,
      lesson_date: lessonDateStr,
      time_slot: selectedTimeSlot,
      comment: reportComment
    })
    setShowConfirmModal(true)
  }

  const confirmSubmitReport = async () => {
    try {
      setIsSubmittingReport(true)
      // First, mark the lesson as completed
      const scheduleItem = schedule.find(s => 
        s.student_id === pendingReport.student_id && 
        s.time_slot === pendingReport.time_slot &&
        s.day_of_week === selectedDayIndex
      )
      
      if (scheduleItem) {
        const attendanceResponse = await apiService.markAttendance(
          scheduleItem.id, 
          'completed', 
          new Date().toISOString().split('T')[0]
        )
        
        if (!attendanceResponse.success) {
          alert('Failed to mark attendance')
          return
        }
      }
      
      // Then, save the report
      const response = await apiService.createReport(pendingReport)

      if (response.success) {
        // Mark this lesson as having a report
        // Use the actual lesson date for key generation to avoid collisions
        const lessonKey = `${pendingReport.student_id}-${pendingReport.lesson_date}-${pendingReport.time_slot}`
        console.log('🔍 [CONFIRM_SUBMIT] Adding lesson key to reports set:', lessonKey)
        setLessonsWithReports(prev => {
          const newSet = new Set([...prev, lessonKey])
          console.log('🔍 [CONFIRM_SUBMIT] Updated reports set:', Array.from(newSet))
          return newSet
        })
        
        // Add to recently submitted for animation effect
        setRecentlySubmitted(prev => new Set([...prev, lessonKey]))
        
        // Remove from recently submitted after animation
        setTimeout(() => {
          setRecentlySubmitted(prev => {
            const newSet = new Set(prev)
            newSet.delete(lessonKey)
            return newSet
          })
        }, 2000)
        
        // Refresh only the schedule data (component-level refresh)
        await fetchSchedule()
        
        setShowReportModal(false)
        setShowConfirmModal(false)
        setReportComment('')
        setSelectedStudent(null)
        setSelectedTimeSlot('')
        setSelectedDayIndex(null)
        setPendingReport(null)
        
        // Show success message with better UX
        const successMessage = document.createElement('div')
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 transform transition-all duration-300 ease-out'
        successMessage.style.transform = 'translateX(100%)'
        successMessage.innerHTML = `
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span>Report submitted successfully!</span>
        `
        document.body.appendChild(successMessage)
        
        // Animate in
        setTimeout(() => {
          successMessage.style.transform = 'translateX(0)'
        }, 10)
        
        // Remove success message after 3 seconds with animation
        setTimeout(() => {
          successMessage.style.transform = 'translateX(100%)'
          setTimeout(() => {
            if (successMessage.parentNode) {
              successMessage.parentNode.removeChild(successMessage)
            }
          }, 300)
        }, 3000)
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Failed to submit report')
    } finally {
      setIsSubmittingReport(false)
    }
  }

  const getAttendanceStatus = (schedule) => {
    if (schedule.attendance_status === 'completed') return 'completed'
    if (schedule.attendance_status === 'absent') return 'absent'
    if (schedule.attendance_status === 'absent_warned') return 'absent_warned'
    return 'scheduled'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': 
        return 'bg-green-100 text-green-800'
      case 'absent': 
        return 'bg-red-100 text-red-800'
      case 'absent_warned': 
        return 'bg-yellow-100 text-yellow-800'
      default: 
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Animation variants (matching admin implementation)
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

  const timeSlots = [
    '8:00-8:30', '8:30-9:00', '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00',
    '11:00-11:30', '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
    '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00',
    '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00',
    '20:00-20:30', '20:30-21:00', '21:00-21:30'
  ]

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  // Get week dates and month information (matching admin implementation)
  const weekDates = currentWeek ? getWeekDates(currentWeek) : []
  const currentMonth = getCurrentMonth()
  
  // Determine the target month and year for week numbering
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
  const weekInfo = currentWeek ? getWeekInfoForMonth(currentWeek, targetMonth, targetYear) : null
  const navigationInfo = currentWeek ? getWeekNavigationInfo(currentWeek, targetMonth, targetYear) : null
  
  // Get the month name for the week
  const weekMonth = weekDates.length > 0 ? 
    weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
    currentMonth.name + ' ' + currentMonth.year

  console.log('🔍 [TEACHER_PAGE] Render - schedule state:', schedule, 'type:', typeof schedule, 'isArray:', Array.isArray(schedule))
  console.log('🔍 [TEACHER_PAGE] Render - modal states:', { 
    showReportModal, 
    selectedStudent: !!selectedStudent, 
    showConfirmModal,
    pendingReport: !!pendingReport 
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Teacher Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.teacher_name || user?.username}. Let's talk!</span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 mb-3 sm:mb-4 md:mb-6 overflow-x-auto">
          {[
            { id: 'schedule', label: 'Schedule', shortLabel: 'Schedule' },
            { id: 'files', label: 'Folder', shortLabel: 'Folder' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-3 md:px-4 py-2 sm:py-1.5 md:py-2 rounded text-sm sm:text-sm md:text-base font-medium transition-colors duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6"
              >
                <div className="flex items-center">
                  <div className="p-1 sm:p-2 bg-green-100 rounded-lg">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600 text-xs sm:text-sm md:text-base">✓</div>
                  </div>
                  <div className="ml-2 sm:ml-3 md:ml-4">
                    <p className="text-2xs sm:text-xs md:text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">{attendanceStats.completed}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6"
              >
                <div className="flex items-center">
                  <div className="p-1 sm:p-2 bg-red-100 rounded-lg">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600 text-xs sm:text-sm md:text-base">✗</div>
                  </div>
                  <div className="ml-2 sm:ml-3 md:ml-4">
                    <p className="text-2xs sm:text-xs md:text-sm font-medium text-gray-600">U</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">{attendanceStats.absent}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6"
              >
                <div className="flex items-center">
                  <div className="p-1 sm:p-2 bg-yellow-100 rounded-lg">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-600 text-xs sm:text-sm md:text-base">⚠</div>
                  </div>
                  <div className="ml-2 sm:ml-3 md:ml-4">
                    <p className="text-2xs sm:text-xs md:text-sm font-medium text-gray-600">UI</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">{attendanceStats.warned}</p>
                  </div>
                </div>
              </motion.div>
            </div>

        {/* Schedule Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {/* Week Navigation */}
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Weekly Schedule</h2>
              
              
              {/* Week Navigation */}
              <motion.div 
                className="flex items-center justify-center sm:justify-end space-x-1 sm:space-x-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                  <motion.button
                    onClick={handlePreviousWeek}
                    disabled={isTransitioning}
                    className="p-1.5 sm:p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Week"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.svg 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" 
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
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      navigationInfo?.isCurrentWeek 
                        ? 'bg-blue-500 text-white' 
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
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
                    className="p-1.5 sm:p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Week"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.svg 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" 
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
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentWeek}
                variants={tableVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <table className="w-full table-fixed">
              <thead className="bg-neutral-50">
                {/* Month and Year Row */}
                <tr>
                  <th className="px-1 sm:px-2 md:px-4 py-1 sm:py-2 text-left text-xs sm:text-sm font-semibold text-neutral-800 w-12 sm:w-16 md:w-24"></th>
                  <th colSpan="7" className="px-1 sm:px-2 md:px-4 py-1 sm:py-2 text-center text-sm sm:text-base md:text-lg font-bold text-neutral-800">
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
                  <th className="px-1 sm:px-2 md:px-4 py-1 sm:py-2 text-left text-2xs sm:text-xs md:text-sm font-medium text-neutral-700 w-10 sm:w-12 md:w-16">Time</th>
                  {days.map((day, index) => {
                    const dayInfo = weekInfo?.days?.[index]
                    const isCurrentMonth = dayInfo?.isCurrentMonth ?? true
                    const isEditable = dayInfo?.isEditable ?? true
                    
                    return (
                      <motion.th 
                        key={`${day}-${currentWeek}`}
                        className={`px-1 sm:px-2 md:px-4 py-1 sm:py-2 text-center font-medium min-w-0 ${
                          isCurrentMonth 
                            ? 'text-neutral-700' 
                            : 'text-neutral-400 bg-neutral-100'
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <div className="flex flex-col min-w-0">
                          <div className={`font-semibold text-2xs sm:text-xs md:text-sm truncate ${!isCurrentMonth ? 'opacity-50' : ''}`}>
                            {day}
                          </div>
                          {weekDates.length > index && (
                            <motion.div 
                              className={`text-2xs sm:text-xs mt-0.5 sm:mt-1 truncate ${isCurrentMonth ? 'text-neutral-500' : 'text-neutral-400'}`}
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
              <tbody className="bg-white divide-y divide-neutral-200">
                {timeSlots.map((timeSlot, timeIndex) => (
                  <motion.tr 
                    key={timeSlot} 
                    className="border-b border-neutral-100"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: timeIndex * 0.02 }}
                  >
                    <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-2 text-2xs sm:text-xs md:text-sm text-neutral-600 font-medium">
                      {timeSlot}
                    </td>
                    {days.map((day, dayIndex) => {
                      const daySchedule = (schedule || []).filter(s => 
                        s.day_of_week === dayIndex && s.time_slot === timeSlot
                      )
                      const dayInfo = weekInfo?.days?.[dayIndex]
                      const isCurrentMonth = dayInfo?.isCurrentMonth ?? true
                      const isEditable = dayInfo?.isEditable ?? true
                      
                      return (
                        <motion.td 
                          key={`${day}-${timeSlot}`}
                          className={`px-1 sm:px-2 py-1 h-10 sm:h-12 md:h-14 relative ${!isCurrentMonth ? 'bg-neutral-50' : ''}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: (timeIndex * 0.02) + (dayIndex * 0.01) }}
                        >
                          <AnimatePresence mode="wait">
                            {daySchedule.length > 0 ? daySchedule.map((scheduleItem) => {
                            const status = getAttendanceStatus(scheduleItem)
                            // Calculate the actual lesson date from week start + day of week
                            const lessonDate = new Date(scheduleItem.week_start_date)
                            lessonDate.setDate(lessonDate.getDate() + scheduleItem.day_of_week)
                            const lessonDateStr = lessonDate.getFullYear() + '-' + 
                              String(lessonDate.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(lessonDate.getDate()).padStart(2, '0')
                            const lessonKey = `${scheduleItem.student_id}-${lessonDateStr}-${timeSlot}`
                            const hasReport = lessonsWithReports.has(lessonKey)
                            const isRecentlySubmitted = recentlySubmitted.has(lessonKey)
                            const isMarked = hasReport || status === 'completed' || status === 'absent' || status === 'absent_warned'
                            
                            return (
                              <motion.div
                                key={scheduleItem.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ 
                                  opacity: isMarked ? 0.7 : 1, 
                                  scale: isRecentlySubmitted ? 1.05 : 1,
                                  boxShadow: isRecentlySubmitted ? '0 0 20px rgba(34, 197, 94, 0.4)' : undefined
                                }}
                                transition={{ 
                                  duration: 0.3, 
                                  ease: "easeOut",
                                  scale: { duration: 0.6, ease: "easeInOut" }
                                }}
                                className={`p-1 rounded-lg text-2xs font-medium text-center transition-all duration-200 ${
                                  isMarked 
                                    ? 'cursor-pointer border-2 border-green-200 hover:bg-gray-200' 
                                    : 'cursor-pointer hover:shadow-lg hover:scale-105'
                                } ${isRecentlySubmitted ? 'ring-2 ring-green-400 ring-opacity-50' : ''} ${getStatusColor(status)}`}
                                onClick={() => {
                                  if (isMarked) {
                                    // Find the report for this lesson
                                    const report = recentReports.find(r => {
                                      const reportDate = new Date(r.lesson_date)
                                      const reportDateStr = reportDate.getFullYear() + '-' + 
                                        String(reportDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                        String(reportDate.getDate()).padStart(2, '0')
                                      const reportKey = `${r.student_id}-${reportDateStr}-${r.time_slot}`
                                      return reportKey === lessonKey
                                    })
                                    if (report) {
                                      setSelectedReport(report)
                                      setShowReportViewModal(true)
                                    }
                                  } else {
                                    // Open report modal for completion
                                    handleStudentClick(
                                      {
                                        id: scheduleItem.student_id,
                                        name: scheduleItem.student_name
                                      },
                                      timeSlot,
                                      scheduleItem,
                                      dayIndex
                                    )
                                  }
                                }}
                              >
                                <div className="font-medium text-2xs sm:text-xs flex items-center justify-between">
                                  <span className={`truncate ${isMarked ? 'text-gray-500' : ''}`}>{scheduleItem.student_name}</span>
                                  {isMarked && (
                                    <motion.span 
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ 
                                        opacity: 1, 
                                        scale: isRecentlySubmitted ? [1, 1.1, 1] : 1,
                                        backgroundColor: isRecentlySubmitted ? 
                                          (status === 'completed' ? '#10b981' : 
                                           status === 'absent' ? '#ef4444' : 
                                           status === 'absent_warned' ? '#eab308' : '#3b82f6') : 
                                          (status === 'completed' ? '#10b981' : 
                                           status === 'absent' ? '#ef4444' : 
                                           status === 'absent_warned' ? '#eab308' : '#3b82f6')
                                      }}
                                      transition={{ 
                                        delay: 0.2, 
                                        duration: 0.3,
                                        scale: isRecentlySubmitted ? { 
                                          duration: 0.8, 
                                          repeat: 2, 
                                          ease: "easeInOut" 
                                        } : { duration: 0.3 }
                                      }}
                                      className={`text-2xs sm:text-xs text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold shadow-sm ${
                                        status === 'completed' ? 'bg-green-500' :
                                        status === 'absent' ? 'bg-red-500' :
                                        status === 'absent_warned' ? 'bg-yellow-500' :
                                        'bg-blue-500'
                                      } ${isRecentlySubmitted ? 'animate-pulse' : ''}`}
                                    >
                                      {status === 'completed' ? <span className="text-xs">✓</span> : 
                                       status === 'absent' ? <span className="text-xs">✗</span> : 
                                       status === 'absent_warned' ? <span className="text-xs">⚠</span> : 
                                       <span className="text-xs" style={{fontSize: '10px'}}>✓</span>}
                                    </motion.span>
                                  )}
                                </div>
                                <div className="flex flex-col md:flex-row space-y-0.5 md:space-y-0 md:space-x-1 mt-0.5">
                                  <div className="flex space-x-0.5">
                                    <motion.button
                                      whileHover={!isMarked ? { scale: 1.05 } : {}}
                                      whileTap={!isMarked ? { scale: 0.95 } : {}}
                                      onClick={(e) => {
                                        if (isMarked) return
                                        e.stopPropagation()
                                        // Open report modal for completion
                                        handleStudentClick(
                                          {
                                            id: scheduleItem.student_id,
                                            name: scheduleItem.student_name
                                          },
                                          timeSlot,
                                          scheduleItem,
                                          dayIndex
                                        )
                                      }}
                                      disabled={isMarked}
                                      className={`px-0.5 py-0.5 md:px-2 md:py-1 rounded text-xs transition-all duration-200 ${
                                        isMarked 
                                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                          : status === 'completed' 
                                            ? 'bg-green-200 text-green-800 hover:bg-green-300' 
                                            : 'bg-gray-200 text-gray-600 hover:bg-green-200 hover:text-green-800'
                                      }`}
                                    >
                                      <span className="text-xs md:text-sm" style={{fontSize: '10px'}}>✓</span>
                                    </motion.button>
                                    <motion.button
                                      whileHover={!isMarked ? { scale: 1.05 } : {}}
                                      whileTap={!isMarked ? { scale: 0.95 } : {}}
                                      onClick={(e) => {
                                        console.log('🔍 [ABSENT_BUTTON_CLICK] Button clicked! isMarked:', isMarked, 'scheduleId:', scheduleItem.id)
                                        if (isMarked) {
                                          console.log('🔍 [ABSENT_BUTTON_CLICK] Returning early because isMarked=true')
                                          return
                                        }
                                        e.stopPropagation()
                                        console.log('🔍 [ABSENT_BUTTON_CLICK] Calling handleAttendanceClick')
                                        handleAttendanceClick(scheduleItem.id, 'absent', scheduleItem.student_name)
                                      }}
                                      disabled={isMarked}
                                      className={`px-0.5 py-0.5 md:px-2 md:py-1 rounded text-xs transition-all duration-200 ${
                                        isMarked 
                                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                          : status === 'absent' 
                                            ? 'bg-red-200 text-red-800 hover:bg-red-300' 
                                            : 'bg-gray-200 text-gray-600 hover:bg-red-200 hover:text-red-800'
                                      }`}
                                    >
                                      <span className="text-xs md:text-sm" style={{fontSize: '10px'}}>✗</span>
                                    </motion.button>
                                  </div>
                                  <motion.button
                                    whileHover={!isMarked ? { scale: 1.05 } : {}}
                                    whileTap={!isMarked ? { scale: 0.95 } : {}}
                                    onClick={(e) => {
                                      if (isMarked) return
                                      e.stopPropagation()
                                      handleAttendanceClick(scheduleItem.id, 'absent_warned', scheduleItem.student_name)
                                    }}
                                    disabled={isMarked}
                                    className={`px-0.5 py-0.5 md:px-2 md:py-1 rounded text-xs transition-all duration-200 ${
                                      isMarked 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                        : status === 'absent_warned' 
                                          ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300' 
                                          : 'bg-gray-200 text-gray-600 hover:bg-yellow-200 hover:text-yellow-800'
                                    }`}
                                  >
                                    <span className="text-xs md:text-sm" style={{fontSize: '10px'}}>⚠</span>
                                  </motion.button>
                                </div>
                              </motion.div>
                            )
                            }) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-300 hover:text-neutral-400 transition-colors duration-200">
                                <span className="text-2xs sm:text-xs font-light">—</span>
                              </div>
                            )}
                          </AnimatePresence>
                        </motion.td>
                      )
                    })}
                  </motion.tr>
                ))}
              </tbody>
              </table>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
          </>
        )}

        {activeTab === 'files' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <FileLibrary />
          </motion.div>
        )}

        {/* Report Modal */}
        {console.log('🔍 [RENDER] Report modal check:', { showReportModal, selectedStudent: !!selectedStudent })}
        {showReportModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
            >
              <h3 className="text-lg font-semibold mb-4">
                Complete Lesson - {selectedStudent?.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Slot
                  </label>
                  <input
                    type="text"
                    value={selectedTimeSlot}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comment
                  </label>
                  <textarea
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your lesson report comment..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReport}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Confirmation Modal */}
        <LoadingSpinnerModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false)
            setPendingReport(null)
          }}
          title="Confirm Lesson Completion"
          loading={isSubmittingReport}
          loadingText="Submitting..."
          confirmText="Complete Lesson"
          confirmButtonColor="bg-green-600 hover:bg-green-700"
          onConfirm={confirmSubmitReport}
        >
          <p className="text-gray-700">
            Are you sure you want to complete this lesson and submit the report? This will mark the lesson as completed and save the report.
          </p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p><strong>Student:</strong> {selectedStudent?.name}</p>
            <p><strong>Time Slot:</strong> {pendingReport?.time_slot}</p>
            <p><strong>Date:</strong> {pendingReport?.lesson_date}</p>
            <p><strong>Comment:</strong> {pendingReport?.comment}</p>
          </div>
        </LoadingSpinnerModal>

        {/* Attendance Confirmation Modal */}
        {console.log('🔍 [MODAL_RENDER] showAttendanceConfirmModal:', showAttendanceConfirmModal, 'pendingAttendance:', pendingAttendance)}
        <LoadingSpinnerModal
          isOpen={showAttendanceConfirmModal}
          onClose={() => {
            setShowAttendanceConfirmModal(false)
            setPendingAttendance(null)
          }}
          title="Confirm Attendance Marking"
          loading={isMarkingAttendance}
          loadingText="Marking..."
          confirmText={`Mark as ${pendingAttendance?.status === 'absent' ? 'U' : pendingAttendance?.status === 'absent_warned' ? 'UI' : pendingAttendance?.status?.replace('_', ' ').toUpperCase()}`}
          confirmButtonColor={pendingAttendance?.status === 'absent' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
          onConfirm={confirmMarkAttendance}
        >
          <p className="text-gray-700">
            Are you sure you want to mark this lesson as <strong>{pendingAttendance?.status === 'absent' ? 'U' : pendingAttendance?.status === 'absent_warned' ? 'UI' : pendingAttendance?.status?.replace('_', ' ').toUpperCase()}</strong>?
          </p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p><strong>Student:</strong> {pendingAttendance?.studentName}</p>
            <p><strong>Status:</strong> {pendingAttendance?.status === 'absent' ? 'U' : pendingAttendance?.status === 'absent_warned' ? 'UI' : pendingAttendance?.status?.replace('_', ' ').toUpperCase()}</p>
          </div>
        </LoadingSpinnerModal>

        {/* Report View Modal */}
        {showReportViewModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-neutral-800">Your Lesson Report</h3>
                  <button
                    onClick={() => setShowReportViewModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Student</label>
                      <p className="text-lg font-semibold text-neutral-800">{selectedReport.student_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Time Slot</label>
                      <p className="text-lg font-semibold text-neutral-800">{selectedReport.time_slot}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Lesson Date</label>
                    <p className="text-neutral-800">{new Date(selectedReport.lesson_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Submitted At</label>
                    <p className="text-neutral-800">{new Date(selectedReport.created_at).toLocaleString('en-US', {
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}</p>
                  </div>
                  
                  {selectedReport.comment && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Your Comment</label>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-neutral-800 whitespace-pre-wrap">{selectedReport.comment}</p>
                      </div>
                    </div>
                  )}
                  
                  {!selectedReport.comment && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No comment provided for this lesson.</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowReportViewModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}

export default TeacherPage