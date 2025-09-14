import { createContext, useContext, useState, useEffect } from 'react'
import { tokenManager } from '../utils/tokenManager'
import apiService from '../utils/api'
import apiDebugger from '../utils/debug'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing tokens on app load
    const initAuth = async () => {
      apiDebugger.info('AUTH_CONTEXT', 'Initializing authentication')
      
      try {
        const tokens = tokenManager.getStoredTokens()
        apiDebugger.debug('AUTH_CONTEXT', 'Stored tokens check', { 
          hasAccessToken: !!tokens.accessToken,
          hasRefreshToken: !!tokens.refreshToken 
        })
        
        if (tokens.accessToken && tokens.refreshToken) {
          try {
            // Verify token and get user data
            apiDebugger.info('AUTH_CONTEXT', 'Verifying existing token')
            const userData = await apiService.verifyToken()
            
            // Map backend response to frontend user object
            const mappedUser = {
              id: userData.user?.id,
              username: userData.user?.username,
              role: userData.user?.role,
              teacherId: userData.user?.teacher_id, // Map teacher_id to teacherId
              teacherName: userData.user?.teacher_name,
              isAdmin: userData.user?.role === 'admin',
              isTeacher: userData.user?.role === 'teacher'
            }
            
            setUser(mappedUser)
            apiDebugger.success('AUTH_CONTEXT', 'Token verified successfully', { 
              userId: mappedUser.id,
              role: mappedUser.role,
              teacherId: mappedUser.teacherId,
              teacherName: mappedUser.teacherName,
              isAdmin: mappedUser.isAdmin,
              isTeacher: mappedUser.isTeacher
            })
          } catch (error) {
            apiDebugger.warning('AUTH_CONTEXT', 'Token verification failed', { 
              error: error.message,
              isNetworkError: error.message.includes('fetch') || error.message.includes('Backend server not available')
            })
            
            // If it's a network error (backend not running), don't try to refresh
            if (error.message.includes('fetch') || error.message.includes('Backend server not available')) {
              apiDebugger.info('AUTH_CONTEXT', 'Backend not available, skipping token refresh')
              tokenManager.clearStoredTokens()
              return
            }
            
            apiDebugger.info('AUTH_CONTEXT', 'Attempting token refresh')
            
            // Try to refresh token
            try {
              const newTokens = await apiService.refreshToken(tokens.refreshToken)
              tokenManager.storeTokens(newTokens.accessToken, newTokens.refreshToken)
              const userData = await apiService.verifyToken()
              setUser(userData.user)
              apiDebugger.success('AUTH_CONTEXT', 'Token refreshed successfully', { 
                userId: userData.user?.id,
                role: userData.user?.role,
                teacherId: userData.user?.teacher_id,
                teacherName: userData.user?.teacher_name,
                isAdmin: userData.user?.role === 'admin',
                isTeacher: userData.user?.role === 'teacher'
              })
            } catch (refreshError) {
              apiDebugger.error('AUTH_CONTEXT', 'Token refresh failed, clearing tokens', { 
                error: refreshError.message 
              })
              // Clear invalid tokens
              tokenManager.clearStoredTokens()
            }
          }
        } else {
          apiDebugger.info('AUTH_CONTEXT', 'No stored tokens found')
        }
      } catch (error) {
        apiDebugger.error('AUTH_CONTEXT', 'Auth initialization error', { error: error.message })
        tokenManager.clearStoredTokens()
      } finally {
        setLoading(false)
        apiDebugger.info('AUTH_CONTEXT', 'Auth initialization complete', { 
          isAuthenticated: !!user,
          loading: false 
        })
      }
    }

    initAuth()
  }, [])

  const login = async (username, password) => {
    apiDebugger.info('AUTH_CONTEXT', 'Login attempt initiated', { 
      username,
      hasPassword: !!password,
      apiService: typeof apiService,
      tokenManager: typeof tokenManager
    })
    
    try {
      apiDebugger.info('AUTH_CONTEXT', 'Calling apiService.login', { username })
      const data = await apiService.login(username, password)
      
      apiDebugger.info('AUTH_CONTEXT', 'API login response received', { 
        success: data?.success,
        hasAccessToken: !!data?.accessToken,
        hasRefreshToken: !!data?.refreshToken,
        hasUser: !!data?.user,
        userRole: data?.user?.role
      })
      
      if (data.success && data.accessToken && data.refreshToken) {
        apiDebugger.info('AUTH_CONTEXT', 'Storing tokens and setting user', { username })
        tokenManager.storeTokens(data.accessToken, data.refreshToken)
        
        // Map backend response to frontend user object
        const mappedUser = {
          id: data.user?.id,
          username: data.user?.username,
          role: data.user?.role,
          teacherId: data.user?.teacher_id, // Map teacher_id to teacherId
          teacherName: data.user?.teacher_name,
          isAdmin: data.user?.role === 'admin',
          isTeacher: data.user?.role === 'teacher'
        }
        
        setUser(mappedUser)
        
        apiDebugger.success('AUTH_CONTEXT', 'Login successful', { 
          username,
          userId: mappedUser.id,
          role: mappedUser.role,
          teacherId: mappedUser.teacherId,
          teacherName: mappedUser.teacherName,
          isAdmin: mappedUser.isAdmin,
          isTeacher: mappedUser.isTeacher
        })
        
        return { success: true }
      } else {
        apiDebugger.warning('AUTH_CONTEXT', 'API login returned unsuccessful response', { 
          data: data,
          success: data?.success,
          error: data?.error
        })
        return { success: false, error: data?.error || 'Login failed' }
      }
    } catch (error) {
      apiDebugger.error('AUTH_CONTEXT', 'Login failed with error', { 
        username, 
        error: error.message,
        stack: error.stack
      })
      return { success: false, error: error.message || 'Login failed' }
    }
  }

  const refreshTokens = async (refreshToken) => {
    try {
      apiDebugger.info('AUTH_CONTEXT', 'Refreshing tokens')
      const newTokens = await apiService.refreshToken(refreshToken)
      
      if (newTokens.success && newTokens.accessToken && newTokens.refreshToken) {
        tokenManager.storeTokens(newTokens.accessToken, newTokens.refreshToken)
        
        // Verify the new token and get user data
        const userData = await apiService.verifyToken()
        setUser(userData.user)
        
        apiDebugger.success('AUTH_CONTEXT', 'Tokens refreshed successfully')
        return true
      } else {
        apiDebugger.warning('AUTH_CONTEXT', 'Token refresh failed - invalid response')
        return false
      }
    } catch (error) {
      apiDebugger.error('AUTH_CONTEXT', 'Token refresh failed', { error: error.message })
      return false
    }
  }

  const logout = () => {
    apiDebugger.info('AUTH_CONTEXT', 'Logout initiated', { 
      userId: user?.id,
      role: user?.role 
    })
    tokenManager.clearStoredTokens()
    setUser(null)
    apiDebugger.success('AUTH_CONTEXT', 'Logout completed')
  }

  const value = {
    user,
    login,
    logout,
    refreshTokens,
    refreshToken: refreshTokens, // Alias for useTokenRefresh compatibility
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
