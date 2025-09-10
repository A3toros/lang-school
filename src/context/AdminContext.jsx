import React, { createContext, useContext, useReducer, useEffect } from 'react'
import apiService from '../utils/api'

/**
 * Admin Context for managing admin-specific state and operations
 */

// Initial state
const initialState = {
  // Admin dashboard data
  dashboardData: null,
  systemStats: null,
  
  // User management
  allUsers: [],
  usersLoading: false,
  usersError: null,
  
  // Teacher management
  allTeachers: [],
  teachersLoading: false,
  teachersError: null,
  
  // Student management
  allStudents: [],
  studentsLoading: false,
  studentsError: null,
  
  // Content management
  missionContent: null,
  courses: [],
  showcaseSettings: null,
  
  // System settings
  systemSettings: null,
  
  // Notifications
  notifications: [],
  notificationsLoading: false,
  
  // Loading states
  loading: {
    dashboard: false,
    users: false,
    teachers: false,
    students: false,
    content: false,
    settings: false
  },
  
  // Error states
  errors: {
    dashboard: null,
    users: null,
    teachers: null,
    students: null,
    content: null,
    settings: null
  }
}

// Action types
const ActionTypes = {
  // Dashboard
  SET_DASHBOARD_DATA: 'SET_DASHBOARD_DATA',
  SET_SYSTEM_STATS: 'SET_SYSTEM_STATS',
  SET_DASHBOARD_LOADING: 'SET_DASHBOARD_LOADING',
  SET_DASHBOARD_ERROR: 'SET_DASHBOARD_ERROR',
  
  // Users
  SET_ALL_USERS: 'SET_ALL_USERS',
  SET_USERS_LOADING: 'SET_USERS_LOADING',
  SET_USERS_ERROR: 'SET_USERS_ERROR',
  ADD_USER: 'ADD_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  
  // Teachers
  SET_ALL_TEACHERS: 'SET_ALL_TEACHERS',
  SET_TEACHERS_LOADING: 'SET_TEACHERS_LOADING',
  SET_TEACHERS_ERROR: 'SET_TEACHERS_ERROR',
  ADD_TEACHER: 'ADD_TEACHER',
  UPDATE_TEACHER: 'UPDATE_TEACHER',
  DELETE_TEACHER: 'DELETE_TEACHER',
  
  // Students
  SET_ALL_STUDENTS: 'SET_ALL_STUDENTS',
  SET_STUDENTS_LOADING: 'SET_STUDENTS_LOADING',
  SET_STUDENTS_ERROR: 'SET_STUDENTS_ERROR',
  ADD_STUDENT: 'ADD_STUDENT',
  UPDATE_STUDENT: 'UPDATE_STUDENT',
  DELETE_STUDENT: 'DELETE_STUDENT',
  
  // Content
  SET_MISSION_CONTENT: 'SET_MISSION_CONTENT',
  SET_COURSES: 'SET_COURSES',
  SET_SHOWCASE_SETTINGS: 'SET_SHOWCASE_SETTINGS',
  SET_CONTENT_LOADING: 'SET_CONTENT_LOADING',
  SET_CONTENT_ERROR: 'SET_CONTENT_ERROR',
  
  // Notifications
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  SET_NOTIFICATIONS_LOADING: 'SET_NOTIFICATIONS_LOADING',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
  
  // General
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESET_STATE: 'RESET_STATE'
}

// Reducer
const adminReducer = (state, action) => {
  switch (action.type) {
    // Dashboard
    case ActionTypes.SET_DASHBOARD_DATA:
      return {
        ...state,
        dashboardData: action.payload,
        loading: { ...state.loading, dashboard: false },
        errors: { ...state.errors, dashboard: null }
      }
    
    case ActionTypes.SET_SYSTEM_STATS:
      return {
        ...state,
        systemStats: action.payload
      }
    
    case ActionTypes.SET_DASHBOARD_LOADING:
      return {
        ...state,
        loading: { ...state.loading, dashboard: action.payload }
      }
    
    case ActionTypes.SET_DASHBOARD_ERROR:
      return {
        ...state,
        errors: { ...state.errors, dashboard: action.payload },
        loading: { ...state.loading, dashboard: false }
      }
    
    // Users
    case ActionTypes.SET_ALL_USERS:
      return {
        ...state,
        allUsers: action.payload,
        usersLoading: false,
        usersError: null
      }
    
    case ActionTypes.SET_USERS_LOADING:
      return {
        ...state,
        usersLoading: action.payload
      }
    
    case ActionTypes.SET_USERS_ERROR:
      return {
        ...state,
        usersError: action.payload,
        usersLoading: false
      }
    
    case ActionTypes.ADD_USER:
      return {
        ...state,
        allUsers: [...state.allUsers, action.payload]
      }
    
    case ActionTypes.UPDATE_USER:
      return {
        ...state,
        allUsers: state.allUsers.map(user => 
          user.id === action.payload.id ? action.payload : user
        )
      }
    
    case ActionTypes.DELETE_USER:
      return {
        ...state,
        allUsers: state.allUsers.filter(user => user.id !== action.payload)
      }
    
    // Teachers
    case ActionTypes.SET_ALL_TEACHERS:
      return {
        ...state,
        allTeachers: action.payload,
        teachersLoading: false,
        teachersError: null
      }
    
    case ActionTypes.SET_TEACHERS_LOADING:
      return {
        ...state,
        teachersLoading: action.payload
      }
    
    case ActionTypes.SET_TEACHERS_ERROR:
      return {
        ...state,
        teachersError: action.payload,
        teachersLoading: false
      }
    
    case ActionTypes.ADD_TEACHER:
      return {
        ...state,
        allTeachers: [...state.allTeachers, action.payload]
      }
    
    case ActionTypes.UPDATE_TEACHER:
      return {
        ...state,
        allTeachers: state.allTeachers.map(teacher => 
          teacher.id === action.payload.id ? action.payload : teacher
        )
      }
    
    case ActionTypes.DELETE_TEACHER:
      return {
        ...state,
        allTeachers: state.allTeachers.filter(teacher => teacher.id !== action.payload)
      }
    
    // Students
    case ActionTypes.SET_ALL_STUDENTS:
      return {
        ...state,
        allStudents: action.payload,
        studentsLoading: false,
        studentsError: null
      }
    
    case ActionTypes.SET_STUDENTS_LOADING:
      return {
        ...state,
        studentsLoading: action.payload
      }
    
    case ActionTypes.SET_STUDENTS_ERROR:
      return {
        ...state,
        studentsError: action.payload,
        studentsLoading: false
      }
    
    case ActionTypes.ADD_STUDENT:
      return {
        ...state,
        allStudents: [...state.allStudents, action.payload]
      }
    
    case ActionTypes.UPDATE_STUDENT:
      return {
        ...state,
        allStudents: state.allStudents.map(student => 
          student.id === action.payload.id ? action.payload : student
        )
      }
    
    case ActionTypes.DELETE_STUDENT:
      return {
        ...state,
        allStudents: state.allStudents.filter(student => student.id !== action.payload)
      }
    
    // Content
    case ActionTypes.SET_MISSION_CONTENT:
      return {
        ...state,
        missionContent: action.payload
      }
    
    case ActionTypes.SET_COURSES:
      return {
        ...state,
        courses: action.payload
      }
    
    case ActionTypes.SET_SHOWCASE_SETTINGS:
      return {
        ...state,
        showcaseSettings: action.payload
      }
    
    case ActionTypes.SET_CONTENT_LOADING:
      return {
        ...state,
        loading: { ...state.loading, content: action.payload }
      }
    
    case ActionTypes.SET_CONTENT_ERROR:
      return {
        ...state,
        errors: { ...state.errors, content: action.payload },
        loading: { ...state.loading, content: false }
      }
    
    // Notifications
    case ActionTypes.SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload,
        notificationsLoading: false
      }
    
    case ActionTypes.SET_NOTIFICATIONS_LOADING:
      return {
        ...state,
        notificationsLoading: action.payload
      }
    
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications]
      }
    
    case ActionTypes.MARK_NOTIFICATION_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload ? { ...notification, read: true } : notification
        )
      }
    
    // General
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      }
    
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.value }
      }
    
    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        errors: { ...state.errors, [action.payload]: null }
      }
    
    case ActionTypes.RESET_STATE:
      return initialState
    
    default:
      return state
  }
}

// Create context
const AdminContext = createContext()

// Provider component
export const AdminProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState)

  // Action creators
  const actions = {
    // Dashboard actions
    loadDashboardData: async () => {
      dispatch({ type: ActionTypes.SET_DASHBOARD_LOADING, payload: true })
      try {
        console.log('🔍 [ADMIN_CONTEXT] Loading dashboard data')
        const result = await apiService.getAdminDashboard()
        if (result.success) {
          dispatch({ type: ActionTypes.SET_DASHBOARD_DATA, payload: result.data })
          console.log('✅ [ADMIN_CONTEXT] Dashboard data loaded successfully')
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error loading dashboard data:', error)
        dispatch({ type: ActionTypes.SET_DASHBOARD_ERROR, payload: error.message })
      }
    },

    // User management actions
    loadAllUsers: async (filters = {}) => {
      dispatch({ type: ActionTypes.SET_USERS_LOADING, payload: true })
      try {
        console.log('🔍 [ADMIN_CONTEXT] Loading all users', { filters })
        const result = await apiService.getAllUsers(filters)
        if (result.success) {
          dispatch({ type: ActionTypes.SET_ALL_USERS, payload: result.users })
          console.log('✅ [ADMIN_CONTEXT] Users loaded successfully', { count: result.users.length })
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error loading users:', error)
        dispatch({ type: ActionTypes.SET_USERS_ERROR, payload: error.message })
      }
    },

    createUser: async (userData) => {
      try {
        console.log('🔍 [ADMIN_CONTEXT] Creating user', { userData })
        const result = await apiService.createUser(userData)
        if (result.success) {
          dispatch({ type: ActionTypes.ADD_USER, payload: result.user })
          console.log('✅ [ADMIN_CONTEXT] User created successfully', { userId: result.user.id })
          return { success: true, user: result.user }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error creating user:', error)
        return { success: false, error: error.message }
      }
    },

    updateUser: async (userId, userData) => {
      try {
        console.log('🔍 [ADMIN_CONTEXT] Updating user', { userId, userData })
        const result = await apiService.updateUser(userId, userData)
        if (result.success) {
          dispatch({ type: ActionTypes.UPDATE_USER, payload: result.user })
          console.log('✅ [ADMIN_CONTEXT] User updated successfully', { userId })
          return { success: true, user: result.user }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error updating user:', error)
        return { success: false, error: error.message }
      }
    },

    deleteUser: async (userId) => {
      try {
        console.log('🔍 [ADMIN_CONTEXT] Deleting user', { userId })
        const result = await apiService.deleteUser(userId)
        if (result.success) {
          dispatch({ type: ActionTypes.DELETE_USER, payload: userId })
          console.log('✅ [ADMIN_CONTEXT] User deleted successfully', { userId })
          return { success: true }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error deleting user:', error)
        return { success: false, error: error.message }
      }
    },

    // Teacher management actions
    loadAllTeachers: async (filters = {}) => {
      dispatch({ type: ActionTypes.SET_TEACHERS_LOADING, payload: true })
      try {
        console.log('🔍 [ADMIN_CONTEXT] Loading all teachers', { filters })
        const result = await apiService.getAllTeachers(filters)
        if (result.success) {
          dispatch({ type: ActionTypes.SET_ALL_TEACHERS, payload: result.teachers })
          console.log('✅ [ADMIN_CONTEXT] Teachers loaded successfully', { count: result.teachers.length })
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error loading teachers:', error)
        dispatch({ type: ActionTypes.SET_TEACHERS_ERROR, payload: error.message })
      }
    },

    createTeacher: async (teacherData) => {
      try {
        console.log('🔍 [ADMIN_CONTEXT] Creating teacher', { teacherData })
        const result = await apiService.createTeacher(teacherData)
        if (result.success) {
          dispatch({ type: ActionTypes.ADD_TEACHER, payload: result.teacher })
          console.log('✅ [ADMIN_CONTEXT] Teacher created successfully', { teacherId: result.teacher.id })
          return { success: true, teacher: result.teacher }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error creating teacher:', error)
        return { success: false, error: error.message }
      }
    },

    updateTeacher: async (teacherId, teacherData) => {
      try {
        console.log('🔍 [ADMIN_CONTEXT] Updating teacher', { teacherId, teacherData })
        const result = await apiService.updateTeacher(teacherId, teacherData)
        if (result.success) {
          dispatch({ type: ActionTypes.UPDATE_TEACHER, payload: result.teacher })
          console.log('✅ [ADMIN_CONTEXT] Teacher updated successfully', { teacherId })
          return { success: true, teacher: result.teacher }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error updating teacher:', error)
        return { success: false, error: error.message }
      }
    },

    deleteTeacher: async (teacherId) => {
      try {
        console.log('🔍 [ADMIN_CONTEXT] Deleting teacher', { teacherId })
        const result = await apiService.deleteTeacher(teacherId)
        if (result.success) {
          dispatch({ type: ActionTypes.DELETE_TEACHER, payload: teacherId })
          console.log('✅ [ADMIN_CONTEXT] Teacher deleted successfully', { teacherId })
          return { success: true }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error deleting teacher:', error)
        return { success: false, error: error.message }
      }
    },

    // Student management actions
    loadAllStudents: async (filters = {}) => {
      dispatch({ type: ActionTypes.SET_STUDENTS_LOADING, payload: true })
      try {
        console.log('🔍 [ADMIN_CONTEXT] Loading all students', { filters })
        const result = await apiService.getAllStudents(filters)
        if (result.success) {
          dispatch({ type: ActionTypes.SET_ALL_STUDENTS, payload: result.students })
          console.log('✅ [ADMIN_CONTEXT] Students loaded successfully', { count: result.students.length })
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error loading students:', error)
        dispatch({ type: ActionTypes.SET_STUDENTS_ERROR, payload: error.message })
      }
    },

    createStudent: async (studentData) => {
      try {
        console.log('🔍 [ADMIN_CONTEXT] Creating student', { studentData })
        const result = await apiService.createStudent(studentData)
        if (result.success) {
          dispatch({ type: ActionTypes.ADD_STUDENT, payload: result.student })
          console.log('✅ [ADMIN_CONTEXT] Student created successfully', { studentId: result.student.id })
          return { success: true, student: result.student }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error creating student:', error)
        return { success: false, error: error.message }
      }
    },

    updateStudent: async (studentId, studentData) => {
      try {
        console.log('🔍 [ADMIN_CONTEXT] Updating student', { studentId, studentData })
        const result = await apiService.updateStudent(studentId, studentData)
        if (result.success) {
          dispatch({ type: ActionTypes.UPDATE_STUDENT, payload: result.student })
          console.log('✅ [ADMIN_CONTEXT] Student updated successfully', { studentId })
          return { success: true, student: result.student }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error updating student:', error)
        return { success: false, error: error.message }
      }
    },

    deleteStudent: async (studentId) => {
      try {
        console.log('🔍 [ADMIN_CONTEXT] Deleting student', { studentId })
        const result = await apiService.deleteStudent(studentId)
        if (result.success) {
          dispatch({ type: ActionTypes.DELETE_STUDENT, payload: studentId })
          console.log('✅ [ADMIN_CONTEXT] Student deleted successfully', { studentId })
          return { success: true }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error deleting student:', error)
        return { success: false, error: error.message }
      }
    },

    // Content management actions
    loadContent: async () => {
      dispatch({ type: ActionTypes.SET_CONTENT_LOADING, payload: true })
      try {
        console.log('🔍 [ADMIN_CONTEXT] Loading content data')
        const [missionResult, coursesResult, settingsResult] = await Promise.all([
          apiService.getMissionContent(),
          apiService.getCourses(),
          apiService.getShowcaseSettings()
        ])

        if (missionResult.success) {
          dispatch({ type: ActionTypes.SET_MISSION_CONTENT, payload: missionResult.mission })
        }
        if (coursesResult.success) {
          dispatch({ type: ActionTypes.SET_COURSES, payload: coursesResult.courses })
        }
        if (settingsResult.success) {
          dispatch({ type: ActionTypes.SET_SHOWCASE_SETTINGS, payload: settingsResult.settings })
        }

        console.log('✅ [ADMIN_CONTEXT] Content data loaded successfully')
      } catch (error) {
        console.error('❌ [ADMIN_CONTEXT] Error loading content:', error)
        dispatch({ type: ActionTypes.SET_CONTENT_ERROR, payload: error.message })
      }
    },

    // General actions
    setLoading: (key, value) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key, value } })
    },

    setError: (key, value) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: { key, value } })
    },

    clearError: (key) => {
      dispatch({ type: ActionTypes.CLEAR_ERROR, payload: key })
    },

    resetState: () => {
      dispatch({ type: ActionTypes.RESET_STATE })
    }
  }

  // Load initial data when context mounts
  useEffect(() => {
    console.log('🔍 [ADMIN_CONTEXT] Admin context initialized')
    actions.loadDashboardData()
    actions.loadAllUsers()
    actions.loadAllTeachers()
    actions.loadAllStudents()
    actions.loadContent()
  }, [])

  const value = {
    ...state,
    ...actions
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

// Custom hook to use admin context
export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

export default AdminContext
