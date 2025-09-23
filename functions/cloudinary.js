require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders  } = require('./utils/database.js')
const cloudinary = require('cloudinary')
const formidable = require('formidable').formidable

// Configure Cloudinary
cloudinary.config(process.env.CLOUDINARY_URL)

const handler = async (event, context) => {
  console.log('🔍 [CLOUDINARY_HANDLER] Request received', {
    method: event.httpMethod,
    path: event.path,
    hasBody: !!event.body,
    bodyLength: event.body?.length || 0
  })

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  const { path } = event
  const method = event.httpMethod

  try {
    // Verify authentication for all routes
    let user
    try {
      user = verifyToken(event)
      console.log('✅ [CLOUDINARY_HANDLER] User authenticated', {
        userId: user.userId,
        role: user.role
      })
    } catch (error) {
      console.log('❌ [CLOUDINARY_HANDLER] Authentication failed', error.message)
      return errorResponse(401, 'Unauthorized')
    }

    // Route to appropriate handler
    if (path === '/api/cloudinary/upload' && method === 'POST') {
      // Check if this is a file upload (multipart) or image upload (JSON)
      const contentType = event.headers['content-type'] || event.headers['Content-Type'] || ''
      if (contentType.includes('multipart/form-data')) {
        console.log('🔍 [CLOUDINARY_HANDLER] Routing to uploadFile')
        return await uploadFile(event, user)
      } else {
        console.log('🔍 [CLOUDINARY_HANDLER] Routing to uploadImage')
        return await uploadImage(event, user)
      }
    } else if (path === '/api/cloudinary/delete' && method === 'DELETE') {
      return await deleteImage(event, user)
    } else if (path === '/api/cloudinary/upload-teacher-photo' && method === 'POST') {
      return await uploadTeacherPhoto(event, user)
    } else if (path === '/api/cloudinary/upload-course-image' && method === 'POST') {
      return await uploadCourseImage(event, user)
    } else if (path === '/api/cloudinary/upload-mission-banner' && method === 'POST') {
      return await uploadMissionBanner(event, user)
    } else if (path === '/api/cloudinary/transform' && method === 'GET') {
      return await getTransformedImage(event, user)
    } else if (path === '/api/cloudinary/bulk-upload' && method === 'POST') {
      return await bulkUploadImages(event, user)
    } else if (path === '/api/cloudinary/images' && method === 'GET') {
      return await listImages(event, user)
    } else if (path === '/api/cloudinary/cleanup-orphaned' && method === 'POST') {
      return await cleanupOrphanedImages(event, user)
    } else {
      console.log('❌ [CLOUDINARY_HANDLER] Route not found', { path, method })
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('❌ [CLOUDINARY_HANDLER] Cloudinary API error:', error)
    console.error('❌ [CLOUDINARY_HANDLER] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return errorResponse(500, 'Internal server error: ' + error.message)
  }
}

// Upload image to Cloudinary
async function uploadImage(event, user) {
  try {
    console.log('🔍 [CLOUDINARY] Upload image called', {
      userId: user.userId,
      role: user.role,
      hasBody: !!event.body,
      bodyLength: event.body?.length || 0
    })

    const { image, folder, public_id, transformations } = JSON.parse(event.body)

    console.log('📋 [CLOUDINARY] Upload parameters', {
      hasImage: !!image,
      folder,
      hasPublicId: !!public_id,
      hasTransformations: !!transformations,
      imageLength: image?.length || 0
    })

    if (!image) {
      console.log('❌ [CLOUDINARY] No image data provided')
      return errorResponse(400, 'Image data is required')
    }

    const uploadOptions = {
      folder: folder || 'lang-school',
      resource_type: 'auto'
    }

    if (public_id) {
      uploadOptions.public_id = public_id
    }

    if (transformations) {
      uploadOptions.transformation = transformations
    }

    console.log('🔍 [CLOUDINARY] Upload options', uploadOptions)
    console.log('🔍 [CLOUDINARY] CLOUDINARY_URL configured:', !!process.env.CLOUDINARY_URL)

    const result = await cloudinary.uploader.upload(image, uploadOptions)

    console.log('✅ [CLOUDINARY] Upload successful', {
      public_id: result.public_id,
      secure_url: result.secure_url?.substring(0, 50) + '...',
      width: result.width,
      height: result.height
    })

    return successResponse({
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    })
  } catch (error) {
    console.error('❌ [CLOUDINARY] Upload image error:', error)
    console.error('❌ [CLOUDINARY] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return errorResponse(500, 'Failed to upload image: ' + error.message)
  }
}

// Upload file to Cloudinary (handles multipart form data)
async function uploadFile(event, user) {
  try {
    console.log('🔍 [CLOUDINARY] Upload file called', {
      userId: user.userId,
      role: user.role,
      hasBody: !!event.body,
      bodyLength: event.body?.length || 0
    })

    // Parse multipart form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      keepExtensions: true
    })

    const [fields, files] = await form.parse(event.body)
    
    console.log('📋 [CLOUDINARY] Parsed form data', {
      fields: Object.keys(fields),
      files: Object.keys(files)
    })

    const file = files.file?.[0]
    const folder = fields.folder?.[0] || 'lang-school/files'
    const resourceType = fields.resource_type?.[0] || 'raw'

    if (!file) {
      console.log('❌ [CLOUDINARY] No file provided')
      return errorResponse(400, 'No file provided')
    }

    console.log('📤 [CLOUDINARY] Uploading file to Cloudinary', {
      originalFilename: file.originalFilename,
      filepath: file.filepath,
      mimetype: file.mimetype,
      size: file.size,
      folder,
      resourceType
    })

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.filepath, {
      folder: folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true
    })

    console.log('✅ [CLOUDINARY] File uploaded successfully', {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      originalFilename: file.originalFilename
    })

    return successResponse({
      success: true,
      publicId: result.public_id,
      secureUrl: result.secure_url,
      originalFilename: file.originalFilename,
      fileSize: file.size,
      fileType: file.mimetype,
      folder: result.folder
    })

  } catch (error) {
    console.error('❌ [CLOUDINARY] Upload file error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return errorResponse(500, 'Failed to upload file: ' + error.message)
  }
}

// Delete image from Cloudinary (API endpoint)
async function deleteImage(event, user) {
  try {
    const { public_id } = JSON.parse(event.body)

    if (!public_id) {
      return errorResponse(400, 'Public ID is required')
    }

    const result = await cloudinary.uploader.destroy(public_id)

    if (result.result === 'ok') {
      return successResponse({ message: 'Image deleted successfully' })
    } else {
      return errorResponse(404, 'Image not found')
    }
  } catch (error) {
    console.error('Delete image error:', error)
    return errorResponse(500, 'Failed to delete image')
  }
}

// Delete image from Cloudinary (programmatic function)
async function deleteImageByPublicId(publicId) {
  try {
    if (!publicId) {
      console.log('No public ID provided, skipping Cloudinary deletion')
      return { success: true, message: 'No image to delete' }
    }

    const result = await cloudinary.uploader.destroy(publicId)
    
    if (result.result === 'ok') {
      console.log('✅ Image deleted from Cloudinary:', publicId)
      return { success: true, message: 'Image deleted successfully' }
    } else {
      console.log('⚠️ Image not found in Cloudinary:', publicId)
      return { success: true, message: 'Image not found (already deleted)' }
    }
  } catch (error) {
    console.error('❌ Error deleting image from Cloudinary:', error)
    return { success: false, error: error.message }
  }
}

// Upload teacher photo
async function uploadTeacherPhoto(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { teacher_id, image } = JSON.parse(event.body)

    if (!teacher_id || !image) {
      return errorResponse(400, 'Teacher ID and image are required')
    }

    const uploadOptions = {
      folder: 'lang-school/teachers',
      public_id: `teacher_${teacher_id}`,
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    }

    const result = await cloudinary.uploader.upload(image, uploadOptions)

    // Update teacher record in database
    await query(
      'UPDATE teachers SET photo_url = $1, photo_public_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [result.secure_url, result.public_id, teacher_id]
    )

    return successResponse({
      public_id: result.public_id,
      secure_url: result.secure_url,
      teacher_id: teacher_id
    })
  } catch (error) {
    console.error('Upload teacher photo error:', error)
    return errorResponse(500, 'Failed to upload teacher photo')
  }
}

// Upload course image
async function uploadCourseImage(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { course_id, image } = JSON.parse(event.body)

    if (!course_id || !image) {
      return errorResponse(400, 'Course ID and image are required')
    }

    const uploadOptions = {
      folder: 'lang-school/courses',
      public_id: `course_${course_id}`,
      transformation: [
        { width: 800, height: 600, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    }

    const result = await cloudinary.uploader.upload(image, uploadOptions)

    // Update course record in database
    await query(
      'UPDATE courses SET background_image = $1, background_image_public_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [result.secure_url, result.public_id, course_id]
    )

    return successResponse({
      public_id: result.public_id,
      secure_url: result.secure_url,
      course_id: course_id
    })
  } catch (error) {
    console.error('Upload course image error:', error)
    return errorResponse(500, 'Failed to upload course image')
  }
}

// Upload mission banner
async function uploadMissionBanner(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { image } = JSON.parse(event.body)

    if (!image) {
      return errorResponse(400, 'Image is required')
    }

    const uploadOptions = {
      folder: 'lang-school/banners',
      public_id: 'mission_banner',
      transformation: [
        { width: 1200, height: 400, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    }

    const result = await cloudinary.uploader.upload(image, uploadOptions)

    // Update mission content in database
    await query(
      'UPDATE mission_content SET banner_image = $1, banner_image_public_id = $2, updated_at = CURRENT_TIMESTAMP WHERE is_active = true',
      [result.secure_url, result.public_id]
    )

    return successResponse({
      public_id: result.public_id,
      secure_url: result.secure_url
    })
  } catch (error) {
    console.error('Upload mission banner error:', error)
    return errorResponse(500, 'Failed to upload mission banner')
  }
}

// Get transformed image URL
async function getTransformedImage(event, user) {
  try {
    const { public_id, transformations } = event.queryStringParameters || {}

    if (!public_id) {
      return errorResponse(400, 'Public ID is required')
    }

    let url = cloudinary.url(public_id)

    if (transformations) {
      const transformArray = transformations.split(',')
      url = cloudinary.url(public_id, {
        transformation: transformArray.map(t => {
          const [key, value] = t.split(':')
          return { [key]: value }
        })
      })
    }

    return successResponse({ url })
  } catch (error) {
    console.error('Get transformed image error:', error)
    return errorResponse(500, 'Failed to get transformed image')
  }
}

// Bulk upload images
async function bulkUploadImages(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { images, folder } = JSON.parse(event.body)

    if (!Array.isArray(images)) {
      return errorResponse(400, 'Images must be an array')
    }

    const results = []
    const errors = []

    for (let i = 0; i < images.length; i++) {
      try {
        const image = images[i]
        const uploadOptions = {
          folder: folder || 'lang-school/bulk',
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto'
        }

        const result = await cloudinary.uploader.upload(image, uploadOptions)
        results.push({
          index: i,
          public_id: result.public_id,
          secure_url: result.secure_url
        })
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        })
      }
    }

    return successResponse({
      results,
      errors,
      total: images.length,
      successful: results.length,
      failed: errors.length
    })
  } catch (error) {
    console.error('Bulk upload images error:', error)
    return errorResponse(500, 'Failed to bulk upload images')
  }
}

// List images
async function listImages(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { folder, max_results = 50, next_cursor } = event.queryStringParameters || {}

    const options = {
      max_results: parseInt(max_results),
      resource_type: 'image'
    }

    if (folder) {
      options.prefix = folder
    }

    if (next_cursor) {
      options.next_cursor = next_cursor
    }

    const result = await cloudinary.api.resources(options)

    return successResponse({
      resources: result.resources,
      next_cursor: result.next_cursor,
      total_count: result.total_count
    })
  } catch (error) {
    console.error('List images error:', error)
    return errorResponse(500, 'Failed to list images')
  }
}

// Cleanup orphaned images
async function cleanupOrphanedImages(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    // Get all photo_public_ids from active teachers
    const activeTeachers = await query(
      'SELECT photo_public_id FROM teachers WHERE is_active = true AND photo_public_id IS NOT NULL'
    )
    
    const activePublicIds = activeTeachers.rows.map(row => row.photo_public_id)
    
    // Get all photo_public_ids from Cloudinary
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'lang-school/teachers/',
      max_results: 500
    })
    
    const cloudinaryPublicIds = result.resources.map(resource => resource.public_id)
    
    // Find orphaned images
    const orphanedIds = cloudinaryPublicIds.filter(id => !activePublicIds.includes(id))
    
    console.log(`Found ${orphanedIds.length} orphaned images`)
    
    // Delete orphaned images
    let deletedCount = 0
    let errorCount = 0
    
    for (const publicId of orphanedIds) {
      try {
        const deleteResult = await deleteImageByPublicId(publicId)
        if (deleteResult.success) {
          deletedCount++
        } else {
          errorCount++
        }
      } catch (error) {
        console.error(`Error deleting ${publicId}:`, error)
        errorCount++
      }
    }
    
    return successResponse({ 
      message: `Cleanup completed. Deleted ${deletedCount} orphaned images.`,
      deleted: deletedCount,
      errors: errorCount,
      total_found: orphanedIds.length
    })
  } catch (error) {
    console.error('Cleanup orphaned images error:', error)
    return errorResponse(500, 'Cleanup failed')
  }
}

// Export the handler for Netlify Functions
module.exports = {
  handler,
  deleteImageByPublicId
}
