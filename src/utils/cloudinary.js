/**
 * Cloudinary utility functions for image upload and management
 */

const CLOUDINARY_URL = import.meta.env.VITE_CLOUDINARY_URL || 'cloudinary://252927275769619:0QungPQ1DalxpwHvJE1COjICbww@dnovxoaqi'

/**
 * Extracts Cloudinary configuration from URL
 * @returns {object} - Cloudinary configuration
 */
export const getCloudinaryConfig = () => {
  try {
    const url = new URL(CLOUDINARY_URL.replace('cloudinary://', 'https://'))
    const [apiKey, apiSecret] = url.username.split(':')
    const cloudName = url.hostname.split('.')[0]
    
    
    return {
      cloudName,
      apiKey,
      apiSecret,
      uploadPreset: 'lang-school-uploads'
    }
  } catch (error) {
    console.error('❌ [CLOUDINARY] Error parsing Cloudinary URL:', error)
    return null
  }
}

/**
 * Generates Cloudinary upload URL
 * @returns {string} - Upload URL
 */
export const getUploadUrl = () => {
  const config = getCloudinaryConfig()
  if (!config) return null
  
  return `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`
}

/**
 * Generates optimized image URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {object} transformations - Image transformations
 * @returns {string} - Optimized image URL
 */
export const getOptimizedImageUrl = (publicId, transformations = {}) => {
  const config = getCloudinaryConfig()
  if (!config || !publicId) return null

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
    radius = null,
    effect = null,
    aspectRatio = null,
    responsive = false
  } = transformations

  let url = `https://res.cloudinary.com/${config.cloudName}/image/upload`
  
  // Build transformation string
  const transforms = []
  
  // Handle responsive width - use w_auto for responsive images
  if (responsive) {
    transforms.push('w_auto')
    transforms.push('c_scale') // Use scale crop for responsive images
  } else if (width) {
    transforms.push(`w_${width}`)
  }
  
  if (height) transforms.push(`h_${height}`)
  if (aspectRatio) transforms.push(`ar_${aspectRatio}`)
  if (crop) transforms.push(`c_${crop}`)
  if (gravity) transforms.push(`g_${gravity}`)
  if (quality) transforms.push(`q_${quality}`)
  if (format) transforms.push(`f_${format}`)
  if (radius) transforms.push(`r_${radius}`)
  if (effect) transforms.push(`e_${effect}`)
  
  if (transforms.length > 0) {
    url += `/${transforms.join(',')}`
  }
  
  url += `/${publicId}`
  
  
  return url
}

/**
 * Generates responsive image URLs for different screen sizes
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Responsive options
 * @returns {object} - Responsive image URLs
 */
export const getResponsiveImageUrls = (publicId, options = {}) => {
  const {
    baseWidth = 800,
    baseHeight = 600,
    quality = 'auto',
    format = 'auto'
  } = options

  return {
    thumbnail: getOptimizedImageUrl(publicId, {
      width: 150,
      height: 150,
      crop: 'fill',
      quality,
      format
    }),
    small: getOptimizedImageUrl(publicId, {
      width: 400,
      height: 300,
      crop: 'fill',
      quality,
      format
    }),
    medium: getOptimizedImageUrl(publicId, {
      width: 800,
      height: 600,
      crop: 'fill',
      quality,
      format
    }),
    large: getOptimizedImageUrl(publicId, {
      width: 1200,
      height: 900,
      crop: 'fill',
      quality,
      format
    }),
    original: getOptimizedImageUrl(publicId, {
      quality: 'auto',
      format: 'auto'
    })
  }
}

/**
 * Generates responsive course image URLs with dynamic aspect ratios
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Responsive options
 * @returns {object} - Responsive course image URLs
 */
export const getResponsiveCourseImages = (publicId, options = {}) => {
  const {
    baseAspectRatio = '16:9',
    quality = 'auto',
    format = 'auto'
  } = options

  return {
    mobile: getOptimizedImageUrl(publicId, {
      width: 400,
      aspectRatio: baseAspectRatio,
      crop: 'fill',
      gravity: 'auto',
      quality,
      format
    }),
    tablet: getOptimizedImageUrl(publicId, {
      width: 800,
      aspectRatio: baseAspectRatio,
      crop: 'fill',
      gravity: 'auto',
      quality,
      format
    }),
    desktop: getOptimizedImageUrl(publicId, {
      width: 1200,
      aspectRatio: baseAspectRatio,
      crop: 'fill',
      gravity: 'auto',
      quality,
      format
    }),
    large: getOptimizedImageUrl(publicId, {
      width: 1600,
      aspectRatio: baseAspectRatio,
      crop: 'fill',
      gravity: 'auto',
      quality,
      format
    }),
    original: getOptimizedImageUrl(publicId, {
      aspectRatio: baseAspectRatio,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto',
      format: 'auto'
    })
  }
}

/**
 * Generates fully responsive image URL that adapts to any container width
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Responsive options
 * @returns {string} - Responsive image URL
 */
export const getResponsiveImage = (publicId, options = {}) => {
  const {
    aspectRatio = null,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto'
  } = options

  return getOptimizedImageUrl(publicId, {
    width: 1200, // Use a reasonable base width
    aspectRatio,
    quality,
    format,
    crop,
    gravity
  })
}

/**
 * Validates image file before upload
 * @param {File} file - Image file to validate
 * @param {object} options - Validation options
 * @returns {object} - Validation result
 */
export const validateImageFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxWidth = 4000,
    maxHeight = 4000
  } = options

  const errors = []

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
  }

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Resizes image file before upload
 * @param {File} file - Image file to resize
 * @param {object} options - Resize options
 * @returns {Promise<File>} - Resized file
 */
export const resizeImageFile = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8
    } = options

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(resizedFile)
          } else {
            reject(new Error('Failed to resize image'))
          }
        },
        file.type,
        quality
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Generates Cloudinary signature for secure uploads
 * @param {object} params - Upload parameters
 * @returns {string} - Signature
 */
export const generateSignature = (params) => {
  const config = getCloudinaryConfig()
  if (!config) return null

  // This would typically be done on the server side for security
  // For now, we'll use unsigned uploads with upload presets
  console.warn('⚠️ [CLOUDINARY] Using unsigned uploads. Consider implementing server-side signature generation for production.')
  return null
}

/**
 * Uploads image to Cloudinary
 * @param {File} file - Image file to upload
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
export const uploadImage = async (file, options = {}) => {
  const {
    folder = 'lang-school',
    publicId = null,
    tags = [],
    transformations = {}
  } = options

  const config = getCloudinaryConfig()
  if (!config) {
    throw new Error('Cloudinary configuration not found')
  }

  // Validate file
  const validation = validateImageFile(file)
  if (!validation.isValid) {
    throw new Error(`Invalid file: ${validation.errors.join(', ')}`)
  }

  // Resize if needed
  let fileToUpload = file
  if (file.size > 2 * 1024 * 1024) { // Resize if larger than 2MB
    try {
      fileToUpload = await resizeImageFile(file, { maxWidth: 1920, maxHeight: 1080 })
    } catch (error) {
      console.warn('⚠️ [CLOUDINARY] Failed to resize image, uploading original:', error)
    }
  }

  // Prepare form data
  const formData = new FormData()
  formData.append('file', fileToUpload)
  formData.append('upload_preset', config.uploadPreset)
  formData.append('folder', folder)
  
  if (publicId) {
    formData.append('public_id', publicId)
  }
  
  if (tags.length > 0) {
    formData.append('tags', tags.join(','))
  }

  // Add transformations
  if (Object.keys(transformations).length > 0) {
    const transformString = Object.entries(transformations)
      .map(([key, value]) => `${key}_${value}`)
      .join(',')
    formData.append('transformation', transformString)
  }

  try {
    console.log('🔍 [CLOUDINARY] Uploading image', {
      fileName: file.name,
      fileSize: fileToUpload.size,
      folder,
      tags
    })

    const response = await fetch(getUploadUrl(), {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    console.log('✅ [CLOUDINARY] Image uploaded successfully', {
      publicId: result.public_id,
      url: result.secure_url,
      size: result.bytes
    })

    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    }
  } catch (error) {
    console.error('❌ [CLOUDINARY] Upload error:', error)
    throw error
  }
}

/**
 * Deletes image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} - Delete result
 */
export const deleteImage = async (publicId) => {
  const config = getCloudinaryConfig()
  if (!config) {
    throw new Error('Cloudinary configuration not found')
  }

  try {
    console.log('🔍 [CLOUDINARY] Deleting image', { publicId })

    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_id: publicId,
        api_key: config.apiKey,
        timestamp: Math.floor(Date.now() / 1000)
      })
    })

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    console.log('✅ [CLOUDINARY] Image deleted successfully', { publicId })

    return {
      success: true,
      result
    }
  } catch (error) {
    console.error('❌ [CLOUDINARY] Delete error:', error)
    throw error
  }
}

export default {
  getCloudinaryConfig,
  getUploadUrl,
  getOptimizedImageUrl,
  getResponsiveImageUrls,
  getResponsiveCourseImages,
  getResponsiveImage,
  validateImageFile,
  resizeImageFile,
  generateSignature,
  uploadImage,
  deleteImage
}
