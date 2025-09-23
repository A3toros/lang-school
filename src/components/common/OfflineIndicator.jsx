import { useState, useEffect } from 'react'

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setShowIndicator(false)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setShowIndicator(true)
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial state
    if (!navigator.onLine) {
      setShowIndicator(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listen for cache fallback events
  useEffect(() => {
    const handleCacheFallback = (event) => {
      if (isOffline) {
        setShowIndicator(true)
      }
    }

    // Listen for custom cache events
    window.addEventListener('cache:fallback', handleCacheFallback)

    return () => {
      window.removeEventListener('cache:fallback', handleCacheFallback)
    }
  }, [isOffline])

  if (!showIndicator) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">
          {isOffline ? 'Offline - Using cached data' : 'Using cached data'}
        </span>
        <button
          onClick={() => setShowIndicator(false)}
          className="text-yellow-600 hover:text-yellow-800 ml-2"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default OfflineIndicator
