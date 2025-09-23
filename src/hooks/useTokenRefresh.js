import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { tokenManager } from '../utils/tokenManager'

/**
 * Custom hook for automatic token refresh
 * Checks token expiration and refreshes if needed
 */
export const useTokenRefresh = () => {
  const { refreshToken, isAuthenticated } = useAuth()
  const refreshTimeoutRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any existing timeout if user is not authenticated
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      return
    }

    const checkAndRefreshToken = async () => {
      try {
        const accessToken = tokenManager.getStoredAccessToken()
        if (!accessToken) return

        // Use tokenManager's built-in expiration check
        if (tokenManager.shouldRefreshToken(accessToken)) {
          console.log('🔄 [TOKEN_REFRESH] Token expires soon, refreshing...', {
            expiresAt: tokenManager.getTokenExpiration(accessToken)
          })
          
          await refreshToken()
        }

        // Schedule next check in 1 minute
        refreshTimeoutRef.current = setTimeout(checkAndRefreshToken, 60000)
      } catch (error) {
        console.error('❌ [TOKEN_REFRESH] Error checking token:', error)
        // Schedule next check in 5 minutes on error
        refreshTimeoutRef.current = setTimeout(checkAndRefreshToken, 300000)
      }
    }

    // Initial check
    checkAndRefreshToken()

    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [isAuthenticated, refreshToken])

  return null
}

export default useTokenRefresh
