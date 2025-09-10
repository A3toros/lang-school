import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'

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
        const accessToken = localStorage.getItem('accessToken')
        if (!accessToken) return

        // Decode token to check expiration
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        const timeUntilExpiry = tokenPayload.exp - currentTime

        // If token expires in less than 5 minutes, refresh it
        if (timeUntilExpiry < 300) {
          console.log('🔄 [TOKEN_REFRESH] Token expires soon, refreshing...', {
            timeUntilExpiry,
            expiresAt: new Date(tokenPayload.exp * 1000).toISOString()
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
