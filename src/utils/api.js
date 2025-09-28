// API service for making authenticated requests to Netlify Functions
import apiDebugger from './debug'
import { tokenManager } from './tokenManager'
import { initializeDataCache, buildCacheKeys } from './dataCache'

const API_BASE_URL = '/api'

// Initialize a shared data cache (namespaced per user if available)
const userNamespace = (() => {
  try {
    const user = tokenManager.getUserData()
    return user?.id ? `user:${user.id}` : 'anon'
  } catch (_) {
    return 'anon'
  }
})()
const dataCachePromise = initializeDataCache(userNamespace).then(cache => {
  console.log(`🔧 [CACHE] Initialized cache for namespace: ${userNamespace}`)
  return cache
}).catch(error => {
  console.error(`❌ [CACHE] Failed to initialize cache:`, error)
  throw error
})

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Get auth headers with token
  getAuthHeaders() {
    const token = tokenManager.getStoredAccessToken()
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
        error.status = response.status
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

    // Set Content-Type for JSON requests
    if (options.body && typeof options.body === 'string') {
      config.headers['Content-Type'] = 'application/json'
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
        error.status = response.status
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

  // Make request with caching (ETag-aware). Returns cached data on 304 or network error.
  async fetchWithCache(endpoint, options = {}, meta = {}) {
    const url = `${this.baseURL}${endpoint}`
    const method = options.method || 'GET'
    const resource = meta.resource || endpoint.split('?')[0].replace(/^\//, '').replace(/\//g, ':')
    
    // Normalize cache key - use resource + query params for better cache sharing
    const queryString = endpoint.includes('?') ? endpoint.split('?')[1] : ''
    const normalizedQuery = queryString ? `?${queryString}` : ''
    const cacheKeyHint = meta.cacheKey || `${resource}${normalizedQuery}`
    const { dataKey, etagKey } = buildCacheKeys(resource, cacheKeyHint)
    
    // TTL configuration - all set to 5 minutes
    const TTL = 5 * 60 * 1000 // 5 minutes

    const cache = await dataCachePromise
    const cached = await cache.get(dataKey)
    const cachedEtag = await cache.get(etagKey)
    
    // Debug cache state
    console.log(`🔍 [CACHE] ${endpoint}`, {
      hasCachedData: !!cached,
      hasCachedEtag: !!cachedEtag,
      dataKey,
      etagKey,
      resource,
      cacheKeyHint,
      cachedDataSize: cached ? JSON.stringify(cached).length : 0
    })

    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers || {})
    }
    if (cachedEtag && typeof cachedEtag === 'string') {
      headers['If-None-Match'] = cachedEtag
    }

    const startTime = Date.now()
    apiDebugger.logRequest(method, url, options.body ? JSON.parse(options.body) : null)

    try {
      const response = await fetch(url, { ...options, headers })
      const duration = Date.now() - startTime
      const responseHeaders = Object.fromEntries(response.headers.entries())

      apiDebugger.debug('NETWORK', `Response received for ${method} ${url}`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        headers: responseHeaders
      })

      if (response.status === 304 && cached) {
        apiDebugger.success('CACHE', 'Serving cached data (304)', { endpoint })
        return cached
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const error = new Error(errorData.error || `HTTP ${response.status}`)
        error.status = response.status
        apiDebugger.logError(method, url, error)
        // Fallback to cache on network error/5xx
        if (cached) {
          console.log(`⚠️ [CACHE] Network error, returning cached data for ${endpoint}`, {
            status: response.status,
            hasCachedData: !!cached,
            cachedDataSize: JSON.stringify(cached).length
          })
          // Dispatch cache fallback event
          window.dispatchEvent(new CustomEvent('cache:fallback', { 
            detail: { endpoint, resource, reason: 'network_error' } 
          }))
          apiDebugger.warning('CACHE', 'Network error, returning cached data', { endpoint })
          return cached
        } else {
          console.log(`❌ [CACHE] Network error and no cached data for ${endpoint}`, {
            status: response.status,
            hasCachedData: !!cached
          })
        }
        throw error
      }

      const data = await response.json()
      apiDebugger.logResponse(method, url, { status: response.status, data }, duration)

      // Persist new payload and etag
      const etag = response.headers.get('ETag') || response.headers.get('Etag') || response.headers.get('etag')
      // Ensure data is cloneable by deep cloning
      const cloneableData = JSON.parse(JSON.stringify(data))
      
      console.log(`💾 [CACHE] Storing data for ${endpoint}`, {
        dataKey,
        etagKey,
        dataSize: JSON.stringify(cloneableData).length,
        hasEtag: !!etag
      })
      
      await cache.set(dataKey, cloneableData, TTL)
      if (etag) {
        await cache.set(etagKey, etag, TTL)
      }
      
      // Cache warming: Store the same data under common query variations
      await this.warmCacheForResource(resource, cloneableData, etag, cache)
      return data
    } catch (error) {
      console.log(`💥 [CACHE] Exception occurred for ${endpoint}`, {
        error: error.message,
        hasCachedData: !!cached,
        cachedDataSize: cached ? JSON.stringify(cached).length : 0
      })
      apiDebugger.logError(method, url, error)
      if (cached) {
        console.log(`✅ [CACHE] Exception fallback, returning cached data for ${endpoint}`)
        // Dispatch cache fallback event
        window.dispatchEvent(new CustomEvent('cache:fallback', { 
          detail: { endpoint, resource, reason: 'exception' } 
        }))
        apiDebugger.warning('CACHE', 'Error occurred, returning cached data', { endpoint })
        return cached
      } else {
        console.log(`❌ [CACHE] Exception and no cached data for ${endpoint}`)
      }
      throw error
    }
  }

  // Invalidate list cache for a resource
  async invalidateListCache(resource) {
    try {
      const cache = await dataCachePromise
      // Remove all cached list data for this resource
      const keys = await this.getCacheKeys(resource)
      for (const key of keys) {
        if (key.includes(resource)) {
          await cache.remove(key)
        }
      }
    } catch (error) {
      console.warn('Cache invalidation failed:', error)
    }
  }

  // Get cache keys for a resource (simplified version)
  async getCacheKeys(resource) {
    // This is a simplified version - in a real implementation you'd scan the cache
    // For now, we'll just return the common patterns
    return [
      `cache:${resource}`,
      `etag:${resource}`,
      `version:${resource}`
    ]
  }

  // Cache warming: Store data under common query variations for better offline support
  async warmCacheForResource(resource, data, etag, cache) {
    try {
      const commonVariations = {
        'teachers': [
          '?status=active',
          '?status=inactive', 
          ''
        ],
        'students': [
          '?status=active&limit=100',
          '?status=active&page=1&limit=50&sort_by=added_date&sort_order=desc',
          '?status=active'
        ]
      }
      
      const variations = commonVariations[resource] || []
      
      for (const variation of variations) {
        const warmKey = `${resource}${variation}`
        const { dataKey, etagKey } = buildCacheKeys(resource, warmKey)
        
        // Only store if not already cached
        const existing = await cache.get(dataKey)
        if (!existing) {
          console.log(`🔥 [CACHE] Warming cache for ${warmKey}`)
          await cache.set(dataKey, data, this.TTL)
          if (etag) {
            await cache.set(etagKey, etag, this.TTL)
          }
        }
      }
    } catch (error) {
      console.warn('Cache warming failed:', error)
    }
  }

  // Versions endpoint to support background checks
  async getVersions() {
    return this.makeRequest('/versions')
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
    console.log('🔍 [API] getTeachers called with filters:', filters)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value)
      }
    })
    // Add cache-busting parameter to force fresh data
    params.append('_t', Date.now())
    const queryString = params.toString()
    const url = `/teachers${queryString ? `?${queryString}` : ''}`
    console.log('🔍 [API] getTeachers URL:', url)
    const result = await this.fetchWithCache(url, { method: 'GET' }, { resource: 'teachers', cacheKey: queryString })
    console.log('🔍 [API] getTeachers result:', result)
    return result
  }

  async getTeacher(teacherId) {
    return this.fetchWithCache(`/teachers/${teacherId}`, { method: 'GET' }, { 
      resource: 'teacher', 
      cacheKey: teacherId 
    })
  }

  async createTeacher(teacherData) {
    return this.makeRequest('/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData)
    })
  }

  async updateTeacher(teacherId, teacherData) {
    const result = await this.makeRequest(`/teachers/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData)
    })
    
    // Invalidate cache on successful update
    if (result.success) {
      const cache = await dataCachePromise
      await cache.remove(`cache:teacher:${teacherId}`)
      // Invalidate list cache too
      await this.invalidateListCache('teachers')
    }
    
    return result
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
    return this.fetchWithCache(`/teachers/${teacherId}/students`, { method: 'GET' }, { 
      resource: 'teachers', 
      cacheKey: `students-${teacherId}` 
    })
  }

  async getTeacherSchedule(teacherId, weekStart) {
    const params = weekStart ? `?week_start=${weekStart}` : ''
    return this.makeRequest(`/teachers/${teacherId}/schedule${params}`)
  }

  async getTeacherStats(teacherId, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = `/teachers/${teacherId}/stats${queryString ? `?${queryString}` : ''}`
    
    return this.fetchWithCache(url, { method: 'GET' }, { 
      resource: 'teachers', 
      cacheKey: `stats-${teacherId}-${queryString || 'all'}` 
    })
  }

  async getMonthlyLessonStats(month, year) {
    const params = new URLSearchParams({ month, year }).toString()
    const url = `/teachers/monthly-stats?${params}`
    
    return this.fetchWithCache(url, { method: 'GET' }, { 
      resource: 'teachers', 
      cacheKey: `monthly-stats-${year}-${month}` 
    })
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
    return this.fetchWithCache(`/schedules${queryString ? `?${queryString}` : ''}`, { method: 'GET' }, { resource: 'schedules', cacheKey: queryString })
  }

  async getWeeklySchedule(date) {
    return this.makeRequest(`/schedules/week/${date}`)
  }

  async createSchedule(scheduleData) {
    const result = await this.makeRequest('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData)
    })
    
    if (result.success) {
      // Invalidate teachers cache since student count may have changed
      await this.invalidateListCache('teachers')
    }
    
    return result
  }

  async updateSchedule(scheduleId, scheduleData) {
    return this.makeRequest(`/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData)
    })
  }

  async deleteSchedule(scheduleId) {
    const result = await this.makeRequest(`/schedules/${scheduleId}`, {
      method: 'DELETE'
    })
    
    if (result.success) {
      // Invalidate teachers cache since student count may have changed
      await this.invalidateListCache('teachers')
    }
    
    return result
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
    return this.fetchWithCache(`/analytics/students/${studentId}/attendance?${params.toString()}`, 
      { method: 'GET' }, 
      { resource: 'analytics', cacheKey: `student_${studentId}_${from}_${to}` }
    )
  }

  async getTeacherAttendanceAnalytics(teacherId, from, to, bucket = 'week') {
    const params = new URLSearchParams()
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    params.append('bucket', bucket)
    return this.fetchWithCache(`/analytics/teachers/${teacherId}/attendance?${params.toString()}`, 
      { method: 'GET' }, 
      { resource: 'analytics', cacheKey: `teacher_${teacherId}_${from}_${to}` }
    )
  }

  async getMyTeacherAttendanceAnalytics(from, to, bucket = 'week') {
    const params = new URLSearchParams()
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    params.append('bucket', bucket)
    return this.fetchWithCache(`/analytics/teachers/me/attendance?${params.toString()}`, 
      { method: 'GET' }, 
      { resource: 'analytics', cacheKey: `teacher_me_${from}_${to}` }
    )
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
      const result = await this.fetchWithCache(`/students${queryString ? `?${queryString}` : ''}`, { method: 'GET' }, { resource: 'students', cacheKey: queryString })
      
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

  async getStudentMonthlyLessons(month, year) {
    apiDebugger.info('STUDENTS', 'Fetching monthly lessons', { month, year })
    
    try {
      const params = new URLSearchParams({ month, year }).toString()
      const url = `/students/monthly-lessons?${params}`
      
      const result = await this.fetchWithCache(url, { method: 'GET' }, { 
        resource: 'students', 
        cacheKey: `monthly-lessons-${year}-${month}` 
      })
      
      if (result.success) {
        apiDebugger.success('STUDENTS', 'Monthly lessons fetched successfully', { 
          count: result.monthlyLessons?.length || 0,
          month: result.month,
          year: result.year
        })
      } else {
        apiDebugger.warning('STUDENTS', 'Failed to fetch monthly lessons', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENTS', 'Error fetching monthly lessons', { error: error.message })
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
      const result = await this.fetchWithCache(`/students/${studentId}`, { method: 'GET' }, { 
        resource: 'student', 
        cacheKey: studentId 
      })
      
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

  // Cloudinary API
  async uploadImage(imageData, folder = 'lang-school', publicId = null, transformations = null) {
    apiDebugger.info('CLOUDINARY', 'Uploading image', { folder, hasPublicId: !!publicId })
    
    try {
      const result = await this.makeRequest('/cloudinary/upload', {
        method: 'POST',
        body: JSON.stringify({
          image: imageData,
          folder,
          public_id: publicId,
          transformations
        })
      })
      
      if (result.success) {
        apiDebugger.success('CLOUDINARY', 'Image uploaded successfully', { 
          publicId: result.public_id,
          url: result.secure_url 
        })
      } else {
        apiDebugger.warning('CLOUDINARY', 'Failed to upload image', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CLOUDINARY', 'Error uploading image', { error: error.message })
      throw error
    }
  }

  async deleteImage(publicId) {
    apiDebugger.info('CLOUDINARY', 'Deleting image', { publicId })
    
    try {
      const result = await this.makeRequest('/cloudinary/delete', {
        method: 'DELETE',
        body: JSON.stringify({ public_id: publicId })
      })
      
      if (result.success) {
        apiDebugger.success('CLOUDINARY', 'Image deleted successfully', { publicId })
      } else {
        apiDebugger.warning('CLOUDINARY', 'Failed to delete image', { publicId, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CLOUDINARY', 'Error deleting image', { publicId, error: error.message })
      throw error
    }
  }

  async uploadCourseImage(courseId, imageData) {
    apiDebugger.info('CLOUDINARY', 'Uploading course image', { courseId })
    
    try {
      const result = await this.makeRequest('/cloudinary/upload-course-image', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          image: imageData
        })
      })
      
      if (result.success) {
        apiDebugger.success('CLOUDINARY', 'Course image uploaded successfully', { 
          courseId,
          publicId: result.public_id,
          url: result.secure_url 
        })
      } else {
        apiDebugger.warning('CLOUDINARY', 'Failed to upload course image', { courseId, error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CLOUDINARY', 'Error uploading course image', { courseId, error: error.message })
      throw error
    }
  }

  async uploadMissionBanner(imageData) {
    apiDebugger.info('CLOUDINARY', 'Uploading mission banner', {})
    
    try {
      const result = await this.makeRequest('/cloudinary/upload-mission-banner', {
        method: 'POST',
        body: JSON.stringify({
          image: imageData
        })
      })
      
      if (result.success) {
        apiDebugger.success('CLOUDINARY', 'Mission banner uploaded successfully', { 
          publicId: result.public_id,
          url: result.secure_url 
        })
      } else {
        apiDebugger.warning('CLOUDINARY', 'Failed to upload mission banner', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CLOUDINARY', 'Error uploading mission banner', { error: error.message })
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

  async getShowcaseSettingsPublic() {
    apiDebugger.info('CONTENT', 'Fetching showcase settings (public)')
    
    try {
      const result = await this.makePublicRequest('/content/showcase/public')
      
      if (result.success) {
        apiDebugger.success('CONTENT', 'Showcase settings fetched successfully (public)')
      } else {
        apiDebugger.warning('CONTENT', 'Failed to fetch showcase settings (public)', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('CONTENT', 'Error fetching showcase settings (public)', { error: error.message })
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

  // =====================================================
  // TEACHER MANAGEMENT METHODS
  // =====================================================

  async getStudentTeachers(studentId) {
    try {
      apiDebugger.info('TEACHER_MGMT', 'Fetching student teachers', { studentId })
      
      const result = await this.makeRequest(`/students/${studentId}/teachers`, {
        method: 'GET'
      })
      
      if (result.success) {
        apiDebugger.success('TEACHER_MGMT', 'Student teachers fetched successfully', { 
          count: result.teachers?.length || 0 
        })
      } else {
        apiDebugger.warning('TEACHER_MGMT', 'Failed to fetch student teachers', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('TEACHER_MGMT', 'Error fetching student teachers', { error: error.message })
      throw error
    }
  }

  async addStudentTeacher(studentId, teacherData) {
    try {
      apiDebugger.info('TEACHER_MGMT', 'Adding teacher to student', { studentId, teacherData })
      
      const result = await this.makeRequest(`/students/${studentId}/teachers`, {
        method: 'POST',
        body: JSON.stringify(teacherData)
      })
      
      if (result.success) {
        apiDebugger.success('TEACHER_MGMT', 'Teacher added successfully')
        // Invalidate teachers cache since student count changed
        await this.invalidateListCache('teachers')
      } else {
        apiDebugger.warning('TEACHER_MGMT', 'Failed to add teacher', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('TEACHER_MGMT', 'Error adding teacher', { error: error.message })
      throw error
    }
  }

  async removeStudentTeacher(studentId, teacherId) {
    try {
      apiDebugger.info('TEACHER_MGMT', 'Removing teacher from student', { studentId, teacherId })
      
      const result = await this.makeRequest(`/students/${studentId}/teachers/${teacherId}`, {
        method: 'DELETE'
      })
      
      if (result.success) {
        apiDebugger.success('TEACHER_MGMT', 'Teacher removed successfully')
        // Invalidate teachers cache since student count changed
        await this.invalidateListCache('teachers')
      } else {
        apiDebugger.warning('TEACHER_MGMT', 'Failed to remove teacher', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('TEACHER_MGMT', 'Error removing teacher', { error: error.message })
      throw error
    }
  }

  // Student Suggestions API
  async getCurrentStudents(teacherId) {
    try {
      apiDebugger.info('STUDENT_SUGGESTIONS', 'Fetching current students', { teacherId })
      
      const result = await this.makeRequest(`/students/teacher/${teacherId}/current`)
      
      if (result.success) {
        apiDebugger.success('STUDENT_SUGGESTIONS', 'Current students fetched successfully', { count: result.students?.length || 0 })
      } else {
        apiDebugger.warning('STUDENT_SUGGESTIONS', 'Failed to fetch current students', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENT_SUGGESTIONS', 'Error fetching current students', { error: error.message })
      throw error
    }
  }

  async getHistoryStudents(teacherId) {
    try {
      apiDebugger.info('STUDENT_SUGGESTIONS', 'Fetching history students', { teacherId })
      
      const result = await this.makeRequest(`/students/teacher/${teacherId}/history`)
      
      if (result.success) {
        apiDebugger.success('STUDENT_SUGGESTIONS', 'History students fetched successfully', { count: result.students?.length || 0 })
      } else {
        apiDebugger.warning('STUDENT_SUGGESTIONS', 'Failed to fetch history students', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('STUDENT_SUGGESTIONS', 'Error fetching history students', { error: error.message })
      throw error
    }
  }

  // File Management API
  async getFolders() {
    apiDebugger.info('FILES', 'Fetching folders')
    
    try {
      const result = await this.makeRequest('/files/folders')
      
      if (result.success) {
        apiDebugger.success('FILES', 'Folders fetched successfully', { count: result.folders?.length || 0 })
      } else {
        apiDebugger.warning('FILES', 'Failed to fetch folders', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error fetching folders', { error: error.message })
      throw error
    }
  }

  async createFolder(folderData) {
    apiDebugger.info('FILES', 'Creating folder', { folderData })
    
    try {
      const result = await this.makeRequest('/files/folders', {
        method: 'POST',
        body: JSON.stringify(folderData)
      })
      
      if (result.success) {
        apiDebugger.success('FILES', 'Folder created successfully', { folderId: result.folder?.id })
      } else {
        apiDebugger.warning('FILES', 'Failed to create folder', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error creating folder', { error: error.message })
      throw error
    }
  }

  async updateFolder(folderId, folderData) {
    apiDebugger.info('FILES', 'Updating folder', { folderId, folderData })
    
    try {
      const result = await this.makeRequest(`/files/folders/${folderId}`, {
        method: 'PUT',
        body: JSON.stringify(folderData)
      })
      
      if (result.success) {
        apiDebugger.success('FILES', 'Folder updated successfully', { folderId })
      } else {
        apiDebugger.warning('FILES', 'Failed to update folder', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error updating folder', { error: error.message })
      throw error
    }
  }

  async deleteFolder(folderId) {
    apiDebugger.info('FILES', 'Deleting folder', { folderId })
    
    try {
      const result = await this.makeRequest(`/files/folders/${folderId}`, {
        method: 'DELETE'
      })
      
      if (result.success) {
        apiDebugger.success('FILES', 'Folder deleted successfully', { folderId })
      } else {
        apiDebugger.warning('FILES', 'Failed to delete folder', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error deleting folder', { error: error.message })
      throw error
    }
  }

  async uploadFile(fileData) {
    apiDebugger.info('FILES', 'Uploading file', { fileName: fileData.display_name })
    
    try {
      const result = await this.makeRequest('/files/upload', {
        method: 'POST',
        body: JSON.stringify(fileData)
      })
      
      if (result.success) {
        apiDebugger.success('FILES', 'File uploaded successfully', { fileId: result.file?.id })
      } else {
        apiDebugger.warning('FILES', 'Failed to upload file', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error uploading file', { error: error.message })
      throw error
    }
  }

  async updateFile(fileId, fileData) {
    apiDebugger.info('FILES', 'Updating file', { fileId, fileData })
    
    try {
      const result = await this.makeRequest(`/files/${fileId}`, {
        method: 'PUT',
        body: JSON.stringify(fileData)
      })
      
      if (result.success) {
        apiDebugger.success('FILES', 'File updated successfully', { fileId })
      } else {
        apiDebugger.warning('FILES', 'Failed to update file', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error updating file', { error: error.message })
      throw error
    }
  }

  async deleteFile(fileId) {
    apiDebugger.info('FILES', 'Deleting file', { fileId })
    
    try {
      const result = await this.makeRequest(`/files/${fileId}`, {
        method: 'DELETE'
      })
      
      if (result.success) {
        apiDebugger.success('FILES', 'File deleted successfully', { fileId })
      } else {
        apiDebugger.warning('FILES', 'Failed to delete file', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error deleting file', { error: error.message })
      throw error
    }
  }

  async getFiles(filters = {}) {
    apiDebugger.info('FILES', 'Fetching files', { filters })
    
    try {
      const queryString = new URLSearchParams(filters).toString()
      const result = await this.makeRequest(`/files${queryString ? `?${queryString}` : ''}`)
      
      if (result.success) {
        apiDebugger.success('FILES', 'Files fetched successfully', { count: result.files?.length || 0 })
      } else {
        apiDebugger.warning('FILES', 'Failed to fetch files', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error fetching files', { error: error.message })
      throw error
    }
  }

  async downloadFile(fileId) {
    apiDebugger.info('FILES', 'Downloading file', { fileId })
    
    try {
      const result = await this.makePublicRequest(`/files/${fileId}/download/public`)
      
      if (result.success) {
        apiDebugger.success('FILES', 'File download initiated', { fileId })
      } else {
        apiDebugger.warning('FILES', 'Failed to download file', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error downloading file', { error: error.message })
      throw error
    }
  }

  // Public file access for teachers
  async getPublicFiles(filters = {}) {
    apiDebugger.info('FILES', 'Fetching public files', { filters })
    
    try {
      const queryString = new URLSearchParams(filters).toString()
      const result = await this.makePublicRequest(`/files/public${queryString ? `?${queryString}` : ''}`)
      
      if (result.success) {
        apiDebugger.success('FILES', 'Public files fetched successfully', { count: result.files?.length || 0 })
      } else {
        apiDebugger.warning('FILES', 'Failed to fetch public files', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('FILES', 'Error fetching public files', { error: error.message })
      throw error
    }
  }

  // Get signed upload token
  async getUploadToken(uploadData) {
    apiDebugger.info('UPLOAD', 'Getting upload token', { uploadData })
    
    try {
      const result = await this.makeRequest('/upload-token', {
        method: 'POST',
        body: JSON.stringify(uploadData)
      })
      
      if (result.success) {
        apiDebugger.success('UPLOAD', 'Upload token received', { 
          cloudName: result.data?.cloudName,
          hasSignature: !!result.data?.signature
        })
      } else {
        apiDebugger.warning('UPLOAD', 'Failed to get upload token', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('UPLOAD', 'Error getting upload token', { error: error.message })
      throw error
    }
  }

  // Schedule extension methods
  async extendSchedules() {
    return this.makeRequest('/schedules/extend', {
      method: 'POST'
    })
  }

  async checkExtensionReminder() {
    return this.makeRequest('/schedules/extension-reminder', {
      method: 'POST'
    })
  }

  // Student Package Management API
  async getStudentPackages(filters = {}) {
    apiDebugger.info('PACKAGES', 'Fetching student packages', { filters })
    
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value)
        }
      })
      
      const queryString = params.toString()
      const result = await this.makeRequest(`/students/packages${queryString ? `?${queryString}` : ''}`)
      
      if (result.success) {
        apiDebugger.success('PACKAGES', 'Student packages fetched successfully', { 
          count: result.packages?.length || 0,
          total: result.total || 0
        })
      } else {
        apiDebugger.warning('PACKAGES', 'Failed to fetch student packages', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('PACKAGES', 'Error fetching student packages', { error: error.message })
      throw error
    }
  }

  async addStudentPackage(packageData) {
    apiDebugger.info('PACKAGES', 'Adding student package', { packageData })
    
    try {
      const result = await this.makeRequest('/students/packages', {
        method: 'POST',
        body: JSON.stringify(packageData)
      })
      
      if (result.success) {
        apiDebugger.success('PACKAGES', 'Student package added successfully', { packageId: result.package?.id })
      } else {
        apiDebugger.warning('PACKAGES', 'Failed to add student package', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('PACKAGES', 'Error adding student package', { error: error.message })
      throw error
    }
  }

  async deleteStudentPackage(packageId) {
    apiDebugger.info('PACKAGES', 'Deleting student package', { packageId })
    
    try {
      const result = await this.makeRequest(`/students/packages/${packageId}`, {
        method: 'DELETE'
      })
      
      if (result.success) {
        apiDebugger.success('PACKAGES', 'Student package deleted successfully', { packageId })
      } else {
        apiDebugger.warning('PACKAGES', 'Failed to delete student package', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('PACKAGES', 'Error deleting student package', { error: error.message })
      throw error
    }
  }

  async getExhaustedPackages() {
    apiDebugger.info('PACKAGES', 'Fetching exhausted packages')
    
    try {
      const result = await this.makeRequest('/students/packages/exhausted')
      
      if (result.success) {
        apiDebugger.success('PACKAGES', 'Exhausted packages fetched successfully', { 
          count: result.packages?.length || 0 
        })
      } else {
        apiDebugger.warning('PACKAGES', 'Failed to fetch exhausted packages', { error: result.error })
      }
      
      return result
    } catch (error) {
      apiDebugger.error('PACKAGES', 'Error fetching exhausted packages', { error: error.message })
      throw error
    }
  }

}

// Create and export a singleton instance
const apiService = new ApiService()
export default apiService
