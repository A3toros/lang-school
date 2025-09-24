import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'
import SuccessNotification from '../common/SuccessNotification'
import TeacherManagementModal from './TeacherManagementModal'

const StudentManagement = ({ onStudentSelect, selectedStudent }) => {
  const [students, setStudents] = useState([])
  const [inactiveStudents, setInactiveStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active') // 'active' or 'inactive'
  const [filters, setFilters] = useState({
    name: '',
    status: 'active'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '' })
  const [isAddingStudent, setIsAddingStudent] = useState(false)
  const [teachers, setTeachers] = useState([])
  const [sortConfig, setSortConfig] = useState({
    key: 'added_date',
    direction: 'desc'
  })
  
  // Teacher management modal state
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [modalStudent, setModalStudent] = useState(null)
  const [assignedTeachers, setAssignedTeachers] = useState([])
  const [availableTeachers, setAvailableTeachers] = useState([])
  const [teacherModalLoading, setTeacherModalLoading] = useState(false)
  const [showStudentDetails, setShowStudentDetails] = useState(false)
  const [selectedStudentStats, setSelectedStudentStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [statusChangeData, setStatusChangeData] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteData, setDeleteData] = useState(null)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'success' })
  
  // Month/Week filtering state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [weeksInMonth, setWeeksInMonth] = useState([])
  const [showWeekDropdown, setShowWeekDropdown] = useState(false)
  const [monthlyLessons, setMonthlyLessons] = useState({})
  const [filtering, setFiltering] = useState(false)

  useEffect(() => {
    if (activeTab === 'active') {
      fetchStudents()
    } else {
      fetchInactiveStudents()
    }
    fetchTeachers()
  }, [pagination.page, filters, sortConfig, activeTab])

  // Initial load - fetch both active and inactive students to show correct counts
  useEffect(() => {
    fetchStudents()
    fetchInactiveStudents()
    fetchTeachers()
  }, [])

  // Month/Week filtering useEffect
  useEffect(() => {
    const weeks = generateWeeksInMonth(currentMonth)
    setWeeksInMonth(weeks)
    setSelectedWeek(null)
    
    const fetchMonthlyLessons = async () => {
      try {
        setFiltering(true)
        const month = currentMonth.getMonth() + 1
        const year = currentMonth.getFullYear()
        
        console.log('🔍 [STUDENT_MANAGEMENT] Fetching monthly lessons for:', year, month)
        
        const response = await apiService.getStudentMonthlyLessons(month, year)
        if (response.success) {
          // Group lessons by student and week
          const groupedLessons = {}
          response.monthlyLessons.forEach(lesson => {
            const studentId = lesson.student_id
            const weekStart = lesson.week_start_date
            
            if (!groupedLessons[studentId]) {
              groupedLessons[studentId] = {}
            }
            
            groupedLessons[studentId][weekStart] = {
              completed_lessons: Number(lesson.completed_lessons),
              absent_lessons: Number(lesson.absent_lessons),
              total_lessons: Number(lesson.total_lessons)
            }
          })
          
          setMonthlyLessons(groupedLessons)
          console.log('🔍 [STUDENT_MANAGEMENT] Monthly lessons loaded:', groupedLessons)
        }
      } catch (error) {
        console.error('Error fetching monthly lessons:', error)
      } finally {
        setFiltering(false)
      }
    }
    
    fetchMonthlyLessons()
  }, [currentMonth])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const response = await apiService.getStudents({
        ...filters,
        status: 'active',
        page: pagination.page,
        limit: pagination.limit,
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction
      })
      
      if (response.success) {
        console.log('📊 [STUDENTS] API Response:', { 
          studentsCount: response.students?.length, 
          total: response.total 
        })
        setStudents(response.students)
        setPagination(prev => ({ ...prev, total: response.total }))
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInactiveStudents = async () => {
    try {
      setLoading(true)
      const response = await apiService.getInactiveStudents()
      
      if (response.success) {
        setInactiveStudents(response.students || [])
      }
    } catch (error) {
      console.error('Error fetching inactive students:', error)
      if (error.status === 401) {
        // Token expired, redirect to login
        window.location.href = '/login'
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const response = await apiService.getTeachers()
      if (response.success) {
        setTeachers(response.teachers)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
      if (error.status === 401) {
        // Token expired, redirect to login
        window.location.href = '/login'
      }
    }
  }

  // Generate weeks for current month (same as TeachersTable)
  const generateWeeksInMonth = (month) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    
    const weeks = []
    const firstDay = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0)
    
    // Find first Monday of the month
    let currentWeekStart = new Date(firstDay)
    const dayOfWeek = firstDay.getDay()
    const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7
    currentWeekStart.setDate(firstDay.getDate() + daysToMonday)
    
    let weekNumber = 1
    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart)
      weekEnd.setDate(currentWeekStart.getDate() + 6)
      
      weeks.push({
        weekNumber,
        start: new Date(currentWeekStart),
        end: new Date(weekEnd)
      })
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
      weekNumber++
    }
    
    return weeks
  }

  // Month navigation functions
  const previousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))
  }

  // Lesson count calculation using monthly lessons data
  const getLessonCount = (studentId) => {
    // If a specific week is selected, return week-specific data
    if (selectedWeek) {
      const studentLessons = monthlyLessons[studentId]
      if (!studentLessons) {
        console.log(`🔍 [GET_LESSON_COUNT] No monthly lessons for student ${studentId}`)
        return 0
      }
      
      const selectedWeekStart = selectedWeek.start.toISOString().split('T')[0]
      console.log(`🔍 [GET_LESSON_COUNT] Looking for week ${selectedWeekStart} in student ${studentId} lessons:`, studentLessons)
      
      // Find matching week in monthly lessons
      for (const [weekDate, weekData] of Object.entries(studentLessons)) {
        // Convert backend date to match frontend format
        const backendDate = new Date(weekDate).toISOString().split('T')[0]
        if (backendDate === selectedWeekStart) {
          console.log(`🔍 [GET_LESSON_COUNT] Found matching week ${weekDate} (${backendDate}):`, weekData)
          return weekData.total_lessons || 0
        }
      }
      console.log(`🔍 [GET_LESSON_COUNT] No matching week found for ${selectedWeekStart}`)
      return 0
    }
    
    // If no week selected, return total for the current month
    const studentLessons = monthlyLessons[studentId]
    if (!studentLessons) return 0
    
    let totalLessons = 0
    Object.values(studentLessons).forEach(weekData => {
      totalLessons += weekData.total_lessons || 0
    })
    
    return totalLessons
  }

  const showSuccessNotification = (title, message, type = 'success') => {
    setNotificationData({ title, message, type })
    setShowNotification(true)
  }


  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const fetchStudentStats = async (studentId) => {
    try {
      setLoadingStats(true)
      const response = await apiService.getStudentAttendanceAnalytics(
        studentId, 
        filters.date_from || undefined, 
        filters.date_to || undefined, 
        'week' // Default bucket, not used when dates are provided
      )
      
      if (response.success) {
        setSelectedStudentStats(response.data)
        setShowStudentDetails(true)
      }
    } catch (error) {
      console.error('Error fetching student stats:', error)
      showSuccessNotification('Error', 'Error loading student statistics', 'error')
    } finally {
      setLoadingStats(false)
    }
  }

  const handleStatusChange = (student, newStatus) => {
    setStatusChangeData({ student, newStatus })
    setShowStatusConfirm(true)
  }

  const confirmStatusChange = async () => {
    try {
      const { student, newStatus } = statusChangeData
      
      if (newStatus === false) {
        // Deactivating student
        await apiService.updateStudent(student.id, {
          name: student.name,
          teacher_id: null,
          lessons_per_week: student.lessons_per_week,
          is_active: false
        })
        
        // Refresh both active and inactive students to get accurate counts
        await Promise.all([
          fetchStudents(),
          fetchInactiveStudents()
        ])
        
        showSuccessNotification('Success!', 'Student deactivated successfully', 'success')
        setShowStatusConfirm(false)
        setStatusChangeData(null)
      } else if (newStatus === true) {
        // Reactivating student - allow NULL teacher assignment
        await apiService.updateStudent(student.id, {
          name: student.name,
          teacher_id: null,
          lessons_per_week: student.lessons_per_week,
          is_active: true
        })
        
        // Refresh both active and inactive students to get accurate counts
        await Promise.all([
          fetchStudents(),
          fetchInactiveStudents()
        ])
        
        showSuccessNotification('Success!', 'Student reactivated successfully', 'success')
        setShowStatusConfirm(false)
        setStatusChangeData(null)
      }
    } catch (error) {
      console.error('Error updating student status:', error)
      showSuccessNotification('Error', 'Error updating student status', 'error')
    }
  }


  const handleAddStudent = async () => {
    try {
      if (!newStudent.name) {
        showSuccessNotification('Validation Error', 'Please fill in the student name', 'error')
        return
      }

      setIsAddingStudent(true)

      const response = await apiService.createStudent({
        name: newStudent.name,
        lessons_per_week: 1,
        added_date: new Date().toISOString().split('T')[0]
      })

      if (response.success) {
        setNewStudent({ name: '' })
        setShowAddModal(false)
        fetchStudents()
        showSuccessNotification('Success!', 'Student added successfully', 'success')
      }
    } catch (error) {
      console.error('Error adding student:', error)
      showSuccessNotification('Error', 'Failed to add student', 'error')
    } finally {
      setIsAddingStudent(false)
    }
  }

  const handleReassignStudent = async (studentId, newTeacherId) => {
    try {
      // Use the students endpoint for student reassignment
      const response = await apiService.makeRequest(`/students/${studentId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ new_teacher_id: newTeacherId })
      })
      if (response.success) {
        fetchStudents()
        showSuccessNotification('Success!', 'Student reassigned successfully', 'success')
      }
    } catch (error) {
      console.error('Error reassigning student:', error)
      showSuccessNotification('Error', 'Failed to reassign student', 'error')
    }
  }

  // =====================================================
  // TEACHER MANAGEMENT FUNCTIONS
  // =====================================================

  // Fetch student's assigned teachers
  const fetchStudentTeachers = async (studentId) => {
    try {
      setTeacherModalLoading(true)
      const response = await apiService.getStudentTeachers(studentId)
      
      if (response.success) {
        setAssignedTeachers(response.teachers || [])
        
        // Calculate available teachers (not already assigned AND active)
        const assignedIds = (response.teachers || []).map(t => t.id)
        const available = teachers.filter(t => 
          !assignedIds.includes(t.id) && t.is_active === true
        )
        
        console.log('🔍 [TEACHER_MANAGEMENT] Available teachers calculation:', {
          assignedTeachers: response.teachers || [],
          assignedIds,
          allTeachers: teachers.length,
          activeTeachers: teachers.filter(t => t.is_active === true).length,
          availableTeachers: available.length,
          availableIds: available.map(t => t.id),
          inactiveTeachers: teachers.filter(t => t.is_active === false).map(t => ({ id: t.id, name: t.name }))
        })
        
        setAvailableTeachers(available)
      } else {
        console.error('❌ [TEACHER_MANAGEMENT] Failed to fetch student teachers:', response)
        showSuccessNotification('Error', 'Failed to load teacher assignments. Please run the database migration script.', 'error')
        setAssignedTeachers([])
        setAvailableTeachers([])
      }
    } catch (error) {
      console.error('❌ [TEACHER_MANAGEMENT] Error fetching student teachers:', error)
      console.error('🔍 [DEBUG] Student ID:', studentId)
      console.error('🔍 [DEBUG] Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      })
      showSuccessNotification('Error', `Failed to load teacher assignments: ${error.message}`, 'error')
      setAssignedTeachers([])
      setAvailableTeachers([])
    } finally {
      setTeacherModalLoading(false)
    }
  }

  // Add teacher to student
  const handleAddTeacher = async (teacherId) => {
    try {
      setTeacherModalLoading(true)
      console.log('🔍 [ADD_TEACHER] Adding teacher:', { studentId: modalStudent.id, teacherId })

      // Check if teacher is already assigned (frontend validation)
      const isAlreadyAssigned = assignedTeachers.some(t => t.id === teacherId)
      if (isAlreadyAssigned) {
        showSuccessNotification('Error', 'This teacher is already assigned to the student', 'error')
        return
      }

      const response = await apiService.addStudentTeacher(modalStudent.id, {
        teacher_id: teacherId
      })

      if (response.success) {
        await fetchStudentTeachers(modalStudent.id)
        // Refresh both active and inactive students to get accurate counts
        await Promise.all([
          fetchStudents(),
          fetchInactiveStudents()
        ])
        showSuccessNotification('Success!', 'Teacher added successfully', 'success')
      } else {
        console.error('❌ [ADD_TEACHER] Failed to add teacher:', response)
        showSuccessNotification('Error', `Failed to add teacher: ${response.error || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      console.error('❌ [ADD_TEACHER] Error adding teacher:', error)
      console.error('🔍 [DEBUG] Add teacher error details:', {
        studentId: modalStudent.id,
        teacherId,
        message: error.message,
        status: error.status
      })
      
      // Better error messages based on status code
      let errorMessage = error.message
      if (error.status === 400) {
        errorMessage = 'Teacher already assigned or invalid teacher ID'
      } else if (error.status === 500) {
        errorMessage = 'Server error - please try again'
      }
      
      showSuccessNotification('Error', `Failed to add teacher: ${errorMessage}`, 'error')
    } finally {
      setTeacherModalLoading(false)
    }
  }

  // Remove teacher from student
  const handleRemoveTeacher = async (teacherId) => {
    try {
      setTeacherModalLoading(true)
      const response = await apiService.removeStudentTeacher(modalStudent.id, teacherId)
      
      if (response.success) {
        await fetchStudentTeachers(modalStudent.id)
        // Refresh both active and inactive students to get accurate counts
        await Promise.all([
          fetchStudents(),
          fetchInactiveStudents()
        ])
        showSuccessNotification('Success!', 'Teacher removed successfully', 'success')
      }
    } catch (error) {
      console.error('Error removing teacher:', error)
      showSuccessNotification('Error', 'Failed to remove teacher', 'error')
    } finally {
      setTeacherModalLoading(false)
    }
  }


  // Open teacher management modal
  const openTeacherModal = async (student) => {
    setModalStudent(student)
    setShowTeacherModal(true)
    await fetchStudentTeachers(student.id)
  }

  // Close teacher management modal
  const closeTeacherModal = () => {
    setShowTeacherModal(false)
    setModalStudent(null)
    setAssignedTeachers([])
    setAvailableTeachers([])
  }

  const handleDeactivateStudent = async (studentId) => {
    try {
      console.log('Deactivating student:', studentId)
      const response = await apiService.deactivateStudent(studentId)
      console.log('Deactivate response:', response)
      
      if (response && response.success) {
        // Always refresh both active and inactive students to update counts
        await Promise.all([
          fetchStudents(),
          fetchInactiveStudents()
        ])
        
        showSuccessNotification('Success!', 'Student deactivated successfully - future schedules removed', 'success')
      } else {
        console.error('Deactivate failed:', response)
        showSuccessNotification('Error', 'Failed to deactivate student: ' + (response?.error || 'Unknown error'), 'error')
      }
    } catch (error) {
      console.error('Error deactivating student:', error)
      showSuccessNotification('Error', 'Failed to deactivate student: ' + error.message, 'error')
    }
  }

  const handleHardDelete = (student) => {
    setDeleteData(student)
    setShowDeleteConfirm(true)
  }

  const confirmHardDelete = async () => {
    try {
      const response = await apiService.deleteStudent(deleteData.id)
      if (response.success) {
        // Refresh both active and inactive students to get accurate counts
        await Promise.all([
          fetchStudents(),
          fetchInactiveStudents()
        ])
        showSuccessNotification('Success!', 'Student deleted successfully - all data removed', 'success')
      }
      
      setShowDeleteConfirm(false)
      setDeleteData(null)
    } catch (error) {
      console.error('Error deleting student:', error)
      showSuccessNotification('Error', 'Error deleting student', 'error')
    }
  }


  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Student Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-500 hover:bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base transition-colors duration-200"
        >
          Add New Student
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 sm:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 whitespace-nowrap ${
            activeTab === 'active'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Active ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 whitespace-nowrap ${
            activeTab === 'inactive'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Inactive ({inactiveStudents.length})
        </button>
      </div>

      {/* Month/Week Navigation - Only show for active tab */}
      {activeTab === 'active' && (
        <div className="mb-4 sm:mb-6">
          {/* Month Navigation and Week Dropdown - Left aligned */}
          <div className="flex items-center justify-start space-x-4">
            {/* Month Navigation */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={previousMonth} 
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                ←
              </button>
              <h3 className="text-lg font-semibold text-gray-800">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button 
                onClick={nextMonth} 
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
                {selectedWeek ? `Week ${selectedWeek.weekNumber}` : 'All Weeks'}
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
                  {weeksInMonth.map(week => (
                    <button 
                      key={week.weekNumber} 
                      onClick={() => {
                        setSelectedWeek(week)
                        setShowWeekDropdown(false)
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      Week {week.weekNumber}: {week.start.toLocaleDateString()} - {week.end.toLocaleDateString()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Filter - Only for active tab */}
      {activeTab === 'active' && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
            <div className="flex-1 max-w-md">
              <label className="block text-xs sm:text-sm text-gray-600 mb-1">Search by name</label>
              <input
                type="text"
                placeholder="Search by name..."
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full text-sm"
              />
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              {selectedWeek 
                ? `Showing lesson counts for Week ${selectedWeek.weekNumber} (${selectedWeek.start.toLocaleDateString()} - ${selectedWeek.end.toLocaleDateString()})`
                : `Showing lesson counts for ${currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
              }
            </div>
          </div>
        </div>
      )}


      {/* Students Table */}
      <div className="w-full overflow-x-auto">
        {filtering && (
          <div className="flex items-center justify-center py-4 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
            Loading lesson data...
          </div>
        )}
        <table className="w-full table-fixed min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th 
                className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-1/3 sm:w-auto"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  {sortConfig.key === 'name' && (
                    <span className="text-primary-500">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none hidden sm:table-cell"
                onClick={() => handleSort('teacher_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Teacher</span>
                  {sortConfig.key === 'teacher_name' && (
                    <span className="text-primary-500">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                <span>Total Lessons</span>
              </th>
              <th 
                className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none hidden xl:table-cell"
                onClick={() => handleSort('added_date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Added Date</span>
                  {sortConfig.key === 'added_date' && (
                    <span className="text-primary-500">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none hidden lg:table-cell"
                onClick={() => handleSort('is_active')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortConfig.key === 'is_active' && (
                    <span className="text-primary-500">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider w-1/3 sm:w-auto">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                </td>
              </tr>
            ) : (activeTab === 'active' ? students : inactiveStudents).length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-sm sm:text-base text-gray-500">
                  No {activeTab} students found
                </td>
              </tr>
            ) : (
              (activeTab === 'active' ? students : inactiveStudents).map((student) => (
                <motion.tr
                  key={student.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selectedStudent?.id === student.id ? 'bg-primary-50' : ''}`}
                  onClick={() => {
                    onStudentSelect(student)
                    fetchStudentStats(student.id)
                  }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base font-medium text-gray-900">
                    <div className="min-w-0">
                      <div className="truncate">{student.name}</div>
                      {/* Mobile: Show key info inline */}
                      <div className="sm:hidden mt-1 space-y-1">
                        <div className="text-xs text-gray-500">
                          Teacher: {student.is_active ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openTeacherModal(student)
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs px-1 py-0.5 rounded hover:bg-blue-50"
                            >
                              Teachers
                            </button>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getLessonCount(student.id)} lessons
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            student.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base text-gray-500 hidden sm:table-cell">
                    {student.is_active ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openTeacherModal(student)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs px-1 py-0.5 rounded hover:bg-blue-50"
                      >
                        Teachers
                      </button>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base text-gray-500 hidden lg:table-cell">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                      {getLessonCount(student.id)}
                    </span>
                  </td>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base text-gray-500 hidden xl:table-cell">
                    {new Date(student.added_date).toLocaleDateString()}
                  </td>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 hidden lg:table-cell">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs sm:text-sm font-semibold rounded-full ${
                        student.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange(student, !student.is_active)
                        }}
                        className={`text-xs px-1 py-0.5 rounded transition-colors ${
                          student.is_active
                            ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                            : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                        }`}
                      >
                        {student.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base text-gray-500">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      {student.is_active && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleHardDelete(student)
                          }}
                          className="text-red-600 hover:text-red-800 text-xs px-1 py-0.5 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 sm:mt-6 gap-2 sm:gap-0">
        <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total || 0)} of {pagination.total || 0} students
        </div>
        <div className="flex space-x-2 justify-center sm:justify-end">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page * pagination.limit >= pagination.total}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
          >
            <h3 className="text-lg font-semibold mb-4">Add New Student</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Student Name"
                value={newStudent.name}
                onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                disabled={isAddingStudent}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={isAddingStudent}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                disabled={isAddingStudent || !newStudent.name.trim()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center min-w-[120px]"
              >
                {isAddingStudent ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  'Add Student'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Student Details Modal */}
      {showStudentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedStudent?.name} - Lesson Statistics
                </h3>
                <button
                  onClick={() => setShowStudentDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 text-sm text-gray-600">
                {filters.date_from && filters.date_to 
                  ? `Period: ${filters.date_from} to ${filters.date_to}`
                  : 'All time statistics'
                }
              </div>

              {loadingStats ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : selectedStudentStats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedStudentStats.completed || 0}
                    </div>
                    <div className="text-sm text-green-700">Completed</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedStudentStats.absent || 0}
                    </div>
                    <div className="text-sm text-red-700">U</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {selectedStudentStats.warned || 0}
                    </div>
                    <div className="text-sm text-yellow-700">UI</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedStudentStats.total || 0}
                    </div>
                    <div className="text-sm text-blue-700">Total</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No statistics available for this student.
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowStudentDetails(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusConfirm && statusChangeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Status Change
                </h3>
                <button
                  onClick={() => setShowStatusConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to {statusChangeData.newStatus ? 'reactivate' : 'deactivate'} student{' '}
                  <span className="font-semibold">{statusChangeData.student.name}</span>?
                </p>
                
                {statusChangeData.newStatus && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 text-sm">
                      <strong>Note:</strong> Student will be reactivated without a teacher assignment. You can assign a teacher later.
                    </p>
                  </div>
                )}
                
                {!statusChangeData.newStatus && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">
                      <strong>Warning:</strong> Deactivating will remove the student from their current teacher and all active schedules.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowStatusConfirm(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusChange}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    statusChangeData.newStatus
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {statusChangeData.newStatus ? 'Reactivate' : 'Deactivate'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}


      {/* Hard Delete Confirmation Modal */}
      {showDeleteConfirm && deleteData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-600">
                  ⚠️ Permanent Deletion
                </h3>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to <strong>permanently delete</strong> student{' '}
                  <span className="font-semibold text-red-600">{deleteData.name}</span>?
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm font-semibold mb-2">
                    This action will permanently delete:
                  </p>
                  <ul className="text-red-700 text-sm space-y-1">
                    <li>• Student record and all personal data</li>
                    <li>• All lesson reports and attendance data</li>
                    <li>• All schedules (past and future)</li>
                    <li>• All lesson tracking records</li>
                    <li>• All schedule templates</li>
                  </ul>
                  <p className="text-red-800 text-sm font-semibold mt-2">
                    This action cannot be undone!
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmHardDelete}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Notification */}
      <SuccessNotification
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        title={notificationData.title}
        message={notificationData.message}
        type={notificationData.type}
        duration={4000}
      />

      {/* Teacher Management Modal */}
            <TeacherManagementModal
              student={modalStudent}
              isOpen={showTeacherModal}
              onClose={closeTeacherModal}
              assignedTeachers={assignedTeachers}
              loading={teacherModalLoading}
            />
    </div>
  )
}

export default StudentManagement
