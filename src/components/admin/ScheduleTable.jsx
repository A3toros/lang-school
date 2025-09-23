import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'
import { getWeekDates, formatDate, getCurrentMonth, addDays, subtractDays, getWeekInfoForMonth, getWeekNavigationInfo, getCurrentWeekStart } from '../../utils/dateUtils'
import draftManager from '../../utils/draftManager'
import SaveWarningModal from '../common/SaveWarningModal'
import StudentSelectionModal from './StudentSelectionModal'
import SuccessNotification from '../common/SuccessNotification'

const ScheduleTable = ({ teacherId, weekStart, onWeekChange }) => {
  console.log('🔍 [ScheduleTable] Received weekStart prop:', weekStart)
  console.log('🔍 [ScheduleTable] Expected current week:', getCurrentWeekStart())
  
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  
  // Debug logging for editMode changes
  useEffect(() => {
    console.log('🔍 [EDIT_MODE] State changed to:', editMode)
  }, [editMode])
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Enhanced input functionality
  const [availableStudents, setAvailableStudents] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [studentInput, setStudentInput] = useState('')
  const [filteredStudents, setFilteredStudents] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showFutureLessonConfirm, setShowFutureLessonConfirm] = useState(false)
  const [futureLessonData, setFutureLessonData] = useState(null)
  const [showLessonReport, setShowLessonReport] = useState(false)
  const [lessonReportData, setLessonReportData] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAutofillTip, setShowAutofillTip] = useState(false)
  const [autofillStudent, setAutofillStudent] = useState(null)
  const [autofillTimeout, setAutofillTimeout] = useState(null)
  
  // Draft mode state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showSaveWarning, setShowSaveWarning] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  
  // Notification state
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'success' })
  const [isSaving, setIsSaving] = useState(false)
  
  // Helper function to show notifications
  const showNotificationMessage = (title, message, type = 'success') => {
    setNotificationData({ title, message, type })
    setShowNotification(true)
  }
  const [originalSchedule, setOriginalSchedule] = useState([])

  useEffect(() => {
    if (teacherId) {
      fetchSchedule()
      fetchAvailableStudents()
    } else {
      setLoading(false)
    }
  }, [teacherId, weekStart])

  // Cleanup autofill timeout on unmount
  useEffect(() => {
    return () => {
      if (autofillTimeout) {
        clearTimeout(autofillTimeout)
      }
    }
  }, [autofillTimeout])

  const fetchSchedule = async () => {
    try {
      console.log('🔍 [FETCH_SCHEDULE] Starting fetch for teacherId:', teacherId, 'weekStart:', weekStart)
      setLoading(true)
      const response = await apiService.getTeacherSchedule(teacherId, weekStart)
      console.log('🔍 [FETCH_SCHEDULE] API response:', response)
      const originalData = response.schedules || []
      console.log('🔍 [FETCH_SCHEDULE] Original data:', originalData)
      
      // Store original schedule
      setOriginalSchedule(originalData)
      
      // Apply draft changes if any
      const scheduleWithDraft = draftManager.applyDraftToSchedule(originalData, teacherId, weekStart)
      console.log('🔍 [FETCH_SCHEDULE] Schedule with draft:', scheduleWithDraft)
      setSchedule(scheduleWithDraft)
      
      // Check if there are unsaved changes
      const hasChanges = draftManager.hasUnsavedChanges()
      setHasUnsavedChanges(hasChanges)
      
    } catch (err) {
      setError('Failed to load schedule')
      console.error('❌ [FETCH_SCHEDULE] Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableStudents = async () => {
    try {
      if (!teacherId) {
        return
      }
      
      // Get ALL active students for scheduling (any teacher can schedule any student)
      const allStudentsResponse = await apiService.getStudents({ 
        status: 'active', 
        limit: 100 
      })
      
      console.log('📊 [FETCH_STUDENTS] All students response:', allStudentsResponse)
      
      const availableStudentsList = []
      
      // Add all active students
      if (allStudentsResponse.success && allStudentsResponse.students) {
        availableStudentsList.push(...allStudentsResponse.students)
      }
      setAvailableStudents(availableStudentsList)
    } catch (err) {
      console.error('Error fetching available students:', err)
      // Show user-friendly error message
      alert('Failed to load students. Please refresh the page and try again.')
    }
  }

  // Enhanced input functionality with debouncing
  const filterStudents = (input) => {
    // Clear existing timeout
    if (autofillTimeout) {
      clearTimeout(autofillTimeout)
      setAutofillTimeout(null)
    }
    
    if (!input.trim()) {
      setFilteredStudents([])
      setShowSuggestions(false)
      setShowAutofillTip(false)
      setAutofillStudent(null)
      setSelectedStudent(null)
      return
    }
    
    const filtered = availableStudents.filter(student =>
      student.name.toLowerCase().startsWith(input.toLowerCase().trim())
    )
    
    setFilteredStudents(filtered)
    setShowSuggestions(true)
    
    // Auto-fill if 3 or fewer students found - with debouncing
    // Only show autofill if user has typed something (not empty input)
    if (filtered.length <= 3 && filtered.length > 0 && input.trim().length > 0) {
      const firstStudent = filtered[0]
      console.log('🎯 [AUTOFILL] Showing tip for:', firstStudent.name, 'Input:', input)
      setSelectedStudent(firstStudent)
      setShowSuggestions(false)
      setShowAutofillTip(true)
      setAutofillStudent(firstStudent)
      
      // Hide tip after 5 seconds (increased from 3)
      const timeout = setTimeout(() => {
        console.log('⏰ [AUTOFILL] Hiding tip after timeout')
        setShowAutofillTip(false)
        setAutofillStudent(null)
        setSelectedStudent(null)
      }, 5000)
      
      setAutofillTimeout(timeout)
    } else {
      console.log('❌ [AUTOFILL] No tip - filtered.length:', filtered.length)
      setShowAutofillTip(false)
      setAutofillStudent(null)
      setSelectedStudent(null)
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


  const handleCellDoubleClick = (dayIndex, timeSlot) => {
    console.log('🔍 [DOUBLE_CLICK] editMode:', editMode, 'dayIndex:', dayIndex, 'timeSlot:', timeSlot)
    
    // Check if there's already a student in this slot (including deleted ones)
    const existingSchedule = getAllItemsForSlot(dayIndex, timeSlot)
    console.log('🔍 [DOUBLE_CLICK] existingSchedule:', existingSchedule)
    
    if (existingSchedule) {
      if (existingSchedule.is_deleted) {
        // Don't allow actions on deleted items
        return
      }
      
      if (editMode) {
        console.log('🔍 [DOUBLE_CLICK] Edit mode - calling handleDeleteLesson')
        // If in edit mode, delete the student
        handleDeleteLesson(existingSchedule)
      } else {
        console.log('🔍 [DOUBLE_CLICK] Read mode - calling fetchLessonReport')
        // If in read mode, show lesson report
        fetchLessonReport(existingSchedule)
      }
    } else {
      if (!editMode) return // Only allow adding students in edit mode
      // If empty, add a student
      const cellKey = `${dayIndex}-${timeSlot}`
      setEditingCell(cellKey)
      setStudentInput('')
      setSelectedStudent(null)
      setShowSuggestions(false)
      setShowAutofillTip(false)
      setAutofillStudent(null)
      
      // Fetch available students for this teacher
      if (teacherId) {
      }
      
      // Focus input after state update
      setTimeout(() => {
        const input = document.getElementById(`student-input-${cellKey}`)
        if (input) input.focus()
      }, 0)
    }
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
    if (teacherId) {
    }
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

  const handleStudentSelect = (student) => {
    console.log('🔍 [HANDLE_STUDENT_SELECT] Selected student:', student)
    
    if (!selectedTimeSlot) {
      console.log('❌ [HANDLE_STUDENT_SELECT] No time slot selected')
      return
    }
    
    // Use the existing function with the selected student and time slot
    handleAddStudentToSchedule(student, null, selectedTimeSlot)
  }

  const handleAddStudentToSchedule = async (student = null, dayIndex = null, timeSlot = null) => {
    console.log('🔍 [HANDLE_ADD_STUDENT] Called with:', {
      student: student?.name,
      dayIndex,
      timeSlot,
      selectedStudentId,
      selectedTimeSlot
    })
    
    const studentToUse = student
    const timeSlotToUse = timeSlot || selectedTimeSlot
    
    console.log('🔍 [HANDLE_ADD_STUDENT] Using:', {
      studentToUse: studentToUse?.name,
      timeSlotToUse
    })
    
    if (!studentToUse || !timeSlotToUse) {
      console.log('❌ [HANDLE_ADD_STUDENT] Missing required data:', {
        hasStudent: !!studentToUse,
        hasTimeSlot: !!timeSlotToUse
      })
      return
    }

    try {
      const dayNumber = dayIndex !== null ? dayIndex : getDayNumber(timeSlotToUse.day)
      console.log('🔍 [HANDLE_ADD_STUDENT] dayNumber:', dayNumber, 'timeSlotToUse:', timeSlotToUse)
      
      // Add to draft instead of directly to database
      const lessonData = {
        teacherId: teacherId,
        studentId: studentToUse.id,
        studentName: studentToUse.name,
        dayOfWeek: dayNumber,
        timeSlot: timeSlotToUse.time || timeSlotToUse,
        weekStart: weekStart
      }
      
      console.log('🔍 [HANDLE_ADD_STUDENT] Adding to draft:', lessonData)
      const draftResult = draftManager.addLesson(lessonData)
      console.log('🔍 [HANDLE_ADD_STUDENT] Draft result:', draftResult)
      
      // Update UI state directly without refetching
      setHasUnsavedChanges(true)
      
      // Add the new lesson to the current schedule state
      const newScheduleItem = {
        id: lessonData.id || `temp_${Date.now()}_${Math.random()}`,
        student_id: lessonData.studentId,
        student_name: lessonData.studentName,
        teacher_id: lessonData.teacherId,
        day_of_week: lessonData.dayOfWeek,
        time_slot: lessonData.timeSlot,
        week_start_date: lessonData.weekStart,
        attendance_status: 'scheduled',
        is_draft: true // Mark as draft item
      }
      
      setSchedule(prevSchedule => [...prevSchedule, newScheduleItem])
      
      // Reset UI state
      setShowAddStudentModal(false)
      setSelectedStudentId('')
      setSelectedTimeSlot(null)
      setEditingCell(null)
      setStudentInput('')
      setSelectedStudent(null)
      setShowSuggestions(false)
      
      console.log('✅ [HANDLE_ADD_STUDENT] Added to draft successfully')
    } catch (err) {
      console.error('❌ [HANDLE_ADD_STUDENT] Error adding student to schedule:', err)
      alert('Failed to add student to schedule: ' + err.message)
    }
  }

  const createSchedule = async (scheduleData) => {
    console.log('🔍 [CREATE_SCHEDULE] Starting with data:', scheduleData)
    try {
      console.log('🔍 [CREATE_SCHEDULE] Calling apiService.createSchedule')
      const response = await apiService.createSchedule(scheduleData)
      console.log('🔍 [CREATE_SCHEDULE] API response:', response)
      
      if (response.success) {
        console.log('✅ [CREATE_SCHEDULE] Success, refreshing schedule')
        // Refresh the schedule
        await fetchSchedule()
        setShowAddStudentModal(false)
        setSelectedStudentId('')
        setSelectedTimeSlot(null)
        setEditingCell(null)
        setStudentInput('')
        setSelectedStudent(null)
        setShowSuggestions(false)
        console.log('✅ [CREATE_SCHEDULE] UI state reset completed')
      } else {
        console.error('❌ [CREATE_SCHEDULE] API returned error:', response.error)
        alert('Failed to create schedule: ' + response.error)
      }
    } catch (err) {
      console.error('❌ [CREATE_SCHEDULE] Exception caught:', err)
      if (err.message.includes('Student is assigned to another teacher')) {
        alert('This student is already assigned to another teacher.')
      } else if (err.message.includes('Student not found')) {
        alert('Student not found. Please refresh and try again.')
      } else if (err.message.includes('Conflict')) {
        alert('There is a scheduling conflict. Please choose a different time slot.')
      } else {
        alert('Failed to create schedule: ' + err.message)
      }
    }
  }


  const timeSlots = [
    '8:00-8:30', '8:30-9:00', '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00',
    '11:00-11:30', '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
    '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00',
    '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00',
    '20:00-20:30', '20:30-21:00', '21:00-21:30'
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
    return schedule.find(s => s.day_of_week === dayOfWeek && s.time_slot === timeSlot && !s.is_deleted)
  }

  const getAllItemsForSlot = (dayOfWeek, timeSlot) => {
    return schedule.find(s => s.day_of_week === dayOfWeek && s.time_slot === timeSlot)
  }

  // Fetch lesson report for a specific schedule
  const fetchLessonReport = async (schedule) => {
    try {
      // Calculate the actual lesson date based on week_start_date and day_of_week
      // Use the same date calculation logic as the teacher panel
      const weekStart = new Date(schedule.week_start_date)
      const lessonDate = new Date(weekStart)
      lessonDate.setDate(weekStart.getDate() + schedule.day_of_week) // day_of_week is 0-based (Monday=0, Tuesday=1, etc.)
      
      // Format the date consistently with the teacher panel
      const lessonDateStr = lessonDate.getFullYear() + '-' + 
        String(lessonDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(lessonDate.getDate()).padStart(2, '0')
      
      console.log('🔍 [ADMIN_FETCH_REPORT] Schedule:', schedule)
      console.log('🔍 [ADMIN_FETCH_REPORT] Week start:', schedule.week_start_date)
      console.log('🔍 [ADMIN_FETCH_REPORT] Day of week:', schedule.day_of_week)
      console.log('🔍 [ADMIN_FETCH_REPORT] Calculated lesson date:', lessonDateStr)
      
      const response = await apiService.getReports({
        student_id: schedule.student_id,
        teacher_id: schedule.teacher_id,
        lesson_date: lessonDateStr, // Use the formatted date string
        time_slot: schedule.time_slot
      })
      
      if (response.reports && response.reports.length > 0) {
        setLessonReportData({
          schedule,
          report: response.reports[0]
        })
      } else {
        setLessonReportData({
          schedule,
          report: null
        })
      }
      setShowLessonReport(true)
    } catch (error) {
      console.error('Error fetching lesson report:', error)
      alert('Error fetching lesson report: ' + error.message)
    }
  }

  // Enhanced lesson deletion functionality
  const handleDeleteLesson = async (schedule) => {
    const isPast = new Date(schedule.week_start_date) < new Date()
    
    if (isPast) {
      // Show confirmation for past lesson cancellation
      setShowFutureLessonConfirm(true)
      setFutureLessonData(schedule)
    } else {
      // Show confirmation for future lesson deletion
      setShowFutureLessonConfirm(true)
      setFutureLessonData(schedule)
    }
  }

  const confirmFutureLessonDeletion = async () => {
    if (futureLessonData) {
      try {
        // Check if this is a draft item (temporary addition)
        if (futureLessonData.is_draft) {
          // Remove from draft additions
          const draft = draftManager.getDraftChanges()
          if (draft) {
            draft.additions = draft.additions.filter(
              addition => !(addition.dayOfWeek === futureLessonData.day_of_week && 
                          addition.timeSlot === futureLessonData.time_slot)
            )
            draftManager.saveDraftChanges(draft)
            setHasUnsavedChanges(draft.additions.length > 0 || draft.deletions.length > 0)
          }
        } else {
          // Add to draft deletions
          const lessonData = {
            teacherId: teacherId,
            dayOfWeek: futureLessonData.day_of_week,
            timeSlot: futureLessonData.time_slot,
            weekStart: weekStart
          }
          
          console.log('🔍 [DELETE] Calling draftManager.deleteLesson with:', futureLessonData.id, lessonData)
          const deleteResult = draftManager.deleteLesson(futureLessonData.id, lessonData)
          console.log('🔍 [DELETE] Delete result:', deleteResult)
          setHasUnsavedChanges(true)
          
          // Also update the draft state to ensure it's saved
          const draft = draftManager.getDraftChanges()
          console.log('🔍 [DELETE] Draft after deletion:', draft)
          if (draft) {
            draftManager.saveDraftChanges(draft)
          }
        }
        
      } catch (err) {
        console.error('Exception:', err)
        alert('Error deleting lesson: ' + err.message)
        setShowFutureLessonConfirm(false)
        setFutureLessonData(null)
        return
      }
      
      // Update UI state directly without refetching (only if no error occurred)
      if (futureLessonData.is_draft) {
        // Remove from current schedule state
        setSchedule(prevSchedule => 
          prevSchedule.filter(item => 
            !(item.day_of_week === futureLessonData.day_of_week && 
              item.time_slot === futureLessonData.time_slot)
          )
        )
      } else {
        // Mark as deleted in current schedule state
        setSchedule(prevSchedule => 
          prevSchedule.map(item => 
            item.id === futureLessonData.id 
              ? { ...item, is_deleted: true, attendance_status: 'deleted' }
              : item
          )
        )
      }
      
      setShowFutureLessonConfirm(false)
      setFutureLessonData(null)
    }
  }

  // Delete report function
  const handleDeleteReport = async () => {
    if (!lessonReportData?.report) {
      alert('No report to delete')
      return
    }

    try {
      const response = await apiService.deleteReport(lessonReportData.report.id)
      
      if (response.success) {
        // Reset the lesson status to 'scheduled' (remove attendance status)
        await apiService.markAttendance(
          lessonReportData.schedule.id,
          'scheduled',
          new Date().toISOString().split('T')[0]
        )
        
        // Refresh the schedule to show updated status
        await fetchSchedule()
        
        // Close the modal
        setShowLessonReport(false)
        setLessonReportData(null)
        setShowDeleteConfirm(false)
        
        alert('Report deleted successfully. Lesson has been reset for the teacher to submit a new report.')
      } else {
        console.error('Delete report failed:', response.error)
        alert('Failed to delete report: ' + response.error)
      }
    } catch (err) {
      console.error('Exception deleting report:', err)
      alert('Error deleting report: ' + err.message)
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
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
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
          
          
          {/* Autofill Tip - Minimalistic with Click Handler */}
          {showAutofillTip && autofillStudent && (
            <div 
              className="absolute z-30 w-full mt-1 bg-blue-50 border border-blue-200 rounded shadow-sm px-2 py-1 cursor-pointer hover:bg-blue-100"
              onClick={() => {
                console.log('🎯 [AUTOFILL_CLICK] Clicked autofill tip', {
                  selectedStudent,
                  autofillStudent,
                  dayIndex,
                  timeSlot
                })
                const studentToUse = selectedStudent || autofillStudent
                if (studentToUse) {
                  console.log('✅ [AUTOFILL_CLICK] Calling handleAddStudentToSchedule with:', {
                    student: studentToUse.name,
                    dayIndex,
                    timeSlot
                  })
                  handleAddStudentToSchedule(studentToUse, dayIndex, timeSlot)
                  setEditingCell(null)
                } else {
                  console.log('❌ [AUTOFILL_CLICK] No student available for scheduling')
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700">
                  <span className="font-medium">{autofillStudent.name}</span>
                  <span className="text-blue-500 ml-1">• Press Enter or click</span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation() // Prevent triggering parent click
                    setShowAutofillTip(false)
                    setAutofillStudent(null)
                    setSelectedStudent(null)
                  }}
                  className="text-blue-400 hover:text-blue-600 ml-2"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
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
      const isDeleted = existingSchedule.is_deleted
      return (
        <div 
          className={`flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 ${
            isDeleted ? 'opacity-50 bg-red-50 line-through' : ''
          }`}
          onDoubleClick={() => !isDeleted && handleCellDoubleClick(dayIndex, timeSlot)}
          title={
            isDeleted 
              ? "Marked for deletion (will be removed when saved)"
              : editMode 
                ? "Double-click to remove student" 
                : "Double-click to view lesson report"
          }
        >
          <span className={`text-sm font-medium ${isDeleted ? 'text-red-600' : ''}`}>
            {existingSchedule.student_name}
            {isDeleted && <span className="ml-1 text-xs text-red-500">(deleted)</span>}
          </span>
          {editMode && !isDeleted && (
            <button
              onClick={() => handleDeleteLesson(existingSchedule)}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              ×
            </button>
          )}
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
      handleNavigationAttempt('previousWeek')
    }
  }

  const handleNextWeek = async () => {
    if (onWeekChange && weekStart && !isTransitioning) {
      handleNavigationAttempt('nextWeek')
    }
  }

  const handleCurrentWeek = async () => {
    if (onWeekChange && !isTransitioning) {
      handleNavigationAttempt('currentWeek')
    }
  }

  // Draft mode functions
  const saveChangesToDatabase = async () => {
    console.log('🔍 [SAVE] Save button clicked, hasUnsavedChanges:', hasUnsavedChanges)
    console.log('🔍 [SAVE] Current date:', new Date().toISOString().split('T')[0])
    console.log('🔍 [SAVE] Current date local:', new Date().toLocaleDateString('en-CA'))
    console.log('🔍 [SAVE] Current day of week:', new Date().getDay())
    console.log('🔍 [SAVE] Expected current week start:', getCurrentWeekStart())
    
    // Manual calculation for debugging
    const today = new Date()
    const day = today.getDay()
    const daysToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysToMonday)
    console.log('🔍 [SAVE] Manual calculation - daysToMonday:', daysToMonday)
    console.log('🔍 [SAVE] Manual calculation - monday:', monday.toISOString().split('T')[0])
    
    if (!hasUnsavedChanges) {
      console.log('❌ [SAVE] No unsaved changes, returning early')
      return
    }

    try {
      setIsSaving(true)
      const draft = draftManager.getDraftChanges()
      console.log('🔍 [SAVE] Draft data:', draft)
      console.log('🔍 [SAVE] localStorage draft:', localStorage.getItem('schedule_draft_changes'))
      
      if (!draft) {
        console.log('❌ [SAVE] No draft data found')
        console.log('🔍 [SAVE] Checking if there are any changes in schedule state...')
        // Check if there are any draft items in the current schedule
        const draftItems = schedule.filter(item => item.is_draft)
        const deletedItems = schedule.filter(item => item.is_deleted)
        console.log('🔍 [SAVE] Draft items in schedule:', draftItems.length)
        console.log('🔍 [SAVE] Deleted items in schedule:', deletedItems.length)
        return
      }

      // Process additions
      console.log('🔍 [SAVE] Current weekStart prop:', weekStart)
      console.log('🔍 [SAVE] Processing additions:', draft.additions.length)
      for (const addition of draft.additions) {
        console.log('🔍 [SAVE] Addition weekStart:', addition.weekStart)
        console.log('🔍 [SAVE] Calling createSchedule with:', {
          student_id: addition.studentId,
          teacher_id: addition.teacherId,
          day_of_week: addition.dayOfWeek,
          time_slot: addition.timeSlot,
          week_start_date: addition.weekStart
        })
        try {
          const result = await apiService.createSchedule({
            student_id: addition.studentId,
            teacher_id: addition.teacherId,
            day_of_week: addition.dayOfWeek,
            time_slot: addition.timeSlot,
            week_start_date: addition.weekStart
          })
          console.log('🔍 [SAVE] createSchedule result:', result)
        } catch (error) {
          console.error('❌ [SAVE] createSchedule error:', error)
          throw error
        }
      }

      // Process deletions
      console.log('🔍 [SAVE] Processing deletions:', draft.deletions.length)
      for (const deletion of draft.deletions) {
        console.log('🔍 [SAVE] Deleting schedule:', deletion.scheduleId)
        await apiService.deleteSchedule(deletion.scheduleId)
      }

      // Clear draft and refresh
      draftManager.clearDraftChanges()
      setHasUnsavedChanges(false)
      await fetchSchedule()

      console.log('✅ [DRAFT] Changes saved successfully')
    } catch (error) {
      console.error('❌ [DRAFT] Failed to save changes:', error)
      
      // Extract the error message from the error object
      let errorMessage = 'Failed to save changes. Please try again.'
      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      showNotificationMessage('Error', errorMessage, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const discardChanges = () => {
    draftManager.clearDraftChanges()
    setHasUnsavedChanges(false)
    fetchSchedule()
    console.log('🗑️ [DRAFT] Changes discarded')
  }

  const handleNavigationAttempt = (action) => {
    if (hasUnsavedChanges) {
      setPendingAction(action)
      setShowSaveWarning(true)
    } else {
      executeAction(action)
    }
  }

  const executeAction = (action) => {
    if (action === 'previousWeek') {
      if (onWeekChange && weekStart && !isTransitioning) {
        setIsTransitioning(true)
        const previousWeek = subtractDays(weekStart, 7)
        onWeekChange(previousWeek)
        setTimeout(() => setIsTransitioning(false), 300)
      }
    } else if (action === 'nextWeek') {
      if (onWeekChange && weekStart && !isTransitioning) {
        setIsTransitioning(true)
        const nextWeek = addDays(weekStart, 7)
        onWeekChange(nextWeek)
        setTimeout(() => setIsTransitioning(false), 300)
      }
    } else if (action === 'currentWeek') {
      if (onWeekChange && !isTransitioning) {
        setIsTransitioning(true)
        const currentWeekStart = getCurrentWeekStart()
        onWeekChange(currentWeekStart)
        setTimeout(() => setIsTransitioning(false), 300)
      }
    }
    // Add more actions as needed
  }

  const handleSaveWarningResponse = (response) => {
    if (response === 'save') {
      saveChangesToDatabase().then(() => executeAction(pendingAction))
    } else if (response === 'discard') {
      discardChanges()
      executeAction(pendingAction)
    }
    setShowSaveWarning(false)
    setPendingAction(null)
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
      case 'absent_warned':
        return 'bg-yellow-500 text-white'
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
                  className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ${
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
              <span className="text-xs sm:text-sm font-medium text-neutral-700">Read Mode</span>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`relative inline-flex h-7 w-14 sm:h-6 sm:w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  editMode ? 'bg-primary-500' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    editMode ? 'translate-x-8 sm:translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs sm:text-sm font-medium text-neutral-700">Edit Mode</span>
            </div>
              {editMode && (
                <button 
                  className="btn-primary text-sm"
                  onClick={saveChangesToDatabase}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          <motion.table 
            key={weekStart} 
            className="w-full table-fixed"
            variants={tableVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
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
                      key={`${day}-${weekStart}`}
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
            <tbody>
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
                    const dayOfWeek = getDayNumber(day)
                    const student = getStudentForSlot(dayOfWeek, timeSlot)
                    const status = getAttendanceStatus(student)
                    const dayInfo = weekInfo?.days?.[dayIndex]
                    const isCurrentMonth = dayInfo?.isCurrentMonth ?? true
                    const isEditable = dayInfo?.isEditable ?? true
                    
                    return (
                      <motion.td 
                        key={`${dayIndex}-${timeIndex}-${weekStart}`}
                        className={`px-1 sm:px-2 py-1 h-10 sm:h-12 md:h-14 relative ${!isCurrentMonth ? 'bg-neutral-50' : ''}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: (timeIndex * 0.02) + (dayIndex * 0.01) }}
                        onClick={handleCellClickOutside}
                      >
                        <AnimatePresence mode="wait">
                          {student ? (
                            <motion.div
                              key={`student-${student.id}-${weekStart}`}
                              className={`p-1 rounded-lg text-2xs font-medium text-center transition-all duration-200 ${getStatusColor(status)} ${
                                editMode && isEditable ? 'cursor-pointer' : 
                                status === 'completed' ? 'cursor-pointer' : ''
                              }`}
                              whileHover={
                                editMode && isEditable ? { scale: 1.02 } : 
                                status === 'completed' ? { scale: 1.02 } : {}
                              }
                              whileTap={
                                editMode && isEditable ? { scale: 0.98 } : 
                                status === 'completed' ? { scale: 0.98 } : {}
                              }
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              onClick={
                                editMode && isEditable ? 
                                  () => handleDeleteLesson(student) : 
                                  status === 'completed' ? 
                                    () => fetchLessonReport(student) : 
                                    undefined
                              }
                            >
                              <div className="truncate text-2xs">{student.student_name}</div>
                              {editMode && isEditable ? (
                                <div className="mt-1 text-2xs opacity-75">
                                  Click to remove
                                </div>
                              ) : status === 'completed' ? (
                                <div className="mt-1 text-2xs opacity-75">
                                  Click to view report
                                </div>
                              ) : null}
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
                              {renderCellContent(dayOfWeek, timeSlot, getAllItemsForSlot(dayOfWeek, timeSlot))}
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
            <span>U</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>UI</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-neutral-200 rounded"></div>
            <span>Scheduled</span>
          </div>
        </div>
      </div>

      {/* Enhanced Student Selection Modal */}
      <StudentSelectionModal
        isOpen={showAddStudentModal}
        onClose={() => {
          setShowAddStudentModal(false)
          setSelectedStudentId('')
          setSelectedTimeSlot(null)
        }}
        onSelect={handleStudentSelect}
        teacherId={teacherId}
        teacherName="Teacher"
      />

      {/* Lesson Report Modal */}
      {showLessonReport && lessonReportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">
              Lesson Report
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Student:</strong> {lessonReportData.schedule.student_name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Date:</strong> {(() => {
                  const weekStart = new Date(lessonReportData.schedule.week_start_date)
                  const lessonDate = new Date(weekStart)
                  lessonDate.setDate(weekStart.getDate() + lessonReportData.schedule.day_of_week) // day_of_week is 0-based
                  return lessonDate.toLocaleDateString('en-US', {
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })
                })()}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Time:</strong> {lessonReportData.schedule.time_slot}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Status:</strong> {lessonReportData.schedule.attendance_status}
              </p>
            </div>
            
            {lessonReportData.report ? (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Teacher's Report:</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {lessonReportData.report.comment}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Report created: {new Date(lessonReportData.report.created_at).toLocaleString('en-US', {
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-gray-500 italic">No lesson report available for this lesson.</p>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLessonReport(false)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Close
              </button>
              {lessonReportData.report && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Delete Report Confirmation Modal */}
      {showDeleteConfirm && lessonReportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              Delete Lesson Report
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this lesson report?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>This will:</strong>
              </p>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                <li>Delete the report from the database</li>
                <li>Reset the lesson status to "Scheduled"</li>
                <li>Allow the teacher to submit a new report</li>
                <li>Reset attendance status (absent/completed/warned)</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteReport}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Delete Report
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


      {/* Save Warning Modal */}
      <SaveWarningModal
        isOpen={showSaveWarning}
        onClose={() => setShowSaveWarning(false)}
        onSave={() => handleSaveWarningResponse('save')}
        onDiscard={() => handleSaveWarningResponse('discard')}
        pendingAction={pendingAction}
        changesSummary={draftManager.getChangesSummary()}
      />
      
      {/* Success/Error Notification */}
      <SuccessNotification
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        title={notificationData.title}
        message={notificationData.message}
        type={notificationData.type}
      />
    </div>
  )
}

export default ScheduleTable
