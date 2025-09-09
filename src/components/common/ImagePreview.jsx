import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'

const ImagePreview = ({ 
  src, 
  alt, 
  publicId, 
  transformations = null,
  className = '',
  showDelete = false,
  onDelete = null,
  onError = null
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  const getOptimizedUrl = (publicId, transformations) => {
    if (!publicId) return src
    
    try {
      const response = apiService.getTransformedImageUrl(publicId, transformations)
      return response.url || src
    } catch (error) {
      console.error('Error getting optimized URL:', error)
      return src
    }
  }

  const handleImageLoad = () => {
    setLoading(false)
  }

  const handleImageError = () => {
    setLoading(false)
    setError(true)
    onError?.('Failed to load image')
  }

  const handleDelete = async () => {
    if (!publicId || !onDelete) return

    try {
      const response = await apiService.deleteImage(publicId)
      if (response.success) {
        onDelete(publicId)
      } else {
        onError?.(response.error || 'Failed to delete image')
      }
    } catch (error) {
      console.error('Delete error:', error)
      onError?.('Failed to delete image')
    }
  }

  const optimizedSrc = getOptimizedUrl(publicId, transformations)

  return (
    <>
      <div className={`relative group ${className}`}>
        {loading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          </div>
        )}
        
        {error ? (
          <div className="bg-gray-100 rounded-lg flex items-center justify-center p-4">
            <div className="text-center text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm">Failed to load image</p>
            </div>
          </div>
        ) : (
          <img
            src={optimizedSrc}
            alt={alt}
            className={`w-full h-full object-cover rounded-lg transition-opacity duration-200 ${
              loading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onClick={() => setShowFullscreen(true)}
          />
        )}

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFullscreen(true)}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-2 rounded-full transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            
            {showDelete && onDelete && (
              <button
                onClick={handleDelete}
                className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 text-white p-2 rounded-full transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {showFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={optimizedSrc}
                alt={alt}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              
              <button
                onClick={() => setShowFullscreen(false)}
                className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ImagePreview
