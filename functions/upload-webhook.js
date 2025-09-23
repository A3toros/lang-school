require('dotenv').config();

const { successResponse, errorResponse, query, corsHeaders } = require('./utils/database.js')
const crypto = require('crypto')

const handler = async (event, context) => {
  console.log('🔍 [UPLOAD_WEBHOOK] Webhook received', {
    method: event.httpMethod,
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

  try {
    if (event.httpMethod !== 'POST') {
      return errorResponse(405, 'Method not allowed')
    }

    // 1. Verify webhook signature (security)
    const webhookSecret = process.env.CLOUDINARY_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = event.headers['x-cloudinary-signature'] || event.headers['X-Cloudinary-Signature']
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(event.body)
        .digest('hex')

      if (signature !== expectedSignature) {
        console.log('❌ [UPLOAD_WEBHOOK] Invalid webhook signature')
        return errorResponse(401, 'Invalid webhook signature')
      }
    }

    // 2. Parse upload data
    const uploadData = JSON.parse(event.body)
    console.log('📋 [UPLOAD_WEBHOOK] Upload data received', {
      publicId: uploadData.public_id,
      secureUrl: uploadData.secure_url,
      bytes: uploadData.bytes,
      format: uploadData.format,
      folder: uploadData.folder
    })

    // 3. Validate required fields
    const { public_id, secure_url, bytes, format, folder } = uploadData
    if (!public_id || !secure_url || !bytes || !format) {
      console.log('❌ [UPLOAD_WEBHOOK] Missing required fields', {
        hasPublicId: !!public_id,
        hasSecureUrl: !!secure_url,
        hasBytes: !!bytes,
        hasFormat: !!format
      })
      return errorResponse(400, 'Missing required upload data')
    }

    // 4. Extract folder ID from folder path
    let folderId = null
    if (folder && folder !== 'lang-school/files') {
      // Extract folder ID from folder path (e.g., "lang-school/files/folder-123" -> 123)
      const folderMatch = folder.match(/folder-(\d+)$/)
      if (folderMatch) {
        folderId = parseInt(folderMatch[1])
      }
    }

    // 5. Save file record to database
    const insertQuery = `
      INSERT INTO shared_files 
      (cloudinary_public_id, cloudinary_url, original_name, display_name, file_type, file_size, folder_id, uploaded_by, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `

    // Extract filename from public_id
    const fileName = public_id.split('/').pop().replace(/_(\d+)$/, '') // Remove timestamp suffix
    const displayName = fileName

    const result = await query(insertQuery, [
      public_id,
      secure_url,
      fileName,
      displayName,
      format,
      bytes,
      folderId,
      1, // Default uploaded_by (admin)
      true // is_active
    ])

    const fileId = result.rows[0].id

    console.log('✅ [UPLOAD_WEBHOOK] File saved to database', {
      fileId,
      publicId: public_id,
      folderId,
      fileName
    })

    return successResponse({
      message: 'File uploaded and recorded successfully',
      fileId,
      publicId: public_id,
      url: secure_url
    })

  } catch (error) {
    console.error('❌ [UPLOAD_WEBHOOK] Error:', error)
    return errorResponse(500, 'Failed to process upload webhook: ' + error.message)
  }
}

module.exports = { handler }
