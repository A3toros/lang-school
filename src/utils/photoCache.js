// Efficient photo caching system that stores photos on user's PC
// Only fetches new photos when they're added or replaced

import { initializeDataCache } from './dataCache'

// Initialize photo cache with larger size limit for images
const photoCachePromise = initializeDataCache('photos').then(cache => {
  // Override maxBytes for photos (500MB)
  cache.maxBytes = 500 * 1024 * 1024
  console.log('🖼️ [PHOTO_CACHE] Initialized photo cache with 500MB limit')
  return cache
}).catch(error => {
  console.error('❌ [PHOTO_CACHE] Failed to initialize photo cache:', error)
  throw error
})

// Photo metadata structure
const PHOTO_META_KEY = 'photo_metadata'

export class PhotoCache {
  constructor() {
    this.cache = null
    this.metadata = new Map()
  }

  async init() {
    this.cache = await photoCachePromise
    await this.loadMetadata()
  }

  async loadMetadata() {
    try {
      const metaData = await this.cache.get(PHOTO_META_KEY)
      if (metaData) {
        this.metadata = new Map(metaData)
        console.log(`🖼️ [PHOTO_CACHE] Loaded metadata for ${this.metadata.size} photos`)
      }
    } catch (error) {
      console.warn('Failed to load photo metadata:', error)
      this.metadata = new Map()
    }
  }

  async saveMetadata() {
    try {
      await this.cache.set(PHOTO_META_KEY, Array.from(this.metadata.entries()))
    } catch (error) {
      console.warn('Failed to save photo metadata:', error)
    }
  }

  // Generate cache key for photo
  getPhotoKey(url, fileId) {
    return `photo:${fileId || this.extractFileId(url)}`
  }

  // Extract file ID from Cloudinary URL
  extractFileId(url) {
    try {
      const match = url.match(/\/([^\/]+)\.(jpg|jpeg|png|gif|webp|svg)$/i)
      return match ? match[1] : url.split('/').pop()
    } catch {
      return url.split('/').pop()
    }
  }

  // Check if photo needs to be fetched (new or updated)
  needsFetch(url, fileId) {
    const key = this.getPhotoKey(url, fileId)
    const meta = this.metadata.get(key)
    
    if (!meta) {
      console.log(`🖼️ [PHOTO_CACHE] Photo not cached: ${key}`)
      return true
    }

    // Check if URL changed (photo was replaced)
    if (meta.url !== url) {
      console.log(`🖼️ [PHOTO_CACHE] Photo URL changed: ${key}`)
      return true
    }

    // Check if photo is older than 7 days (optional refresh)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    if (meta.cachedAt < weekAgo) {
      console.log(`🖼️ [PHOTO_CACHE] Photo is old, refreshing: ${key}`)
      return true
    }

    console.log(`🖼️ [PHOTO_CACHE] Photo is cached and up-to-date: ${key}`)
    return false
  }

  // Get cached photo
  async getCachedPhoto(url, fileId) {
    if (!this.cache) await this.init()
    
    const key = this.getPhotoKey(url, fileId)
    const meta = this.metadata.get(key)
    
    if (!meta) {
      return null
    }

    try {
      const photoData = await this.cache.get(key)
      if (photoData) {
        console.log(`✅ [PHOTO_CACHE] Retrieved cached photo: ${key}`)
        return photoData
      }
    } catch (error) {
      console.warn(`Failed to get cached photo ${key}:`, error)
    }

    return null
  }

  // Cache photo with metadata
  async cachePhoto(url, fileId, photoData) {
    if (!this.cache) await this.init()
    
    const key = this.getPhotoKey(url, fileId)
    
    try {
      // Store photo data
      await this.cache.set(key, photoData)
      
      // Update metadata
      this.metadata.set(key, {
        url,
        fileId,
        cachedAt: Date.now(),
        size: photoData.length || 0
      })
      
      await this.saveMetadata()
      
      console.log(`💾 [PHOTO_CACHE] Cached photo: ${key} (${photoData.length || 0} bytes)`)
      return true
    } catch (error) {
      console.error(`Failed to cache photo ${key}:`, error)
      return false
    }
  }

  // Fetch and cache photo if needed
  async getPhoto(url, fileId, forceRefresh = false) {
    if (!this.cache) await this.init()
    
    // Check if we need to fetch
    if (!forceRefresh && !this.needsFetch(url, fileId)) {
      const cached = await this.getCachedPhoto(url, fileId)
      if (cached) {
        return cached
      }
    }

    // Fetch photo from URL
    try {
      console.log(`🌐 [PHOTO_CACHE] Fetching photo: ${url}`)
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch photo: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const photoData = new Uint8Array(arrayBuffer)
      
      // Cache the photo
      await this.cachePhoto(url, fileId, photoData)
      
      return photoData
    } catch (error) {
      console.error(`Failed to fetch photo ${url}:`, error)
      
      // Try to return cached version as fallback
      const cached = await this.getCachedPhoto(url, fileId)
      if (cached) {
        console.log(`🔄 [PHOTO_CACHE] Using cached fallback for: ${url}`)
        return cached
      }
      
      throw error
    }
  }

  // Convert photo data to blob URL for display
  createBlobUrl(photoData) {
    if (!photoData) return null
    const blob = new Blob([photoData])
    return URL.createObjectURL(blob)
  }

  // Clean up blob URLs
  revokeBlobUrl(blobUrl) {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
    }
  }

  // Get cache stats
  async getStats() {
    if (!this.cache) await this.init()
    
    return {
      photoCount: this.metadata.size,
      totalSize: Array.from(this.metadata.values()).reduce((sum, meta) => sum + (meta.size || 0), 0),
      oldestPhoto: Math.min(...Array.from(this.metadata.values()).map(meta => meta.cachedAt)),
      newestPhoto: Math.max(...Array.from(this.metadata.values()).map(meta => meta.cachedAt))
    }
  }
}

// Create singleton instance
const photoCache = new PhotoCache()

// Legacy functions for backward compatibility
export async function cachePhotos(urls = []) {
  console.warn('cachePhotos is deprecated, use PhotoCache.getPhoto instead')
  return Promise.allSettled(urls.map(url => photoCache.getPhoto(url)))
}

export async function getCachedPhoto(url) {
  console.warn('getCachedPhoto is deprecated, use PhotoCache.getPhoto instead')
  return photoCache.getCachedPhoto(url)
}

export default photoCache


