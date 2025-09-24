// Test helper functions for the language school application

export const mockTeachers = [
  {
    id: 1,
    name: 'Michael Chen',
    email: 'michael.chen@langschool.com',
    photo_url: '/pics/teachers/michael.jpg',
    description: 'Native Mandarin speaker teaching Chinese language and culture.',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

export const mockStudents = [
  {
    id: 1,
    name: 'Emma Wilson',
    lessons_per_week: 2,
    added_date: '2024-01-15',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 2,
    name: 'James Brown',
    lessons_per_week: 1,
    added_date: '2024-02-03',
    is_active: true,
    created_at: '2024-02-03T00:00:00Z',
    updated_at: '2024-02-03T00:00:00Z'
  }
]

export const mockSchedules = [
  {
    id: 1,
    student_id: 1,
    teacher_id: 1,
    day_of_week: 1,
    time_slot: '9:00-9:30',
    week_start_date: '2024-01-15',
    attendance_status: 'scheduled',
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 2,
    student_id: 2,
    teacher_id: 1,
    day_of_week: 2,
    time_slot: '14:00-14:30',
    week_start_date: '2024-01-15',
    attendance_status: 'completed',
    attendance_date: '2024-01-16',
    created_at: '2024-01-15T00:00:00Z'
  }
]

export const mockCourses = [
  {
    id: 1,
    name: 'English for Beginners',
    description: 'Start your English learning journey with our comprehensive beginner course.',
    detailed_description: 'Our English for Beginners course is designed to take you from zero to conversational level in just 6 months.',
    background_image: '/pics/courses/english-beginner.jpg',
    is_active: true,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Business English Mastery',
    description: 'Advanced business communication skills for professionals.',
    detailed_description: 'Master the art of professional communication with our Business English course.',
    background_image: '/pics/courses/business-english.jpg',
    is_active: true,
    display_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

export const mockMission = {
  id: 1,
  title: 'Our Mission',
  content: 'At LangSchool, we believe that language learning should be engaging, practical, and accessible to everyone.',
  banner_image: '/pics/banners/mission-banner.jpg',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockAttendanceStats = {
  completed_lessons: 15,
  absent_lessons: 3,
  scheduled_lessons: 8,
  total_lessons: 26,
  attendance_rate: 83.33
}

export const mockLessonReports = [
  {
    id: 1,
    student_id: 1,
    teacher_id: 1,
    lesson_date: '2024-01-16',
    time_slot: '9:00-9:30',
    comment: 'Great progress with pronunciation! Emma is becoming more confident in speaking.',
    created_at: '2024-01-16T09:30:00Z',
    updated_at: '2024-01-16T09:30:00Z'
  }
]

// Mock API responses
export const mockApiResponses = {
  teachers: {
    success: true,
    teachers: mockTeachers,
    total: mockTeachers.length
  },
  students: {
    success: true,
    students: mockStudents,
    total: mockStudents.length
  },
  schedules: {
    success: true,
    schedule: mockSchedules
  },
  courses: {
    success: true,
    courses: mockCourses
  },
  mission: {
    success: true,
    mission: mockMission
  },
  attendanceStats: {
    success: true,
    stats: mockAttendanceStats
  },
  reports: {
    success: true,
    reports: mockLessonReports
  }
}

// Test utilities
export const createMockUser = (role = 'admin', teacherId = null) => ({
  id: role === 'admin' ? 1 : 1,
  username: role === 'admin' ? 'admin' : 'michael.chen',
  role,
  teacherId: role === 'teacher' ? 1 : teacherId,
  teacher_name: role === 'teacher' ? 'Michael Chen' : null
})

export const createMockAuthContext = (user = createMockUser()) => ({
  user,
  isAuthenticated: true,
  login: jest.fn().mockResolvedValue({ success: true }),
  logout: jest.fn(),
  loading: false
})

// Component test helpers
export const renderWithAuth = (component, user = createMockUser()) => {
  const AuthContext = require('../context/AuthContext').AuthContext
  return (
    <AuthContext.Provider value={createMockAuthContext(user)}>
      {component}
    </AuthContext.Provider>
  )
}

// API test helpers
export const mockApiService = {
  getTeachers: jest.fn().mockResolvedValue(mockApiResponses.teachers),
  getStudents: jest.fn().mockResolvedValue(mockApiResponses.students),
  getSchedules: jest.fn().mockResolvedValue(mockApiResponses.schedules),
  getCourses: jest.fn().mockResolvedValue(mockApiResponses.courses),
  getMissionContent: jest.fn().mockResolvedValue(mockApiResponses.mission),
  getAttendanceStats: jest.fn().mockResolvedValue(mockApiResponses.attendanceStats),
  getReports: jest.fn().mockResolvedValue(mockApiResponses.reports),
  createTeacher: jest.fn().mockResolvedValue({ success: true }),
  createStudent: jest.fn().mockResolvedValue({ success: true }),
  updateTeacher: jest.fn().mockResolvedValue({ success: true }),
  updateStudent: jest.fn().mockResolvedValue({ success: true }),
  deleteTeacher: jest.fn().mockResolvedValue({ success: true }),
  deleteStudent: jest.fn().mockResolvedValue({ success: true }),
  markAttendance: jest.fn().mockResolvedValue({ success: true }),
  createReport: jest.fn().mockResolvedValue({ success: true }),
  uploadImage: jest.fn().mockResolvedValue({ success: true, data: { secure_url: 'https://example.com/image.jpg' } })
}

// Form test helpers
export const fillForm = (container, formData) => {
  Object.entries(formData).forEach(([name, value]) => {
    const input = container.querySelector(`[name="${name}"]`) || container.querySelector(`input[placeholder*="${name}"]`)
    if (input) {
      input.value = value
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
}

export const submitForm = (container, formSelector = 'form') => {
  const form = container.querySelector(formSelector)
  if (form) {
    form.dispatchEvent(new Event('submit', { bubbles: true }))
  }
}

// Date utilities for testing
export const getCurrentWeekStart = () => {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export const getWeekEnd = (weekStart) => {
  const endDate = new Date(weekStart)
  endDate.setDate(endDate.getDate() + 6)
  return endDate.toISOString().split('T')[0]
}

// Validation helpers

export const validatePassword = (password) => {
  return password && password.length >= 6
}

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0
}

// Mock file for testing uploads
export const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Mock base64 image for testing
export const mockBase64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

export default {
  mockTeachers,
  mockStudents,
  mockSchedules,
  mockCourses,
  mockMission,
  mockAttendanceStats,
  mockLessonReports,
  mockApiResponses,
  createMockUser,
  createMockAuthContext,
  renderWithAuth,
  mockApiService,
  fillForm,
  submitForm,
  getCurrentWeekStart,
  getWeekEnd,
  validatePassword,
  validateRequired,
  createMockFile,
  mockBase64Image
}
