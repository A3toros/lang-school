import { useState, useEffect, useRef } from 'react'
import photoCache from '../utils/photoCache'

// Hook for efficient photo caching
export function usePhotoCache(url, fileId, options = {}) {
  const [photoData, setPhotoData] = useState(null)
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isCached, setIsCached] = useState(false)
  
  const blobUrlRef = useRef(null)
  const { 
    forceRefresh = false, 
    autoLoad = true,
    onLoad = null,
    onError = null 
  } = options

  // Clean up blob URL when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        photoCache.revokeBlobUrl(blobUrlRef.current)
      }
    }
  }, [url])

  // Load photo
  const loadPhoto = async () => {
    if (!url) return

    setLoading(true)
    setError(null)

    try {
      // Check if photo is already cached
      const needsFetch = photoCache.needsFetch(url, fileId)
      setIsCached(!needsFetch)

      // Get photo (from cache or fetch)
      const data = await photoCache.getPhoto(url, fileId, forceRefresh)
      
      if (data) {
        setPhotoData(data)
        
        // Create blob URL for display
        const newBlobUrl = photoCache.createBlobUrl(data)
        
        // Clean up old blob URL
        if (blobUrlRef.current) {
          photoCache.revokeBlobUrl(blobUrlRef.current)
        }
        
        blobUrlRef.current = newBlobUrl
        setBlobUrl(newBlobUrl)
        
        if (onLoad) onLoad(data, newBlobUrl)
      }
    } catch (err) {
      console.error('Failed to load photo:', err)
      setError(err.message)
      if (onError) onError(err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load photo when URL changes
  useEffect(() => {
    if (autoLoad && url) {
      loadPhoto()
    }
  }, [url, fileId, forceRefresh, autoLoad])

  // Manual refresh function
  const refresh = () => {
    loadPhoto()
  }

  // Clear cache for this photo
  const clearCache = async () => {
    if (url && fileId) {
      const key = photoCache.getPhotoKey(url, fileId)
      await photoCache.cache.remove(key)
      photoCache.metadata.delete(key)
      await photoCache.saveMetadata()
      setIsCached(false)
    }
  }

  return {
    photoData,
    blobUrl,
    loading,
    error,
    isCached,
    refresh,
    clearCache,
    loadPhoto
  }
}

// Hook for multiple photos
export function useMultiplePhotos(photos, options = {}) {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadPhotos = async () => {
    if (!photos || photos.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const photoPromises = photos.map(async (photo) => {
        const { url, fileId } = photo
        if (!url) return null

        try {
          const data = await photoCache.getPhoto(url, fileId, options.forceRefresh)
          const blobUrl = photoCache.createBlobUrl(data)
          return {
            ...photo,
            photoData: data,
            blobUrl,
            isCached: !photoCache.needsFetch(url, fileId)
          }
        } catch (err) {
          console.error(`Failed to load photo ${url}:`, err)
          return {
            ...photo,
            error: err.message
          }
        }
      })

      const results = await Promise.all(photoPromises)
      const photoMap = {}
      
      results.forEach((result, index) => {
        if (result) {
          photoMap[photos[index].url] = result
        }
      })

      setResults(photoMap)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (photos && photos.length > 0) {
      loadPhotos()
    }
  }, [photos, options.forceRefresh])

  return {
    results,
    loading,
    error,
    refresh: loadPhotos
  }
}

export default usePhotoCache
