// API service for making authenticated requests to Netlify Functions
const API_BASE_URL = '/api'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Get auth headers with token
  getAuthHeaders() {
    const token = localStorage.getItem('accessToken')
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
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

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        // Handle 502 Bad Gateway (Netlify Functions not deployed)
        if (response.status === 502) {
          throw new Error('Service temporarily unavailable. Please try again later.')
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      
      // Return a structured error response for better handling
      if (error.message.includes('Service temporarily unavailable')) {
        return {
          success: false,
          error: 'Service temporarily unavailable',
          status: 502
        }
      }
      
      throw error
    }
  }

  // Authentication API
  async login(username, password) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  }

  async refreshToken(refreshToken) {
    return this.makeRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    })
  }

  async logout() {
    return this.makeRequest('/auth/logout', {
      method: 'POST'
    })
  }

  async verifyToken() {
    return this.makeRequest('/auth/verify')
  }

  // Teachers API
  async getTeachers() {
    return this.makeRequest('/teachers')
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
    return this.makeRequest(`/teachers/random/${count}`)
  }

  async getTeacherMonthlyStats(teacherId, year, month) {
    return this.makeRequest(`/teachers/${teacherId}/monthly-stats/${year}/${month}`)
  }

  async searchTeachers(query, page = 1, limit = 50) {
    const params = new URLSearchParams({ q: query, page, limit })
    return this.makeRequest(`/teachers/search?${params}`)
  }

  async getInactiveTeachers() {
    return this.makeRequest('/teachers/inactive')
  }

  // Students API
  async getStudents(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    const queryString = params.toString()
    return this.makeRequest(`/students${queryString ? `?${queryString}` : ''}`)
  }

  async getStudent(studentId) {
    return this.makeRequest(`/students/${studentId}`)
  }

  async createStudent(studentData) {
    return this.makeRequest('/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    })
  }

  async updateStudent(studentId, studentData) {
    return this.makeRequest(`/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    })
  }

  async deleteStudent(studentId) {
    return this.makeRequest(`/students/${studentId}`, {
      method: 'DELETE'
    })
  }

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
      body: JSON.stringify({
        schedule_id: scheduleId,
        status,
        attendance_date: attendanceDate
      })
    })
  }

  async updateAttendance(attendanceId, status, attendanceDate) {
    return this.makeRequest(`/attendance/${attendanceId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        attendance_date: attendanceDate
      })
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

  async getAttendanceStats(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
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
  async getMissionContent() {
    return this.makeRequest('/content/mission')
  }

  async updateMissionContent(missionData) {
    return this.makeRequest('/content/mission', {
      method: 'PUT',
      body: JSON.stringify(missionData)
    })
  }

  async getCourses(activeOnly = false) {
    const params = activeOnly ? '?active_only=true' : ''
    return this.makeRequest(`/content/courses${params}`)
  }

  async getCourse(courseId) {
    return this.makeRequest(`/content/courses/${courseId}`)
  }

  async createCourse(courseData) {
    return this.makeRequest('/content/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    })
  }

  async updateCourse(courseId, courseData) {
    return this.makeRequest(`/content/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData)
    })
  }

  async deleteCourse(courseId) {
    return this.makeRequest(`/content/courses/${courseId}`, {
      method: 'DELETE'
    })
  }

  async getShowcaseSettings() {
    return this.makeRequest('/content/showcase')
  }

  async updateShowcaseSettings(settings) {
    return this.makeRequest('/content/showcase', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  }

  async setFeaturedTeachers(teacherIds) {
    return this.makeRequest('/content/featured-teachers', {
      method: 'POST',
      body: JSON.stringify({ teacher_ids: teacherIds })
    })
  }

  async getActiveCourses() {
    return this.makeRequest('/content/courses/active')
  }

  async toggleCourse(courseId, isActive) {
    return this.makeRequest(`/content/courses/${courseId}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive })
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

  // Analytics API
  async getSystemOverview(period = '30') {
    return this.makeRequest(`/analytics/overview?period=${period}`)
  }

  async getTeacherAnalytics(period = '30') {
    return this.makeRequest(`/analytics/teachers?period=${period}`)
  }

  async getStudentAnalytics(period = '30') {
    return this.makeRequest(`/analytics/students?period=${period}`)
  }

  async getAttendanceAnalytics(period = '30') {
    return this.makeRequest(`/analytics/attendance?period=${period}`)
  }

  async getMonthlyTeacherStats(teacherId, year, month) {
    return this.makeRequest(`/analytics/monthly/${teacherId}?year=${year}&month=${month}`)
  }

  async getPerformanceTrends(period = '90') {
    return this.makeRequest(`/analytics/trends?period=${period}`)
  }

  async exportAnalyticsData(type, format = 'json') {
    return this.makeRequest('/analytics/export', {
      method: 'POST',
      body: JSON.stringify({ type, format })
    })
  }

  async getDashboardData() {
    return this.makeRequest('/analytics/dashboard')
  }

  async getPerformanceMetrics(teacherId = null) {
    const params = teacherId ? `?teacherId=${teacherId}` : ''
    return this.makeRequest(`/analytics/performance${params}`)
  }

  async getAnalyticsReports(type = 'overview', period = '30') {
    return this.makeRequest(`/analytics/reports?type=${type}&period=${period}`)
  }

  // Users API
  async getAllUsers(filters = {}) {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.role) params.append('role', filters.role)
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active)
    const queryString = params.toString()
    return this.makeRequest(`/users${queryString ? `?${queryString}` : ''}`)
  }

  async getUser(userId) {
    return this.makeRequest(`/users/${userId}`)
  }

  async createUser(userData) {
    return this.makeRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  }

  async updateUser(userId, userData) {
    return this.makeRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    })
  }

  async deleteUser(userId) {
    return this.makeRequest(`/users/${userId}`, {
      method: 'DELETE'
    })
  }

  async suspendUser(userId, reason) {
    return this.makeRequest(`/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
  }

  async unsuspendUser(userId) {
    return this.makeRequest(`/users/${userId}/unsuspend`, {
      method: 'POST'
    })
  }

  async getUserActivity(userId, period = '30') {
    return this.makeRequest(`/users/activity/${userId}?period=${period}`)
  }

  async getUserRoles() {
    return this.makeRequest('/users/roles')
  }

  // Dashboard API
  async getAdminDashboard(period = '30') {
    return this.makeRequest(`/dashboard/admin?period=${period}`)
  }

  async getTeacherDashboard(period = '30') {
    return this.makeRequest(`/dashboard/teacher?period=${period}`)
  }

  async getDashboardStats(period = '30') {
    return this.makeRequest(`/dashboard/stats?period=${period}`)
  }

  async getNotifications() {
    return this.makeRequest('/dashboard/notifications')
  }

  async markNotificationRead(notificationId) {
    return this.makeRequest('/dashboard/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notification_id: notificationId })
    })
  }

  async getUpcomingLessons(days = 7) {
    return this.makeRequest(`/dashboard/upcoming?days=${days}`)
  }

  async getRecentActivity(limit = 10) {
    return this.makeRequest(`/dashboard/recent?limit=${limit}`)
  }
}

// Create and export a singleton instance
const apiService = new ApiService()
export default apiService
