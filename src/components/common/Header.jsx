import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// Simple debug logger to avoid import issues
const apiDebugger = {
  info: (category, message, data) => console.log(`[${category}] ${message}`, data || ''),
  warning: (category, message, data) => console.warn(`[${category}] ${message}`, data || ''),
  error: (category, message, data) => console.error(`[${category}] ${message}`, data || ''),
  success: (category, message, data) => console.log(`✅ [${category}] ${message}`, data || ''),
  debug: (category, message, data) => console.log(`🐛 [${category}] ${message}`, data || ''),
  enable: () => console.log('Debug enabled')
}

const Header = ({ onLogin, loginError }) => {
  const [showLogin, setShowLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const loginRef = useRef(null)

  // Close login form when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (loginRef.current && !loginRef.current.contains(event.target)) {
        setShowLogin(false)
      }
    }

    if (showLogin) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLogin])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    apiDebugger.info('HEADER', 'Login form submitted', { 
      username: username.trim(), 
      hasPassword: !!password.trim(),
      onLoginFunction: typeof onLogin
    })
    
    if (!username.trim() || !password.trim()) {
      apiDebugger.warning('HEADER', 'Login form validation failed', { 
        usernameEmpty: !username.trim(),
        passwordEmpty: !password.trim()
      })
      return
    }

    if (!onLogin || typeof onLogin !== 'function') {
      apiDebugger.error('HEADER', 'onLogin function not provided or invalid', { 
        onLogin: onLogin,
        type: typeof onLogin
      })
      return
    }

    setLoading(true)
    apiDebugger.info('HEADER', 'Calling onLogin function', { username: username.trim() })
    
    try {
      const result = await onLogin(username.trim(), password)
      apiDebugger.success('HEADER', 'onLogin function completed', { 
        result: result,
        success: result?.success
      })
    } catch (error) {
      apiDebugger.error('HEADER', 'onLogin function failed', { 
        error: error.message,
        stack: error.stack
      })
    } finally {
      setLoading(false)
      apiDebugger.info('HEADER', 'Login process completed', { loading: false })
    }
  }

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-neutral-200 sticky top-0 z-50">
      {/* Banner Image with Login Overlay */}
      <div className="relative w-full h-32 bg-contain bg-center bg-no-repeat" 
           style={{ backgroundImage: 'url(/pics/large.jpg)' }}>
        <div className="w-full h-full bg-black bg-opacity-10"></div> </div>
        
        {/* Login Overlay */}
        <div className="absolute top-0 right-0 p-4">

          {/* Debug Panel Toggle */}
          {import.meta.env.DEV && (
            <button
              onClick={() => {
                apiDebugger.enable()
                console.log('Debug panel enabled. Check the debug panel at the bottom of the page.')
              }}
              className="mr-4 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Enable Debug
            </button>
          )}

          {/* Login Section */}
          <div className="relative" ref={loginRef}>
            {!showLogin ? (
              <motion.button
                onClick={() => {
                  apiDebugger.info('HEADER', 'Login button clicked', { showLogin: false })
                  setShowLogin(true)
                }}
                className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 sm:px-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="hidden sm:inline">Login</span>
                <span className="sm:hidden">🔑</span>
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-0 bg-white rounded-lg shadow-lg border border-neutral-200 p-4 w-80 max-w-[calc(100vw-2rem)] sm:w-80 z-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-neutral-800">Login</h3>
                  <button
                    onClick={() => setShowLogin(false)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs"
                    >
                      {loginError}
                    </motion.div>
                  )}

                  <div>
                    <label htmlFor="header-username" className="block text-xs font-medium text-neutral-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      id="header-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>

                  <div>
                    <label htmlFor="header-password" className="block text-xs font-medium text-neutral-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="header-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || !username.trim() || !password.trim()}
                    className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded transition-colors duration-200"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={(e) => {
                      apiDebugger.info('HEADER', 'Submit button clicked', { 
                        loading,
                        username: username.trim(),
                        hasPassword: !!password.trim(),
                        disabled: loading || !username.trim() || !password.trim()
                      })
                    }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Logging in...
                      </div>
                    ) : (
                      'Login'
                    )}
                  </motion.button>
                </form>

              </motion.div>
            )}
        </div>
      </div>
    </header>
  )
}

export default Header