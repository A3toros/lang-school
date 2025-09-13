// Comprehensive API debugging utility
class ApiDebugger {
  constructor() {
    this.isEnabled = import.meta.env.DEV || localStorage.getItem('api-debug') === 'true'
    this.logs = []
    this.maxLogs = 100
  }

  log(level, category, message, data = null) {
    if (!this.isEnabled) return

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null
    }

    this.logs.unshift(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Console output with styling
    const styles = {
      info: 'color: #3B82F6; font-weight: bold;',
      success: 'color: #10B981; font-weight: bold;',
      warning: 'color: #F59E0B; font-weight: bold;',
      error: 'color: #EF4444; font-weight: bold;',
      debug: 'color: #8B5CF6; font-weight: bold;'
    }

    console.group(`%c[API ${level.toUpperCase()}] ${category}`, styles[level])
    console.log(`%c${message}`, 'color: #374151;')
    if (data) {
      console.log('%cData:', 'color: #6B7280; font-weight: bold;', data)
    }
    console.log(`%cTime: ${timestamp}`, 'color: #9CA3AF; font-size: 0.8em;')
    console.groupEnd()
  }

  info(category, message, data = null) {
    this.log('info', category, message, data)
  }

  success(category, message, data = null) {
    this.log('success', category, message, data)
  }

  warning(category, message, data = null) {
    this.log('warning', category, message, data)
  }

  error(category, message, data = null) {
    this.log('error', category, message, data)
  }

  debug(category, message, data = null) {
    this.log('debug', category, message, data)
  }

  // API request debugging
  logRequest(method, url, data = null) {
    this.info('REQUEST', `${method} ${url}`, {
      method,
      url,
      body: data,
      timestamp: Date.now()
    })
  }

  logResponse(method, url, response, duration = null) {
    const isSuccess = response.status >= 200 && response.status < 300
    const level = isSuccess ? 'success' : 'error'
    
    this[level]('RESPONSE', `${method} ${url} - ${response.status}`, {
      status: response.status,
      statusText: response.statusText,
      data: response.data || response,
      duration: duration ? `${duration}ms` : null,
      timestamp: Date.now()
    })
  }

  logError(method, url, error) {
    this.error('ERROR', `${method} ${url} - ${error.message}`, {
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    })
  }

  // Get all logs
  getLogs() {
    return this.logs
  }

  // Clear logs
  clearLogs() {
    this.logs = []
  }

  // Export logs
  exportLogs() {
    const dataStr = JSON.stringify(this.logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `api-debug-logs-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Enable/disable debugging
  enable() {
    this.isEnabled = true
    localStorage.setItem('api-debug', 'true')
    this.info('DEBUG', 'API debugging enabled')
  }

  disable() {
    this.isEnabled = false
    localStorage.setItem('api-debug', 'false')
    this.info('DEBUG', 'API debugging disabled')
  }
}

// Create singleton instance
const apiDebugger = new ApiDebugger()

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.apiDebugger = apiDebugger
}

export default apiDebugger
