import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { tokenManager } from '../../utils/tokenManager'
import apiService from '../../utils/api'

const TokenManager = ({ children }) => {
  const { refreshTokens, logout } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const checkTokenStatus = async () => {
      const tokens = tokenManager.getStoredTokens()
      
      if (!tokens.accessToken || !tokens.refreshToken) {
        return
      }

      // Check if access token is expired or about to expire
      if (tokenManager.isTokenExpired(tokens.accessToken) || tokenManager.shouldRefreshToken(tokens.accessToken)) {
        if (isRefreshing) return
        
        try {
          setIsRefreshing(true)
          const success = await refreshTokens(tokens.refreshToken)
          
          if (!success) {
            // Refresh failed, logout user
            logout()
          }
        } catch (error) {
          console.error('Token refresh error:', error)
          logout()
        } finally {
          setIsRefreshing(false)
        }
      }
    }

    // Check token status immediately
    checkTokenStatus()

    // Set up interval to check tokens every 5 minutes
    const interval = setInterval(checkTokenStatus, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [refreshTokens, logout, isRefreshing])

  // Set up API interceptor for automatic token refresh
  useEffect(() => {
    const originalMakeRequest = apiService.makeRequest
    
    apiService.makeRequest = async function(url, options = {}) {
      try {
        return await originalMakeRequest.call(this, url, options)
      } catch (error) {
        // If we get a 401, try to refresh the token
        if (error.status === 401) {
          const tokens = tokenManager.getStoredTokens()
          if (tokens.refreshToken) {
            try {
              const success = await refreshTokens(tokens.refreshToken)
              if (success) {
                // Retry the original request
                return await originalMakeRequest.call(this, url, options)
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError)
              logout()
            }
          }
        }
        throw error
      }
    }
  }, [refreshTokens, logout])

  if (isRefreshing) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600">Refreshing session...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default TokenManager
