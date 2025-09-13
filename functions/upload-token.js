require('dotenv').config();

const { verifyToken, errorResponse, successResponse, corsHeaders } = require('./utils/database.js')
const cloudinary = require('cloudinary')

// Configure Cloudinary
cloudinary.config(process.env.CLOUDINARY_URL)

const handler = async (event, context) => {
  console.log('🔍 [UPLOAD_TOKEN] Request received', {
    method: event.httpMethod,
    path: event.path,
    hasBody: !!event.body
  })

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  try {
    // Verify authentication
    let user
    try {
      user = verifyToken(event)
      console.log('✅ [UPLOAD_TOKEN] User authenticated', {
        userId: user.userId,
        role: user.role
      })
    } catch (error) {
      console.log('❌ [UPLOAD_TOKEN] Authentication failed', error.message)
      return errorResponse(401, 'Unauthorized')
    }

    if (event.httpMethod !== 'POST') {
      return errorResponse(405, 'Method not allowed')
    }

    const { fileType, fileSize, folder, fileName } = JSON.parse(event.body)

    console.log('📋 [UPLOAD_TOKEN] Upload request', {
      fileType,
      fileSize,
      folder,
      fileName,
      userId: user.userId
    })

    // 1. Validate permissions
    if (user.role !== 'admin') {
      console.log('❌ [UPLOAD_TOKEN] Upload forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Upload not allowed - admin access required')
    }

    // 2. Validate file type
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/aac',
      'audio/flac',
      // Archives
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed'
    ]

    const fileExtension = fileName?.split('.').pop()?.toLowerCase()
    const allowedExtensions = [
      // Documents
      'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx',
      // Images
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
      // Audio
      'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac',
      // Archives
      'zip', 'rar'
    ]
    
    // Check both MIME type and extension for maximum compatibility
    const isValidMimeType = fileType && allowedTypes.includes(fileType)
    const isValidExtension = fileExtension && allowedExtensions.includes(fileExtension)
    const isValidType = isValidMimeType || isValidExtension
    
    console.log('🔍 [UPLOAD_TOKEN] File type validation:', {
      fileType,
      fileExtension,
      isValidMimeType,
      isValidExtension,
      isValidType
    })
    
    if (!isValidType) {
      console.log('❌ [UPLOAD_TOKEN] Invalid file type', { fileType, fileExtension })
      return errorResponse(400, 'Invalid file type. Allowed: PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF, WEBP, SVG, MP3, WAV, OGG, M4A, AAC, FLAC, ZIP, RAR')
    }

    // 3. Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (fileSize > MAX_FILE_SIZE) {
      console.log('❌ [UPLOAD_TOKEN] File too large', { fileSize, maxSize: MAX_FILE_SIZE })
      return errorResponse(400, 'File too large. Maximum size is 50MB')
    }

    // 4. Validate folder (basic check)
    if (!folder || typeof folder !== 'string') {
      console.log('❌ [UPLOAD_TOKEN] Invalid folder', { folder })
      return errorResponse(400, 'Valid folder required')
    }

    // 5. Extract Cloudinary configuration
    const cloudinaryUrl = process.env.CLOUDINARY_URL
    if (!cloudinaryUrl) {
      console.log('❌ [UPLOAD_TOKEN] CLOUDINARY_URL not configured')
      return errorResponse(500, 'Cloudinary configuration missing')
    }

    // Parse Cloudinary URL to get cloud name, API key, and API secret
    // CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
    const urlMatch = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/)
    
    if (!urlMatch) {
      console.log('❌ [UPLOAD_TOKEN] Invalid CLOUDINARY_URL format')
      return errorResponse(500, 'Invalid Cloudinary URL format')
    }
    
    const [, apiKey, apiSecret, cloudName] = urlMatch

    console.log('🔍 [UPLOAD_TOKEN] URL parsing debug:', {
      originalUrl: cloudinaryUrl,
      apiKey,
      apiSecret: apiSecret ? apiSecret.substring(0, 10) + '...' : 'undefined',
      cloudName
    })

    console.log('🔍 [UPLOAD_TOKEN] Cloudinary config', {
      cloudName,
      apiKey,
      hasApiSecret: !!apiSecret,
      apiSecretLength: apiSecret?.length || 0
    })

    // 6. Generate signed upload parameters
    const timestamp = Math.round(new Date().getTime() / 1000)
    // Don't include folder in publicId since it's already set in the upload parameters
    const publicId = `${fileName}_${timestamp}` // Unique filename
    
    // Parameters for signature generation (must match what Cloudinary expects)
    // For auto uploads, we don't need resource_type in signature
    const signatureParams = {
      timestamp: timestamp,
      folder: folder,
      public_id: publicId,
      access_mode: 'public'
    }

    console.log('🔍 [UPLOAD_TOKEN] Auto signature params:', signatureParams)
    console.log('🔍 [UPLOAD_TOKEN] Auto keys:', Object.keys(signatureParams))

    // Generate signature manually to ensure all parameters are included
    const crypto = require('crypto')
    
    // Create the signature string manually with proper ordering (alphabetical)
    const signatureString = `access_mode=public&folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`
    
    console.log('🔍 [UPLOAD_TOKEN] Manual signature string:', signatureString)
    console.log('🔍 [UPLOAD_TOKEN] String length:', signatureString.length)
    
    const signature = crypto
      .createHash('sha1')
      .update(signatureString + apiSecret)
      .digest('hex')

    console.log('🔍 [UPLOAD_TOKEN] Generated signature:', signature)
    console.log('🔍 [UPLOAD_TOKEN] API Secret length:', apiSecret?.length || 0)

    console.log('✅ [UPLOAD_TOKEN] Generated upload token', {
      timestamp,
      folder,
      cloudName,
      signature: signature.substring(0, 10) + '...'
    })

    return successResponse({
      signature,
      timestamp,
      cloudName,
      apiKey,
      folder,
      publicId: publicId,
      resourceType: 'auto', // Use 'auto' for public access
      accessMode: 'public'
    })

  } catch (error) {
    console.error('❌ [UPLOAD_TOKEN] Error:', error)
    return errorResponse(500, 'Failed to generate upload token: ' + error.message)
  }
}

module.exports = { handler }
