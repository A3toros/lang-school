// API service for making authenticated requests to Netlify Functions
import apiDebugger from './debug'

const API_BASE_URL = '/api'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Get auth headers with token
  getAuthHeaders() {
    const token = localStorage.getItem('accessToken')
    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    return headers
  }

  // Make public request (no authentication)
  async makePublicRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      ...options,
      headers: {
      'Content-Type': 'application/json',
        ...options.headers
      }
    }

    const startTime = Date.now()
    const method = options.method || 'GET'

    // Log request
    apiDebugger.logRequest(method, url, options.body ? JSON.parse(options.body) : null)

    try {
      const response = await fetch(url, config)
      const duration = Date.now() - startTime
      
      // Log response status
      apiDebugger.debug('NETWORK', `Response received for ${method} ${url}`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (!response.ok) {
        // Handle 502 Bad Gateway (Netlify Functions not deployed)
        if (response.status === 502) {
          const error = new Error('Service temporarily unavailable. Please try again later.')
          apiDebugger.logError(method, url, error)
          throw error
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const error = new Error(errorData.error || `HTTP ${response.status}`)
        apiDebugger.logError(method, url, error)
        throw error
      }

      const data = await response.json()
      
      // Log successful response
      apiDebugger.logResponse(method, url, { status: response.status, data }, duration)
      
      return data
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log error
      apiDebugger.logError(method, url, error)
      
      // Return a structured error response for better handling
      if (error.message.includes('Service temporarily unavailable')) {
        const errorResponse = {
          success: false,
          error: 'Service temporarily unavailable',
          status: 502
        }
        apiDebugger.logResponse(method, url, errorResponse, duration)
        return errorResponse
      }
      
      // Handle network errors (backend not running)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        apiDebugger.warning('API', 'Backend server not available, using fallback data', { 
          endpoint, 
          error: error.message 
        })
        const errorResponse = {
          success: false,
          error: 'Backend server not available',
          status: 0
        }
        apiDebugger.logResponse(method, url, errorResponse, duration)
        return errorResponse
      }
      
      throw error
    }
  }

  // Make authenticated request
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    }

    const startTime = Date.now()
    const method = options.method || 'GET'

    // Log request
    apiDebugger.logRequest(method, url, options.body ? JSON.parse(options.body) : null)

    try {
      const response = await fetch(url, config)
      const duration = Date.now() - startTime
      
      // Log response status
      apiDebugger.debug('NETWORK', `Response received for ${method} ${url}`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (!response.ok) {
        // Handle 502 Bad Gateway (Netlify Functions not deployed)
        if (response.status === 502) {
          const error = new Error('Service temporarily unavailable. Please try again later.')
          apiDebugger.logError(method, url, error)
          throw error
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const error = new Error(errorData.error || `HTTP ${response.status}`)
        apiDebugger.logError(method, url, error)
        throw error
      }

      const data = await response.json()
      
      // Log successful response
      apiDebugger.logResponse(method, url, { status: response.status, data }, duration)
      
      return data
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log error
      apiDebugger.logError(method, url, error)
      
      // Return a structured error response for better handling
      if (error.message.includes('Service temporarily unavailable')) {
        const errorResponse = {
          success: false,
          error: 'Service temporarily unavailable',
          status: 502
        }
        apiDebugger.logResponse(method, url, errorResponse, duration)
        return errorResponse
      }
      
      throw error
    }
  }

  // Authentication API
  async login(username, password) {
    apiDebugger.info('AUTH', 'Attempting login', { username, hasPassword: !!password })
    
    try {
      const result = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
      
      if (result.success) {
        apiDebugger.success('AUTH', 'Login successful', { 
          username, 
          role: result.user?.role,
          userId: result.user?.id 
        })
      } else {
        apiDebugger.warning('AUTH', 'Login failed', { username, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('AUTH', 'Login error', { username, error: error.message })
      throw error
    }
  }

  async refreshToken(refreshToken) {
    apiDebugger.debug('AUTH', 'Refreshing token', { hasToken: !!refreshToken })
    
    try {
      const result = await this.makeRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    })
      
      if (result.success) {
        apiDebugger.success('AUTH', 'Token refreshed successfully')
      } else {
        apiDebugger.warning('AUTH', 'Token refresh failed', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('AUTH', 'Token refresh error', { error: error.message })
      throw error
    }
  }

  async logout() {
    return this.makeRequest('/auth/logout', {
      method: 'POST'
    })
  }

  async verifyToken() {
    return this.makeRequest('/auth/verify')
  }

  async changePassword(oldPassword, newPassword) {
    return this.makeRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    })
  }

  async getProfile() {
    return this.makeRequest('/auth/profile')
  }

  async validateCredentials(username, password) {
    return this.makeRequest('/auth/validate-credentials', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  }

  async checkUsername(username) {
    return this.makeRequest(`/auth/check-username/${encodeURIComponent(username)}`)
  }

  // Teachers API
  async getTeachers(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    const queryString = params.toString()
    return this.makeRequest(`/teachers${queryString ? `?${queryString}` : ''}`)
  }

  async getTeacher(teacherId) {
    return this.makeRequest(`/teachers/${teacherId}`)
  }

  async createTeacher(teacherData) {
    return this.makeRequest('/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData)
    })
  }

  async updateTeacher(teacherId, teacherData) {
    return this.makeRequest(`/teachers/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData)
    })
  }

  async deactivateTeacher(teacherId) {
    return this.makeRequest(`/teachers/${teacherId}/deactivate`, {
      method: 'POST'
    })
  }

  async deleteTeacher(teacherId) {
    return this.makeRequest(`/teachers/${teacherId}`, {
      method: 'DELETE'
    })
  }

  async reactivateTeacher(teacherId) {
    return this.makeRequest(`/teachers/${teacherId}/reactivate`, {
      method: 'POST'
    })
  }

  async getTeacherStudents(teacherId) {
    return this.makeRequest(`/teachers/${teacherId}/students`)
  }

  async getTeacherSchedule(teacherId, weekStart) {
    const params = weekStart ? `?week_start=${weekStart}` : ''
    return this.makeRequest(`/teachers/${teacherId}/schedule${params}`)
  }

  async getTeacherStats(teacherId) {
    return this.makeRequest(`/teachers/${teacherId}/stats`)
  }

  async getRandomTeachers(count = 3) {
    apiDebugger.info('TEACHERS', 'Fetching random teachers (public)', { count })
    
    try {
      const result = await this.makePublicRequest(`/teachers/random/${count}`)
      
      if (result.success) {
        apiDebugger.success('TEACHERS', 'Random teachers fetched', { 
          count: result.teachers?.length || 0,
          teacherIds: result.teachers?.map(t => t.id) || []
        })
        return result
      } else {
        apiDebugger.warning('TEACHERS', 'Failed to fetch random teachers from API', { 
          count, 
          error: result.error 
        })
        
        // Return fallback data when API fails
        const fallbackTeachers = [
          {
            id: 1,
            name: 'Sarah Johnson',
            description: 'Experienced English teacher with 10+ years of experience. Specializes in business English and conversation practice.',
            photo_url: '/pics/teachers/sarah.jpg'
          },
          {
            id: 2,
            name: 'Michael Chen',
            description: 'Native Mandarin speaker teaching Chinese language and culture. Patient and encouraging teaching style.',
            photo_url: '/pics/teachers/michael.jpg'
          },
          {
            id: 3,
            name: 'Elena Rodriguez',
            description: 'Spanish teacher from Madrid with expertise in grammar and pronunciation. Loves teaching through music and culture.',
            photo_url: '/pics/teachers/elena.jpg'
          }
        ].slice(0, count)
        
        apiDebugger.info('TEACHERS', 'Using fallback teacher data', { 
          count: fallbackTeachers.length,
          reason: 'API unavailable'
        })
        
        return {
          success: true,
          teachers: fallbackTeachers,
          fallback: true
        }
      }
    } catch (error) {
      apiDebugger.error('TEACHERS', 'Error fetching random teachers', { 
        count, 
        error: error.message 
      })
      
      // Return fallback data on error
      const fallbackTeachers = [
        {
          id: 1,
          name: 'Sarah Johnson',
          description: 'Experienced English teacher with 10+ years of experience. Specializes in business English and conversation practice.',
          photo_url: '/pics/teachers/sarah.jpg'
        },
        {
          id: 2,
          name: 'Michael Chen',
          description: 'Native Mandarin speaker teaching Chinese language and culture. Patient and encouraging teaching style.',
          photo_url: '/pics/teachers/michael.jpg'
        },
        {
          id: 3,
          name: 'Elena Rodriguez',
          description: 'Spanish teacher from Madrid with expertise in grammar and pronunciation. Loves teaching through music and culture.',
          photo_url: '/pics/teachers/elena.jpg'
        }
      ].slice(0, count)
      
      apiDebugger.info('TEACHERS', 'Using fallback teacher data due to error', { 
        count: fallbackTeachers.length,
        error: error.message
      })
      
      return {
        success: true,
        teachers: fallbackTeachers,
        fallback: true
      }
    }
  }

  async getTeacherMonthlyStats(teacherId, year, month) {
    return this.makeRequest(`/teachers/${teacherId}/monthly-stats/${year}/${month}`)
  }

  async getTeacherAttendance(teacherId, startDate, endDate) {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const queryString = params.toString()
    return this.makeRequest(`/teachers/${teacherId}/attendance${queryString ? `?${queryString}` : ''}`)
  }

  async getTeacherLessons(teacherId, startDate, endDate, page, limit) {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (page) params.append('page', page)
    if (limit) params.append('limit', limit)
    const queryString = params.toString()
    return this.makeRequest(`/teachers/${teacherId}/lessons${queryString ? `?${queryString}` : ''}`)
  }

  async uploadTeacherPhoto(teacherId, photoUrl) {
    return this.makeRequest(`/teachers/${teacherId}/upload-photo`, {
      method: 'POST',
      body: JSON.stringify({ photo_url: photoUrl })
    })
  }

  async searchTeachers(query, page = 1, limit = 50) {
    const params = new URLSearchParams({ q: query, page, limit })
    return this.makeRequest(`/teachers/search?${params}`)
  }

  async getInactiveTeachers() {
    return this.makeRequest('/teachers/inactive')
  }

  async bulkUpdateTeachers(teacherIds, updates) {
    return this.makeRequest('/teachers/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ teacherIds, updates })
    })
  }

  // Students API

  async reactivateStudent(studentId) {
    return this.makeRequest(`/students/${studentId}/reactivate`, {
      method: 'POST'
    })
  }

  async getStudentSchedule(studentId, weekStart) {
    const params = weekStart ? `?week_start=${weekStart}` : ''
    return this.makeRequest(`/students/${studentId}/schedule${params}`)
  }

  async getStudentLessons(studentId) {
    return this.makeRequest(`/students/${studentId}/lessons`)
  }

  async reassignStudent(studentId, newTeacherId) {
    return this.makeRequest(`/students/${studentId}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ new_teacher_id: newTeacherId })
    })
  }

  async searchStudents(query, page = 1, limit = 50) {
    const params = new URLSearchParams({ q: query, page, limit })
    return this.makeRequest(`/students/search?${params}`)
  }

  async getStudentAttendance(studentId, period) {
    const params = period ? `?period=${period}` : ''
    return this.makeRequest(`/students/${studentId}/attendance${params}`)
  }

  async getStudentProgress(studentId) {
    return this.makeRequest(`/students/${studentId}/progress`)
  }

  async getStudentsByTeacher(teacherId) {
    return this.makeRequest(`/students/teacher/${teacherId}`)
  }

  async getInactiveStudents() {
    return this.makeRequest('/students/inactive')
  }

  async exportStudents() {
    return this.makeRequest('/students/export')
  }

  async getStudentTeachers(studentId) {
    return this.makeRequest(`/students/${studentId}/teachers`)
  }

  async bulkUpdateStudents(studentIds, updates) {
    return this.makeRequest('/students/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ studentIds, updates })
    })
  }

  // Schedules API
  async getSchedules(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    const queryString = params.toString()
    return this.makeRequest(`/schedules${queryString ? `?${queryString}` : ''}`)
  }

  async getWeeklySchedule(date) {
    return this.makeRequest(`/schedules/week/${date}`)
  }

  async createSchedule(scheduleData) {
    return this.makeRequest('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData)
    })
  }

  async updateSchedule(scheduleId, scheduleData) {
    return this.makeRequest(`/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData)
    })
  }

  async deleteSchedule(scheduleId) {
    return this.makeRequest(`/schedules/${scheduleId}`, {
      method: 'DELETE'
    })
  }

  async bulkUpdateSchedules(schedules) {
    return this.makeRequest('/schedules/bulk', {
      method: 'POST',
      body: JSON.stringify({ schedules })
    })
  }

  // Mark attendance for a specific schedule (completed | absent | absent_warned)
  async markScheduleAttendance(scheduleId, status, attendanceDate) {
    return this.makeRequest(`/schedules/${scheduleId}/attendance`, {
      method: 'POST',
      body: JSON.stringify({ status, date: attendanceDate })
    })
  }

  async getScheduleConflicts(weekStart) {
    const params = weekStart ? `?week_start=${weekStart}` : ''
    return this.makeRequest(`/schedules/conflicts${params}`)
  }

  async getTeacherSchedules(teacherId, weekStart) {
    const params = weekStart ? `?week_start=${weekStart}` : ''
    return this.makeRequest(`/schedules/teacher/${teacherId}${params}`)
  }

  async getStudentSchedules(studentId, weekStart) {
    const params = weekStart ? `?week_start=${weekStart}` : ''
    return this.makeRequest(`/schedules/student/${studentId}${params}`)
  }

  async getMonthlySchedules(year, month) {
    return this.makeRequest(`/schedules/month/${year}/${month}`)
  }

  async saveWeekSchedule(weekStartDate, schedules) {
    return this.makeRequest('/schedules/save-week', {
      method: 'POST',
      body: JSON.stringify({ week_start_date: weekStartDate, schedules })
    })
  }

  async discardChanges() {
    return this.makeRequest('/schedules/discard-changes', {
      method: 'POST'
    })
  }

  async getAvailableSlots(teacherId, dayOfWeek, weekStartDate) {
    const params = new URLSearchParams({
      teacher_id: teacherId,
      day_of_week: dayOfWeek,
      week_start_date: weekStartDate
    })
    return this.makeRequest(`/schedules/available-slots?${params}`)
  }

  async reassignStudentSchedules(studentId, newTeacherId, scheduleIds) {
    return this.makeRequest('/schedules/reassign-student', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, new_teacher_id: newTeacherId, schedule_ids: scheduleIds })
    })
  }

  async reassignStudentInSchedule(studentId, newTeacherId, scheduleIds) {
    return this.makeRequest('/schedules/reassign-student', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        new_teacher_id: newTeacherId,
        schedule_ids: scheduleIds
      })
    })
  }

  // Attendance API
  async getAttendance(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    const queryString = params.toString()
    return this.makeRequest(`/attendance${queryString ? `?${queryString}` : ''}`)
  }

  async markAttendance(scheduleId, status, attendanceDate) {
    return this.makeRequest('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ schedule_id: scheduleId, status, attendance_date: attendanceDate })
    })
  }

  async updateAttendance(attendanceId, status, attendanceDate) {
    return this.makeRequest(`/attendance/${attendanceId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, attendance_date: attendanceDate })
    })
  }

  async getTeacherAttendance(teacherId, period) {
    const params = period ? `?period=${period}` : ''
    return this.makeRequest(`/attendance/teacher/${teacherId}${params}`)
  }

  async getStudentAttendance(studentId, period) {
    const params = period ? `?period=${period}` : ''
    return this.makeRequest(`/attendance/student/${studentId}${params}`)
  }

  async getAttendanceStats(teacherId, studentId, period) {
    const params = new URLSearchParams()
    if (teacherId) params.append('teacher_id', teacherId)
    if (studentId) params.append('student_id', studentId)
    if (period) params.append('period', period)
    const queryString = params.toString()
    return this.makeRequest(`/attendance/stats${queryString ? `?${queryString}` : ''}`)
  }

  async getWeeklyAttendance(date) {
    return this.makeRequest(`/attendance/week/${date}`)
  }

  async getMonthlyAttendance(year, month) {
    return this.makeRequest(`/attendance/month/${year}/${month}`)
  }

  async bulkMarkAttendance(attendanceUpdates) {
    return this.makeRequest('/attendance/bulk-mark', {
      method: 'POST',
      body: JSON.stringify({ attendance_updates: attendanceUpdates })
    })
  }

  async exportAttendance(period) {
    const params = period ? `?period=${period}` : ''
    return this.makeRequest(`/attendance/export${params}`)
  }

  // Analytics (date-range, bucket=week|month)
  async getStudentAttendanceAnalytics(studentId, from, to, bucket = 'week') {
    const params = new URLSearchParams()
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    params.append('bucket', bucket)
    return this.makeRequest(`/analytics/students/${studentId}/attendance?${params.toString()}`)
  }

  async getTeacherAttendanceAnalytics(teacherId, from, to, bucket = 'week') {
    const params = new URLSearchParams()
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    params.append('bucket', bucket)
    return this.makeRequest(`/analytics/teachers/${teacherId}/attendance?${params.toString()}`)
  }

  async getMyTeacherAttendanceAnalytics(from, to, bucket = 'week') {
    const params = new URLSearchParams()
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    params.append('bucket', bucket)
    return this.makeRequest(`/analytics/teachers/me/attendance?${params.toString()}`)
  }


  // Lesson Reports API
  async getReports(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    const queryString = params.toString()
    return this.makeRequest(`/reports${queryString ? `?${queryString}` : ''}`)
  }

  async getReport(reportId) {
    return this.makeRequest(`/reports/${reportId}`)
  }

  async createReport(reportData) {
    return this.makeRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData)
    })
  }

  async updateReport(reportId, reportData) {
    return this.makeRequest(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(reportData)
    })
  }

  async deleteReport(reportId) {
    return this.makeRequest(`/reports/${reportId}`, {
      method: 'DELETE'
    })
  }

  async getTeacherReports(teacherId, filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    const queryString = params.toString()
    return this.makeRequest(`/reports/teacher/${teacherId}${queryString ? `?${queryString}` : ''}`)
  }

  async getStudentReports(studentId, filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    const queryString = params.toString()
    return this.makeRequest(`/reports/student/${studentId}${queryString ? `?${queryString}` : ''}`)
  }

  async getReportsByDate(date) {
    return this.makeRequest(`/reports/date/${date}`)
  }

  async getWeeklyReports(date) {
    return this.makeRequest(`/reports/week/${date}`)
  }

  async getMonthlyReports(year, month) {
    return this.makeRequest(`/reports/month/${year}/${month}`)
  }

  async bulkCreateReports(reports) {
    return this.makeRequest('/reports/bulk-create', {
      method: 'POST',
      body: JSON.stringify({ reports })
    })
  }

  async exportReports(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    const queryString = params.toString()
    return this.makeRequest(`/reports/export${queryString ? `?${queryString}` : ''}`)
  }

  // Content Management API
  async setFeaturedTeachers(teacherIds) {
    return this.makeRequest('/content/featured-teachers', {
      method: 'POST',
      body: JSON.stringify({ teacher_ids: teacherIds })
    })
  }

  async reorderCourses(courseOrders) {
    return this.makeRequest('/content/courses/reorder', {
      method: 'POST',
      body: JSON.stringify({ course_orders: courseOrders })
    })
  }

  async exportContent() {
    return this.makeRequest('/content/export')
  }

  // Passwords API
  async getTeacherPassword(teacherId) {
    return this.makeRequest(`/passwords/teacher/${teacherId}`)
  }

  async changeTeacherPassword(teacherId, newPassword) {
    return this.makeRequest(`/passwords/teacher/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify({ new_password: newPassword })
    })
  }

  async resetTeacherPassword(teacherId, newPassword) {
    return this.makeRequest(`/passwords/teacher/${teacherId}/reset`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword })
    })
  }

  async bulkResetPasswords(teacherIds, newPassword) {
    return this.makeRequest('/passwords/bulk-reset', {
      method: 'POST',
      body: JSON.stringify({ teacher_ids: teacherIds, new_password: newPassword })
    })
  }

  async getPasswordHistory(teacherId) {
    return this.makeRequest(`/passwords/history/${teacherId}`)
  }

  async validatePassword(password) {
    return this.makeRequest('/passwords/validate', {
      method: 'POST',
      body: JSON.stringify({ password })
    })
  }

  async getPasswordPolicy() {
    return this.makeRequest('/passwords/policy')
  }

  async checkCurrentPassword(password) {
    return this.makeRequest('/passwords/check-current', {
      method: 'POST',
      body: JSON.stringify({ password })
    })
  }

  // Cloudinary API
  async uploadImage(imageData) {
    return this.makeRequest('/cloudinary/upload', {
      method: 'POST',
      body: JSON.stringify(imageData)
    })
  }

  async deleteImage(publicId) {
    return this.makeRequest('/cloudinary/delete', {
      method: 'DELETE',
      body: JSON.stringify({ public_id: publicId })
    })
  }

  async uploadTeacherPhoto(teacherId, image) {
    return this.makeRequest('/cloudinary/upload-teacher-photo', {
      method: 'POST',
      body: JSON.stringify({ teacher_id: teacherId, image })
    })
  }

  async uploadCourseImage(courseId, image) {
    return this.makeRequest('/cloudinary/upload-course-image', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId, image })
    })
  }

  async uploadMissionBanner(image) {
    return this.makeRequest('/cloudinary/upload-mission-banner', {
      method: 'POST',
      body: JSON.stringify({ image })
    })
  }

  async getTransformedImageUrl(publicId, transformations) {
    const params = new URLSearchParams()
    if (publicId) params.append('public_id', publicId)
    if (transformations) params.append('transformations', transformations)
    const queryString = params.toString()
    return this.makeRequest(`/cloudinary/transform${queryString ? `?${queryString}` : ''}`)
  }

  async bulkUploadImages(images, folder) {
    return this.makeRequest('/cloudinary/bulk-upload', {
      method: 'POST',
      body: JSON.stringify({ images, folder })
    })
  }

  async listImages(folder, maxResults, nextCursor) {
    const params = new URLSearchParams()
    if (folder) params.append('folder', folder)
    if (maxResults) params.append('max_results', maxResults)
    if (nextCursor) params.append('next_cursor', nextCursor)
    const queryString = params.toString()
    return this.makeRequest(`/cloudinary/images${queryString ? `?${queryString}` : ''}`)
  }

  // Students API
  async getStudents(filters = {}) {
    apiDebugger.info('STUDENTS', 'Fetching students', { filters })
    
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value)
        }
      })
      
      const queryString = params.toString()
      const result = await this.makeRequest(`/students${queryString ? `?${queryString}` : ''}`)
      
      if (result.success) {
        apiDebugger.success('STUDENTS', 'Students fetched successfully', { 
          count: result.students?.length || 0,
          total: result.total || 0
        })
      } else {
        apiDebugger.warning('STUDENTS', 'Failed to fetch students', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENTS', 'Error fetching students', { error: error.message })
      throw error
    }
  }

  async getInactiveStudents() {
    apiDebugger.info('STUDENTS', 'Fetching inactive students')
    
    try {
      const result = await this.makeRequest('/students/inactive')
      
      if (result.success) {
        apiDebugger.success('STUDENTS', 'Inactive students fetched', {
          count: result.students?.length || 0
        })
      } else {
        apiDebugger.warning('STUDENTS', 'Failed to fetch inactive students', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENTS', 'Error fetching inactive students', { error: error.message })
      throw error
    }
  }

  async getStudent(studentId) {
    apiDebugger.info('STUDENTS', 'Fetching student', { studentId })
    
    try {
      const result = await this.makeRequest(`/students/${studentId}`)
      
      if (result.success) {
        apiDebugger.success('STUDENTS', 'Student fetched successfully', { studentId })
      } else {
        apiDebugger.warning('STUDENTS', 'Failed to fetch student', { studentId, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENTS', 'Error fetching student', { studentId, error: error.message })
      throw error
    }
  }

  async createStudent(studentData) {
    apiDebugger.info('STUDENTS', 'Creating student', { studentData })
    
    try {
      const result = await this.makeRequest('/students', {
      method: 'POST',
        body: JSON.stringify(studentData)
      })
      
      if (result.success) {
        apiDebugger.success('STUDENTS', 'Student created successfully', { studentId: result.student?.id })
      } else {
        apiDebugger.warning('STUDENTS', 'Failed to create student', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENTS', 'Error creating student', { error: error.message })
      throw error
    }
  }

  async updateStudent(studentId, studentData) {
    apiDebugger.info('STUDENTS', 'Updating student', { studentId, studentData })
    
    try {
      const result = await this.makeRequest(`/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(studentData)
      })
      
      if (result.success) {
        apiDebugger.success('STUDENTS', 'Student updated successfully', { studentId })
      } else {
        apiDebugger.warning('STUDENTS', 'Failed to update student', { studentId, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENTS', 'Error updating student', { studentId, error: error.message })
      throw error
    }
  }

  async deactivateStudent(studentId) {
    apiDebugger.info('STUDENTS', 'Deactivating student', { studentId })
    
    try {
      const result = await this.makeRequest(`/students/${studentId}/deactivate`, {
        method: 'POST'
      })
      
      if (result.success) {
        apiDebugger.success('STUDENTS', 'Student deactivated successfully', { studentId })
      } else {
        apiDebugger.warning('STUDENTS', 'Failed to deactivate student', { studentId, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENTS', 'Error deactivating student', { studentId, error: error.message })
      throw error
    }
  }

  async deleteStudent(studentId) {
    apiDebugger.info('STUDENTS', 'Deleting student', { studentId })
    
    try {
      const result = await this.makeRequest(`/students/${studentId}`, {
        method: 'DELETE'
      })
      
      if (result.success) {
        apiDebugger.success('STUDENTS', 'Student deleted successfully', { studentId })
      } else {
        apiDebugger.warning('STUDENTS', 'Failed to delete student', { studentId, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENTS', 'Error deleting student', { studentId, error: error.message })
      throw error
    }
  }

  // Content API
  async getMissionContent() {
    apiDebugger.info('CONTENT', 'Fetching mission content')
    
    try {
      const result = await this.makeRequest('/content/mission')
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Mission content fetched successfully')
      } else {
        apiDebugger.warning('CONTENT', 'Failed to fetch mission content', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error fetching mission content', { error: error.message })
      throw error
    }
  }

  async updateMissionContent(missionData) {
    apiDebugger.info('CONTENT', 'Updating mission content', { missionData })
    
    try {
      const result = await this.makeRequest('/content/mission', {
      method: 'PUT',
        body: JSON.stringify(missionData)
      })
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Mission content updated successfully')
      } else {
        apiDebugger.warning('CONTENT', 'Failed to update mission content', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error updating mission content', { error: error.message })
      throw error
    }
  }

  async getCourses() {
    apiDebugger.info('CONTENT', 'Fetching courses')
    
    try {
      const result = await this.makeRequest('/content/courses')
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Courses fetched successfully', { 
          count: result.courses?.length || 0 
        })
      } else {
        apiDebugger.warning('CONTENT', 'Failed to fetch courses', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error fetching courses', { error: error.message })
      throw error
    }
  }

  async createCourse(courseData) {
    apiDebugger.info('CONTENT', 'Creating course', { courseData })
    
    try {
      const result = await this.makeRequest('/content/courses', {
      method: 'POST',
        body: JSON.stringify(courseData)
      })
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Course created successfully', { courseId: result.course?.id })
      } else {
        apiDebugger.warning('CONTENT', 'Failed to create course', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error creating course', { error: error.message })
      throw error
    }
  }

  async updateCourse(courseId, courseData) {
    apiDebugger.info('CONTENT', 'Updating course', { courseId, courseData })
    
    try {
      const result = await this.makeRequest(`/content/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify(courseData)
      })
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Course updated successfully', { courseId })
      } else {
        apiDebugger.warning('CONTENT', 'Failed to update course', { courseId, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error updating course', { courseId, error: error.message })
      throw error
    }
  }

  async deleteCourse(courseId) {
    apiDebugger.info('CONTENT', 'Deleting course', { courseId })
    
    try {
      const result = await this.makeRequest(`/content/courses/${courseId}`, {
        method: 'DELETE'
      })
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Course deleted successfully', { courseId })
      } else {
        apiDebugger.warning('CONTENT', 'Failed to delete course', { courseId, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error deleting course', { courseId, error: error.message })
      throw error
    }
  }

  async toggleCourse(courseId, isActive) {
    apiDebugger.info('CONTENT', 'Toggling course', { courseId, isActive })
    
    try {
      const result = await this.makeRequest(`/content/courses/${courseId}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive })
      })
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Course toggled successfully', { courseId, isActive })
      } else {
        apiDebugger.warning('CONTENT', 'Failed to toggle course', { courseId, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error toggling course', { courseId, error: error.message })
      throw error
    }
  }

  async getShowcaseSettings() {
    apiDebugger.info('CONTENT', 'Fetching showcase settings')
    
    try {
      const result = await this.makeRequest('/content/showcase')
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Showcase settings fetched successfully')
      } else {
        apiDebugger.warning('CONTENT', 'Failed to fetch showcase settings', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error fetching showcase settings', { error: error.message })
      throw error
    }
  }

  async updateShowcaseSettings(settings) {
    apiDebugger.info('CONTENT', 'Updating showcase settings', { settings })
    
    try {
      const result = await this.makeRequest('/content/showcase', {
        method: 'PUT',
        body: JSON.stringify(settings)
      })
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Showcase settings updated successfully')
      } else {
        apiDebugger.warning('CONTENT', 'Failed to update showcase settings', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error updating showcase settings', { error: error.message })
      throw error
    }
  }

}

// Create and export a singleton instance
const apiService = new ApiService()
export default apiService
