const { verifyToken, errorResponse, successResponse } = require('./utils/database')
const cloudinary = require('cloudinary').v2

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: require('./utils/database').corsHeaders,
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
    } catch (error) {
      return errorResponse(401, 'Unauthorized')
    }

    // Route to appropriate handler
    if (path === '/api/cloudinary/upload' && method === 'POST') {
      return await uploadImage(event, user)
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
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Cloudinary API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Upload image to Cloudinary
async function uploadImage(event, user) {
  try {
    const { image, folder, public_id, transformations } = JSON.parse(event.body)

    if (!image) {
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

    const result = await cloudinary.uploader.upload(image, uploadOptions)

    return successResponse({
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    })
  } catch (error) {
    console.error('Upload image error:', error)
    return errorResponse(500, 'Failed to upload image')
  }
}

// Delete image from Cloudinary
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
    const { query } = require('./utils/database')
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
    const { query } = require('./utils/database')
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
    const { query } = require('./utils/database')
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
