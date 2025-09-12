import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import apiService from '../utils/api'
import { getCurrentWeekStart, getWeekEnd, getWeekStart, getWeekDates, formatDate, getCurrentMonth, addDays, subtractDays, getWeekInfoForMonth, getWeekNavigationInfo } from '../utils/dateUtils'

const TeacherPage = () => {
  const { user, logout } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekStart())
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [reportComment, setReportComment] = useState('')
  const [attendanceStats, setAttendanceStats] = useState({
    completed: 0,
    absent: 0,
    scheduled: 0,
    attendance_rate: 0
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
        setAttendanceStats(response.stats)
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
          // Use the same timezone-safe approach for key generation
          const reportDate = new Date(report.lesson_date)
          const reportDateStr = reportDate.getFullYear() + '-' + 
            String(reportDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(reportDate.getDate()).padStart(2, '0')
          const reportWeekStart = getWeekStart(reportDateStr)
          const key = `${report.student_id}-${reportWeekStart}-${report.time_slot}`
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
    setPendingAttendance({ scheduleId, status, studentName })
    setShowAttendanceConfirmModal(true)
  }

  const confirmMarkAttendance = async () => {
    if (pendingAttendance) {
      await handleMarkAttendance(pendingAttendance.scheduleId, pendingAttendance.status)
      setShowAttendanceConfirmModal(false)
      setPendingAttendance(null)
    }
  }

  const handleStudentClick = (student, timeSlot, scheduleItem) => {
    console.log('🔍 [HANDLE_STUDENT_CLICK] Called with:', { student, timeSlot, scheduleItem })
    
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
    
    console.log('🔍 [HANDLE_STUDENT_CLICK] Setting up report modal with:', { student, timeSlot })
    setSelectedStudent(student)
    setSelectedTimeSlot(timeSlot)
    setShowReportModal(true)
    console.log('🔍 [HANDLE_STUDENT_CLICK] Report modal should now be visible')
  }

  const handleSubmitReport = () => {
    if (!reportComment.trim()) {
      alert('Please enter a comment')
      return
    }

    // Use the current week as the lesson date (since lessons are scheduled for the week)
    const lessonDate = currentWeek

    // Show confirmation dialog
    setPendingReport({
      student_id: selectedStudent.id,
      lesson_date: lessonDate,
      time_slot: selectedTimeSlot,
      comment: reportComment
    })
    setShowConfirmModal(true)
  }

  const confirmSubmitReport = async () => {
    try {
      // First, mark the lesson as completed
      const scheduleItem = schedule.find(s => 
        s.student_id === pendingReport.student_id && 
        s.time_slot === pendingReport.time_slot
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
        // Use the same date format as the lesson key in render (week_start_date)
        // Use the actual lesson date's week start for consistent key generation
        const lessonWeekStart = getWeekStart(pendingReport.lesson_date)
        const lessonKey = `${pendingReport.student_id}-${lessonWeekStart}-${pendingReport.time_slot}`
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
        
        // Refresh the schedule to show updated status
        fetchSchedule()
        
        setShowReportModal(false)
        setShowConfirmModal(false)
        setReportComment('')
        setSelectedStudent(null)
        setSelectedTimeSlot('')
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
      case 'completed': return 'bg-green-100 text-green-800'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'absent_warned': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="w-6 h-6 text-green-600">✓</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{attendanceStats.completed}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <div className="w-6 h-6 text-red-600">✗</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-semibold text-gray-900">{attendanceStats.absent}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <div className="w-6 h-6 text-gray-600">⏰</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-semibold text-gray-900">{attendanceStats.scheduled}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <div className="w-6 h-6 text-blue-600">📊</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{attendanceStats.attendance_rate}%</p>
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
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
                
                {/* Week Navigation */}
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.button
                    onClick={handlePreviousWeek}
                    disabled={isTransitioning}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Week"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.svg 
                      className="w-4 h-4 text-gray-600" 
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
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Week"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.svg 
                      className="w-4 h-4 text-gray-600" 
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
                <table className="w-full">
              <thead className="bg-gray-50">
                {/* Month and Year Row */}
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-800 w-24"></th>
                  <th colSpan="7" className="px-4 py-2 text-center text-lg font-bold text-gray-800">
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-24">Time</th>
                  {days.map((day, index) => {
                    const dayInfo = weekInfo?.days?.[index]
                    const isCurrentMonth = dayInfo?.isCurrentMonth ?? true
                    const isEditable = dayInfo?.isEditable ?? true
                    
                    return (
                      <motion.th 
                        key={`${day}-${currentWeek}`}
                        className={`px-4 py-3 text-center text-sm font-medium min-w-[120px] ${
                          isCurrentMonth 
                            ? 'text-gray-700' 
                            : 'text-gray-400 bg-gray-100'
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
                              className={`text-xs mt-1 ${isCurrentMonth ? 'text-gray-500' : 'text-gray-400'}`}
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
              <tbody className="bg-white divide-y divide-gray-200">
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {timeSlot}
                    </td>
                    {days.map((day, dayIndex) => {
                      const daySchedule = (schedule || []).filter(s => 
                        s.day_of_week === dayIndex && s.time_slot === timeSlot
                      )
                      return (
                        <td key={`${day}-${timeSlot}`} className="px-4 py-3">
                          {daySchedule.map((scheduleItem) => {
                            const status = getAttendanceStatus(scheduleItem)
                            // Use the current week being displayed, not the database week
                            const lessonWeekStart = currentWeek
                            const lessonKey = `${scheduleItem.student_id}-${lessonWeekStart}-${timeSlot}`
                            const hasReport = lessonsWithReports.has(lessonKey)
                            const isRecentlySubmitted = recentlySubmitted.has(lessonKey)
                            
                            return (
                              <motion.div
                                key={scheduleItem.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ 
                                  opacity: hasReport ? 0.7 : 1, 
                                  scale: isRecentlySubmitted ? 1.05 : 1,
                                  backgroundColor: hasReport ? '#f3f4f6' : undefined,
                                  boxShadow: isRecentlySubmitted ? '0 0 20px rgba(34, 197, 94, 0.4)' : undefined
                                }}
                                transition={{ 
                                  duration: 0.3, 
                                  ease: "easeOut",
                                  scale: { duration: 0.6, ease: "easeInOut" }
                                }}
                                className={`p-2 rounded-lg transition-all duration-300 ${
                                  hasReport 
                                    ? 'bg-gray-100 cursor-pointer border-2 border-green-200 hover:bg-gray-200' 
                                    : 'cursor-pointer hover:shadow-lg hover:scale-105'
                                } ${isRecentlySubmitted ? 'ring-2 ring-green-400 ring-opacity-50' : ''} ${getStatusColor(status)}`}
                                onClick={() => {
                                  if (hasReport) {
                                    // Find the report for this lesson
                                    const report = recentReports.find(r => {
                                      const reportDate = new Date(r.lesson_date)
                                      const reportDateStr = reportDate.getFullYear() + '-' + 
                                        String(reportDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                        String(reportDate.getDate()).padStart(2, '0')
                                      const reportWeekStart = getWeekStart(reportDateStr)
                                      const reportKey = `${r.student_id}-${reportWeekStart}-${r.time_slot}`
                                      return reportKey === lessonKey
                                    })
                                    if (report) {
                                      setSelectedReport(report)
                                      setShowReportViewModal(true)
                                    }
                                  }
                                }}
                              >
                                <div className="font-medium text-sm flex items-center justify-between">
                                  <span className={hasReport ? 'text-gray-500' : ''}>{scheduleItem.student_name}</span>
                                  {hasReport && (
                                    <motion.span 
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ 
                                        opacity: 1, 
                                        scale: isRecentlySubmitted ? [1, 1.1, 1] : 1,
                                        backgroundColor: isRecentlySubmitted ? '#10b981' : '#10b981'
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
                                      className={`text-xs text-white px-2 py-1 rounded-full font-semibold shadow-sm ${
                                        isRecentlySubmitted ? 'animate-pulse' : ''
                                      }`}
                                    >
                                      ✓ REPORTED
                                    </motion.span>
                                  )}
                                </div>
                                <div className="flex space-x-1 mt-1">
                                  <motion.button
                                    whileHover={!hasReport ? { scale: 1.05 } : {}}
                                    whileTap={!hasReport ? { scale: 0.95 } : {}}
                                    onClick={(e) => {
                                      if (hasReport) return
                                      e.stopPropagation()
                                      // Open report modal for completion
                                      setSelectedStudent({
                                        id: scheduleItem.student_id,
                                        name: scheduleItem.student_name
                                      })
                                      setSelectedTimeSlot(timeSlot)
                                      setShowReportModal(true)
                                    }}
                                    disabled={hasReport}
                                    className={`text-xs px-2 py-1 rounded transition-all duration-200 ${
                                      hasReport 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                        : status === 'completed' 
                                          ? 'bg-green-200 text-green-800 hover:bg-green-300' 
                                          : 'bg-gray-200 text-gray-600 hover:bg-green-200 hover:text-green-800'
                                    }`}
                                  >
                                    ✓
                                  </motion.button>
                                  <motion.button
                                    whileHover={!hasReport ? { scale: 1.05 } : {}}
                                    whileTap={!hasReport ? { scale: 0.95 } : {}}
                                    onClick={(e) => {
                                      if (hasReport) return
                                      e.stopPropagation()
                                      handleAttendanceClick(scheduleItem.id, 'absent', scheduleItem.student_name)
                                    }}
                                    disabled={hasReport}
                                    className={`text-xs px-2 py-1 rounded transition-all duration-200 ${
                                      hasReport 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                        : status === 'absent' 
                                          ? 'bg-red-200 text-red-800 hover:bg-red-300' 
                                          : 'bg-gray-200 text-gray-600 hover:bg-red-200 hover:text-red-800'
                                    }`}
                                  >
                                    ✗
                                  </motion.button>
                                  <motion.button
                                    whileHover={!hasReport ? { scale: 1.05 } : {}}
                                    whileTap={!hasReport ? { scale: 0.95 } : {}}
                                    onClick={(e) => {
                                      if (hasReport) return
                                      e.stopPropagation()
                                      handleAttendanceClick(scheduleItem.id, 'absent_warned', scheduleItem.student_name)
                                    }}
                                    disabled={hasReport}
                                    className={`text-xs px-2 py-1 rounded transition-all duration-200 ${
                                      hasReport 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                        : status === 'absent_warned' 
                                          ? 'bg-orange-200 text-orange-800 hover:bg-orange-300' 
                                          : 'bg-gray-200 text-gray-600 hover:bg-orange-200 hover:text-orange-800'
                                    }`}
                                  >
                                    ⚠
                                  </motion.button>
                                </div>
                              </motion.div>
                            )
                          })}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              </table>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

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
        {showConfirmModal && pendingReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
            >
              <h3 className="text-lg font-semibold mb-4 text-green-600">
                Confirm Lesson Completion
              </h3>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Are you sure you want to complete this lesson and submit the report? This will mark the lesson as completed and save the report.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p><strong>Student:</strong> {selectedStudent?.name}</p>
                  <p><strong>Time Slot:</strong> {pendingReport.time_slot}</p>
                  <p><strong>Date:</strong> {pendingReport.lesson_date}</p>
                  <p><strong>Comment:</strong> {pendingReport.comment}</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowConfirmModal(false)
                      setPendingReport(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSubmitReport}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Complete Lesson
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Attendance Confirmation Modal */}
        {showAttendanceConfirmModal && pendingAttendance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
            >
              <h3 className="text-lg font-semibold mb-4 text-red-600">
                Confirm Attendance Marking
              </h3>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Are you sure you want to mark this lesson as <strong>{pendingAttendance.status.replace('_', ' ').toUpperCase()}</strong>?
                </p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p><strong>Student:</strong> {pendingAttendance.studentName}</p>
                  <p><strong>Status:</strong> {pendingAttendance.status.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowAttendanceConfirmModal(false)
                      setPendingAttendance(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmMarkAttendance}
                    className={`flex-1 px-4 py-2 text-white rounded-lg ${
                      pendingAttendance.status === 'absent' 
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    Mark as {pendingAttendance.status.replace('_', ' ').toUpperCase()}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

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