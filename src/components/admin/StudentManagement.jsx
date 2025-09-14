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
    date_from: '',
    date_to: '',
    lessons_min: '',
    lessons_max: '',
    status: 'active'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '' })
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
        // Reactivating student - show teacher selection
        setShowStatusConfirm(false)
        setStatusChangeData({ ...statusChangeData, showTeacherSelection: true })
      }
    } catch (error) {
      console.error('Error updating student status:', error)
      showSuccessNotification('Error', 'Error updating student status', 'error')
    }
  }

  const handleTeacherSelection = async (teacherId) => {
    try {
      const { student } = statusChangeData
      
      await apiService.updateStudent(student.id, {
        name: student.name,
        teacher_id: parseInt(teacherId),
        lessons_per_week: student.lessons_per_week,
        is_active: true
      })
      
      // Refresh both active and inactive students to get accurate counts
      await Promise.all([
        fetchStudents(),
        fetchInactiveStudents()
      ])
      
      showSuccessNotification('Success!', 'Student reactivated successfully', 'success')
      setStatusChangeData(null)
    } catch (error) {
      console.error('Error reactivating student:', error)
      if (error.status === 401) {
        // Token expired, redirect to login
        window.location.href = '/login'
        return
      }
      showSuccessNotification('Error', 'Error reactivating student', 'error')
    }
  }

  const handleAddStudent = async () => {
    try {
      if (!newStudent.name) {
        showSuccessNotification('Validation Error', 'Please fill in the student name', 'error')
        return
      }

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

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Search by name</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">From date</label>
            <input
              type="date"
              placeholder="From date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">To date</label>
            <input
              type="date"
              placeholder="To date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
          <div className="text-xs sm:text-sm text-gray-600">
            {filters.date_from && filters.date_to 
              ? `Showing lesson counts from ${filters.date_from} to ${filters.date_to}`
              : 'Showing all-time lesson counts'
            }
          </div>
          <button 
            onClick={() => fetchStudents()} 
            className="bg-primary-500 hover:bg-primary-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Update</span>
          </button>
        </div>
      </div>


      {/* Students Table */}
      <div className="w-full">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-gray-50">
              <th 
                className="px-1 sm:px-2 py-1 sm:py-2 text-left text-2xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-1/3 sm:w-auto"
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
                className="px-1 sm:px-2 py-1 sm:py-2 text-left text-2xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none hidden sm:table-cell"
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
              <th 
                className="px-1 sm:px-2 py-1 sm:py-2 text-left text-2xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none hidden md:table-cell"
                onClick={() => handleSort('lessons_per_week')}
              >
                <div className="flex items-center space-x-1">
                  <span>Lessons/Week</span>
                  {sortConfig.key === 'lessons_per_week' && (
                    <span className="text-primary-500">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-1 sm:px-2 py-1 sm:py-2 text-left text-2xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none hidden lg:table-cell"
                onClick={() => handleSort('lesson_count')}
              >
                <div className="flex items-center space-x-1">
                  <span>Total Lessons</span>
                  {sortConfig.key === 'lesson_count' && (
                    <span className="text-primary-500">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-1 sm:px-2 py-1 sm:py-2 text-left text-2xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none hidden xl:table-cell"
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
                className="px-1 sm:px-2 py-1 sm:py-2 text-left text-2xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none hidden lg:table-cell"
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
              <th className="px-1 sm:px-2 py-1 sm:py-2 text-left text-2xs font-medium text-gray-500 uppercase tracking-wider w-1/3 sm:w-auto">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                </td>
              </tr>
            ) : (activeTab === 'active' ? students : inactiveStudents).length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
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
                  <td className="px-1 sm:px-2 py-1 sm:py-2 text-2xs font-medium text-gray-900">
                    <div className="min-w-0">
                      <div className="truncate">{student.name}</div>
                      {/* Mobile: Show key info inline */}
                      <div className="sm:hidden mt-1 space-y-1">
                        <div className="text-2xs text-gray-500">
                          Teacher: {student.teacher_name || 'Unassigned'}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-medium bg-blue-100 text-blue-800">
                            {student.lesson_count || 0} lessons
                          </span>
                          <span className={`inline-flex px-1.5 py-0.5 text-2xs font-semibold rounded-full ${
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
                  <td className="px-1 sm:px-2 py-1 sm:py-2 text-2xs text-gray-500 hidden sm:table-cell">
                    {student.teacher_name || 'Unassigned'}
                  </td>
                  <td className="px-1 sm:px-2 py-1 sm:py-2 text-2xs text-gray-500 hidden md:table-cell">
                    {student.lessons_per_week}
                  </td>
                  <td className="px-1 sm:px-2 py-1 sm:py-2 text-2xs text-gray-500 hidden lg:table-cell">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-medium bg-blue-100 text-blue-800">
                      {student.lesson_count || 0}
                    </span>
                  </td>
                  <td className="px-1 sm:px-2 py-1 sm:py-2 text-2xs text-gray-500 hidden xl:table-cell">
                    {new Date(student.added_date).toLocaleDateString()}
                  </td>
                  <td className="px-1 sm:px-2 py-1 sm:py-2 hidden lg:table-cell">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-1.5 py-0.5 text-2xs font-semibold rounded-full ${
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
                        className={`text-2xs px-1.5 py-0.5 rounded transition-colors ${
                          student.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {student.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                  <td className="px-1 sm:px-2 py-1 sm:py-2 text-2xs text-gray-500">
                    <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                      {student.is_active && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openTeacherModal(student)
                            }}
                            className="px-2 sm:px-3 py-1 text-2xs sm:text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors duration-200"
                          >
                            <span className="hidden sm:inline">See Teachers</span>
                            <span className="sm:hidden">Teachers</span>
                          </button>
                          <div className="flex space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleHardDelete(student)
                              }}
                              className="text-red-600 hover:text-red-800 text-2xs sm:text-xs px-2 py-1 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
              >
                Add Student
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
                    <div className="text-sm text-red-700">Absent</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {selectedStudentStats.warned || 0}
                    </div>
                    <div className="text-sm text-yellow-700">Warned</div>
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Note:</strong> When reactivating a student, you'll need to assign them to a teacher.
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

      {/* Teacher Selection Modal for Reactivation */}
      {statusChangeData?.showTeacherSelection && (
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
                  Select Teacher for Reactivation
                </h3>
                <button
                  onClick={() => setStatusChangeData(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Please select a teacher for <span className="font-semibold">{statusChangeData.student.name}</span>:
                </p>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {teachers.map(teacher => (
                    <button
                      key={teacher.id}
                      onClick={() => handleTeacherSelection(teacher.id)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{teacher.name}</div>
                      <div className="text-sm text-gray-500">{teacher.email}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStatusChangeData(null)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors duration-200"
                >
                  Cancel
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
