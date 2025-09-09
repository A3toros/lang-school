// Token management utilities for JWT authentication
const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_DATA_KEY = 'userData'

export const tokenManager = {
  // Store both tokens in localStorage
  storeTokens(accessToken, refreshToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },

  // Get both tokens from localStorage
  getStoredTokens() {
    return {
      accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY)
    }
  },

  // Get only access token
  getStoredAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  // Get only refresh token
  getStoredRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  // Clear both tokens from localStorage
  clearStoredTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_DATA_KEY)
  },

  // Check if both tokens exist
  isTokensStored() {
    const tokens = this.getStoredTokens()
    return !!(tokens.accessToken && tokens.refreshToken)
  },

  // Store user data
  storeUserData(userData) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData))
  },

  // Get user data
  getUserData() {
    const userData = localStorage.getItem(USER_DATA_KEY)
    return userData ? JSON.parse(userData) : null
  },

  // Clear user data
  clearUserData() {
    localStorage.removeItem(USER_DATA_KEY)
  },

  // Decode JWT token without verification (for client-side checks)
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Error decoding token:', error)
      return null
    }
  },

  // Check if token is expired
  isTokenExpired(token) {
    if (!token) return true
    
    const decoded = this.decodeToken(token)
    if (!decoded || !decoded.exp) return true
    
    const currentTime = Date.now() / 1000
    return decoded.exp < currentTime
  },

  // Get token expiration timestamp
  getTokenExpiration(token) {
    const decoded = this.decodeToken(token)
    return decoded ? decoded.exp * 1000 : null
  },

  // Check if access token needs refresh (5 minutes before expiry)
  shouldRefreshToken(accessToken) {
    if (!accessToken) return true
    
    const decoded = this.decodeToken(accessToken)
    if (!decoded || !decoded.exp) return true
    
    const currentTime = Date.now() / 1000
    const timeUntilExpiry = decoded.exp - currentTime
    return timeUntilExpiry < 300 // 5 minutes
  },

  // Auto-refresh token if needed
  async autoRefreshToken() {
    const tokens = this.getStoredTokens()
    
    if (!tokens.accessToken || !tokens.refreshToken) {
      return false
    }

    if (this.shouldRefreshToken(tokens.accessToken)) {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken })
        })

        if (response.ok) {
          const newTokens = await response.json()
          this.storeTokens(newTokens.accessToken, newTokens.refreshToken)
          return true
        } else {
          this.clearStoredTokens()
          return false
        }
      } catch (error) {
        console.error('Token refresh error:', error)
        this.clearStoredTokens()
        return false
      }
    }

    return true
  }
}
