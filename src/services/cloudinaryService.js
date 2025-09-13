import cloudinaryUtils from '../utils/cloudinary'
import apiService from '../utils/api'
import { tokenManager } from '../utils/tokenManager'

/**
 * Cloudinary service for handling image uploads and management
 * Provides higher-level functions that integrate with the backend API
 */

class CloudinaryService {
  /**
   * Upload image with automatic optimization and backend integration
   * @param {File} file - Image file to upload
   * @param {object} options - Upload options
   * @returns {Promise<object>} - Upload result
   */
  async uploadImage(file, options = {}) {
    const {
      folder = 'lang-school',
      publicId = null,
      tags = [],
      transformations = {},
      useBackend = true
    } = options

    try {
      console.log('🔍 [CLOUDINARY_SERVICE] Starting image upload', {
        fileName: file.name,
        fileSize: file.size,
        folder,
        useBackend
      })

      let result

      if (useBackend) {
        // Use backend API for upload (recommended for production)
        result = await this.uploadViaBackend(file, { folder, publicId, tags, transformations })
      } else {
        // Direct upload to Cloudinary (for development)
        result = await cloudinaryUtils.uploadImage(file, { folder, publicId, tags, transformations })
      }

      console.log('✅ [CLOUDINARY_SERVICE] Image uploaded successfully', {
        publicId: result.publicId,
        url: result.url
      })

      return {
        success: true,
        publicId: result.publicId,
        url: result.url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.size
      }
    } catch (error) {
      console.error('❌ [CLOUDINARY_SERVICE] Upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Upload image via backend API
   * @param {File} file - Image file to upload
   * @param {object} options - Upload options
   * @returns {Promise<object>} - Upload result
   */
  async uploadViaBackend(file, options = {}) {
    const {
      folder = 'lang-school',
      publicId = null,
      tags = [],
      transformations = {}
    } = options

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    
    if (publicId) {
      formData.append('public_id', publicId)
    }
    
    if (tags.length > 0) {
      formData.append('tags', tags.join(','))
    }

    if (Object.keys(transformations).length > 0) {
      formData.append('transformations', JSON.stringify(transformations))
    }

    const result = await apiService.uploadImage(formData)
    
    if (!result.success) {
      throw new Error(result.error)
    }

    return result.data
  }

  /**
   * Upload teacher photo
   * @param {File} file - Image file
   * @param {number} teacherId - Teacher ID
   * @returns {Promise<object>} - Upload result
   */
  async uploadTeacherPhoto(file, teacherId) {
    try {
      console.log('🔍 [CLOUDINARY_SERVICE] Uploading teacher photo', { teacherId })

      const result = await apiService.uploadTeacherPhoto(file, teacherId)
      
      if (result.success) {
        console.log('✅ [CLOUDINARY_SERVICE] Teacher photo uploaded successfully', {
          teacherId,
          publicId: result.data.publicId
        })
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('❌ [CLOUDINARY_SERVICE] Teacher photo upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Upload course image
   * @param {File} file - Image file
   * @param {number} courseId - Course ID
   * @returns {Promise<object>} - Upload result
   */
  async uploadCourseImage(file, courseId) {
    try {
      console.log('🔍 [CLOUDINARY_SERVICE] Uploading course image', { courseId })

      const result = await apiService.uploadCourseImage(file, courseId)
      
      if (result.success) {
        console.log('✅ [CLOUDINARY_SERVICE] Course image uploaded successfully', {
          courseId,
          publicId: result.data.publicId
        })
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('❌ [CLOUDINARY_SERVICE] Course image upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Upload mission banner
   * @param {File} file - Image file
   * @returns {Promise<object>} - Upload result
   */
  async uploadMissionBanner(file) {
    try {
      console.log('🔍 [CLOUDINARY_SERVICE] Uploading mission banner')

      const result = await apiService.uploadMissionBanner(file)
      
      if (result.success) {
        console.log('✅ [CLOUDINARY_SERVICE] Mission banner uploaded successfully', {
          publicId: result.data.publicId
        })
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('❌ [CLOUDINARY_SERVICE] Mission banner upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<object>} - Delete result
   */
  async deleteImage(publicId) {
    try {
      console.log('🔍 [CLOUDINARY_SERVICE] Deleting image', { publicId })

      const result = await apiService.deleteImage(publicId)
      
      if (result.success) {
        console.log('✅ [CLOUDINARY_SERVICE] Image deleted successfully', { publicId })
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('❌ [CLOUDINARY_SERVICE] Image delete error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get optimized image URL
   * @param {string} publicId - Cloudinary public ID
   * @param {object} transformations - Image transformations
   * @returns {string} - Optimized image URL
   */
  getOptimizedImageUrl(publicId, transformations = {}) {
    return cloudinaryUtils.getOptimizedImageUrl(publicId, transformations)
  }

  /**
   * Get responsive image URLs
   * @param {string} publicId - Cloudinary public ID
   * @param {object} options - Responsive options
   * @returns {object} - Responsive image URLs
   */
  getResponsiveImageUrls(publicId, options = {}) {
    return cloudinaryUtils.getResponsiveImageUrls(publicId, options)
  }

  /**
   * Validate image file
   * @param {File} file - Image file to validate
   * @param {object} options - Validation options
   * @returns {object} - Validation result
   */
  validateImageFile(file, options = {}) {
    return cloudinaryUtils.validateImageFile(file, options)
  }

  /**
   * Resize image file
   * @param {File} file - Image file to resize
   * @param {object} options - Resize options
   * @returns {Promise<File>} - Resized file
   */
  async resizeImageFile(file, options = {}) {
    return cloudinaryUtils.resizeImageFile(file, options)
  }

  /**
   * Bulk upload multiple images
   * @param {File[]} files - Array of image files
   * @param {object} options - Upload options
   * @returns {Promise<object>} - Upload results
   */
  async bulkUploadImages(files, options = {}) {
    try {
      console.log('🔍 [CLOUDINARY_SERVICE] Starting bulk upload', {
        fileCount: files.length,
        options
      })

      const results = await Promise.allSettled(
        files.map(file => this.uploadImage(file, options))
      )

      const successful = results
        .filter(result => result.status === 'fulfilled' && result.value.success)
        .map(result => result.value)

      const failed = results
        .filter(result => result.status === 'rejected' || !result.value.success)
        .map(result => result.status === 'rejected' ? result.reason : result.value.error)

      console.log('✅ [CLOUDINARY_SERVICE] Bulk upload completed', {
        successful: successful.length,
        failed: failed.length
      })

      return {
        success: true,
        results: successful,
        errors: failed,
        total: files.length,
        successful: successful.length,
        failed: failed.length
      }
    } catch (error) {
      console.error('❌ [CLOUDINARY_SERVICE] Bulk upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get image information
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<object>} - Image information
   */
  async getImageInfo(publicId) {
    try {
      console.log('🔍 [CLOUDINARY_SERVICE] Getting image info', { publicId })

      const result = await apiService.getImageInfo(publicId)
      
      if (result.success) {
        console.log('✅ [CLOUDINARY_SERVICE] Image info retrieved successfully', {
          publicId,
          width: result.data.width,
          height: result.data.height
        })
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('❌ [CLOUDINARY_SERVICE] Get image info error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * List images in folder
   * @param {string} folder - Folder path
   * @param {object} options - List options
   * @returns {Promise<object>} - List result
   */
  async listImages(folder = 'lang-school', options = {}) {
    try {
      console.log('🔍 [CLOUDINARY_SERVICE] Listing images', { folder, options })

      const result = await apiService.listImages(folder, options)
      
      if (result.success) {
        console.log('✅ [CLOUDINARY_SERVICE] Images listed successfully', {
          folder,
          count: result.data.length
        })
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('❌ [CLOUDINARY_SERVICE] List images error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Upload any file type using signed upload tokens (hybrid approach)
   * @param {File} file - File to upload
   * @param {string} folder - Cloudinary folder path
   * @param {object} options - Upload options
   * @returns {Promise<object>} - Upload result
   */
  async uploadFile(file, folder = 'lang-school', options = {}) {
    try {
      console.log('📤 [CLOUDINARY] Starting signed upload process:', {
        name: file.name,
        type: file.type,
        size: file.size,
        folder
      })

      // Step 1: Get signed upload token from backend
      // Ensure we have a valid file type (fallback to extension if MIME type is missing/incorrect)
      const fileType = file.type || `application/${file.name.split('.').pop()?.toLowerCase()}`
      
      const tokenResponse = await apiService.getUploadToken({
        fileType: fileType,
        fileSize: file.size,
        folder: folder,
        fileName: file.name
      })

      console.log('🔍 [CLOUDINARY] Token response:', tokenResponse)

      if (!tokenResponse.success) {
        throw new Error(tokenResponse.error || 'Failed to get upload token')
      }

      // The response data is at the root level, not nested under 'data'
      const responseData = tokenResponse.data || tokenResponse
      
      if (!responseData.signature || !responseData.timestamp || !responseData.cloudName || !responseData.apiKey) {
        console.error('❌ [CLOUDINARY] Invalid token response structure:', responseData)
        throw new Error('Invalid token response - missing required fields')
      }

      const { signature, timestamp, cloudName, apiKey, publicId, resourceType, accessMode } = responseData

      console.log('🔑 [CLOUDINARY] Got upload token:', {
        cloudName,
        apiKey,
        publicId,
        resourceType,
        accessMode,
        hasSignature: !!signature
      })

      // Step 2: Upload directly to Cloudinary with signed parameters
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', apiKey)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('public_id', publicId)
      formData.append('resource_type', resourceType)
      formData.append('folder', folder)
      if (accessMode) {
        formData.append('access_mode', accessMode)
      }
      
      // Add any additional options
      Object.keys(options).forEach(key => {
        formData.append(key, options[key])
      })

      console.log('📤 [CLOUDINARY] Upload parameters:', {
        apiKey,
        signature,
        timestamp,
        publicId,
        resourceType,
        accessMode,
        folder
      })

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      const result = await response.json()

      if (result.secure_url) {
        console.log('✅ [CLOUDINARY] File uploaded successfully:', {
          publicId: result.public_id,
          secureUrl: result.secure_url,
          accessMode: accessMode
        })

        // Step 3: Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 1000))

        return {
          success: true,
          publicId: result.public_id,
          secureUrl: result.secure_url,
          url: result.secure_url,
          originalFilename: file.name,
          fileSize: file.size,
          fileType: file.type,
          folder: result.folder
        }
      } else {
        console.error('❌ [CLOUDINARY] Upload failed:', result.error)
        return {
          success: false,
          error: result.error?.message || 'Upload failed'
        }
      }
    } catch (error) {
      console.error('❌ [CLOUDINARY] Upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// Create singleton instance
const cloudinaryService = new CloudinaryService()

export default cloudinaryService
