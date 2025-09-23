import React, { useState, useEffect } from 'react'
import { usePhotoCache } from '../../hooks/usePhotoCache'

// New function for teacher photos - only uses cached images or shows fallback
export const CachedTeacherImage = ({ 
  src, 
  fileId, 
  alt = '', 
  className = '', 
  style = {},
  fallback = null,
  onLoad = null,
  onError = null,
  ...props 
}) => {
  const [showFallback, setShowFallback] = useState(false)
  
  const { 
    blobUrl, 
    loading, 
    error, 
    isCached
  } = usePhotoCache(src, fileId, { 
    forceRefresh: false, // Don't auto-fetch
    onLoad: (data, url) => {
      setShowFallback(false)
      if (onLoad) onLoad(data, url)
    },
    onError: (err) => {
      setShowFallback(true)
      if (onError) onError(err)
    }
  })

  // Check if we have cached data
  const hasCachedData = blobUrl && !loading && !error

  // If we have cached data, show it
  if (hasCachedData) {
    return (
      <img
        src={blobUrl}
        alt={alt}
        className={className}
        style={style}
        {...props}
      />
    )
  }

  // If not cached, show fallback initials
  if (fallback) {
    return fallback
  }

  // Default fallback
  return (
    <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={style}>
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="w-8 h-8 text-gray-400">
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

const CachedImage = ({ 
  src, 
  fileId, 
  alt = '', 
  className = '', 
  style = {},
  forceRefresh = false,
  fallback = null,
  onLoad = null,
  onError = null,
  ...props 
}) => {
  const [showFallback, setShowFallback] = useState(false)
  
  const { 
    blobUrl, 
    loading, 
    error, 
    isCached, 
    refresh 
  } = usePhotoCache(src, fileId, { 
    forceRefresh,
    onLoad: (data, url) => {
      setShowFallback(false)
      if (onLoad) onLoad(data, url)
    },
    onError: (err) => {
      setShowFallback(true)
      if (onError) onError(err)
    }
  })

  // Show loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={style}>
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500">
            {isCached ? 'Loading from cache...' : 'Downloading...'}
          </span>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || showFallback) {
    if (fallback) {
      return fallback
    }
    
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={style}>
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="w-8 h-8 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xs text-gray-500">Image unavailable</span>
          <button 
            onClick={refresh}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show cached image
  if (blobUrl) {
    return (
      <img
        src={blobUrl}
        alt={alt}
        className={className}
        style={style}
        {...props}
      />
    )
  }

  // Fallback to original URL if no cached version
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setShowFallback(true)}
      {...props}
    />
  )
}

export default CachedImage
