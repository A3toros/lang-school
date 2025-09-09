import { createContext, useContext, useState, useEffect } from 'react'
import { tokenManager } from '../utils/tokenManager'
import apiService from '../utils/api'

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
      try {
        const tokens = tokenManager.getStoredTokens()
        if (tokens.accessToken && tokens.refreshToken) {
          try {
            // Verify token and get user data
            const userData = await apiService.verifyToken()
            setUser(userData.user)
          } catch (error) {
            // Try to refresh token
            try {
              const newTokens = await apiService.refreshToken(tokens.refreshToken)
              tokenManager.storeTokens(newTokens.accessToken, newTokens.refreshToken)
              const userData = await apiService.verifyToken()
              setUser(userData.user)
            } catch (refreshError) {
              // Clear invalid tokens
              tokenManager.clearStoredTokens()
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        tokenManager.clearStoredTokens()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (username, password) => {
    try {
      const data = await apiService.login(username, password)
      tokenManager.storeTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message || 'Login failed' }
    }
  }

  const logout = () => {
    tokenManager.clearStoredTokens()
    setUser(null)
  }

  const value = {
    user,
    login,
    logout,
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
