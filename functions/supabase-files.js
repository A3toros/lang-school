require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, corsHeaders } = require('./utils/database.js')
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_PROJECT_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 [SUPABASE_FILES] Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing'
})

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS')
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }

  const { path } = event
  const method = event.httpMethod

  try {
    // Check if this is a public endpoint that doesn't require authentication
    let user = null
    let isPublicEndpoint = false

    if (path === '/api/supabase-files/public' && method === 'GET') {
      // Public file access for teachers
      isPublicEndpoint = true
    } else if (path.match(/^\/api\/supabase-files\/\d+\/download\/public$/) && method === 'GET') {
      // Public file download - no authentication required
      isPublicEndpoint = true
    } else {
      // All other routes require authentication
      try {
        user = verifyToken(event)
      } catch (error) {
        return errorResponse(401, 'Unauthorized')
      }
    }

    // Route to appropriate handler
    if (path === '/api/supabase-files/upload' && method === 'POST') {
      return await uploadFile(event, user)
    } else if (path.match(/^\/api\/supabase-files\/\d+\/download$/) && method === 'GET') {
      return await downloadFile(event, user)
    } else if (path.match(/^\/api\/supabase-files\/\d+\/download\/public$/) && method === 'GET') {
      return await downloadFilePublic(event, user)
    } else if (path === '/api/supabase-files/public' && method === 'GET') {
      return await getPublicFiles(event, user)
    } else if (path.match(/^\/api\/supabase-files\/\d+\/view$/) && method === 'GET') {
      return await getFileViewUrl(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Supabase Files API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Upload file to Supabase
async function uploadFile(event, user) {
  console.log('🔍 [SUPABASE_FILES] uploadFile called', {
    userId: user.userId,
    role: user.role,
    path: event.path,
    method: event.httpMethod
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [SUPABASE_FILES] Upload file forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    // Parse JSON data (file already uploaded to Supabase)
    const contentType = event.headers['content-type'] || event.headers['Content-Type']
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse(400, 'Content-Type must be application/json')
    }

    // Parse the file metadata from JSON body
    const fileData = JSON.parse(event.body)
    console.log('🔍 [SUPABASE_FILES] Received file data:', fileData)
    
    const { folder_id, original_name, display_name, file_type, file_size, supabase_path, supabase_bucket, content_type } = fileData

    if (!original_name || !display_name || !file_type || !supabase_path) {
      console.log('❌ [SUPABASE_FILES] Missing required fields:', {
        folder_id: !!folder_id,
        original_name: !!original_name,
        display_name: !!display_name,
        file_type: !!file_type,
        supabase_path: !!supabase_path
      })
      return errorResponse(400, 'Missing required file data')
    }

    // Validate folder exists (if folder_id is provided)
    if (folder_id) {
      const folderCheck = await query(
        'SELECT id FROM file_folders WHERE id = $1 AND is_active = true',
        [folder_id]
      )

      if (folderCheck.rows.length === 0) {
        console.log('❌ [SUPABASE_FILES] Folder not found or inactive', { folder_id })
        return errorResponse(404, 'Folder not found')
      }
    }

    // Check if file with same name exists in folder
    const existingFile = await query(
      'SELECT id FROM shared_files WHERE (folder_id = $1 OR (folder_id IS NULL AND $1 IS NULL)) AND display_name = $2 AND is_active = true',
      [folder_id, display_name]
    )

    if (existingFile.rows.length > 0) {
      return errorResponse(400, 'File with this name already exists in this folder')
    }

    const queryText = `
      INSERT INTO shared_files (
        folder_id, original_name, display_name, file_type, file_size, 
        supabase_path, supabase_bucket, content_type, uploaded_by,
        cloudinary_public_id, cloudinary_url, is_active, download_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `
    
    const result = await query(queryText, [
      folder_id,
      original_name,
      display_name,
      file_type,
      file_size,
      supabase_path,
      supabase_bucket || 'files',
      content_type,
      user.userId,
      null, // cloudinary_public_id (null for Supabase files)
      null, // cloudinary_url (null for Supabase files)
      true, // is_active
      0     // download_count
    ])

    console.log('✅ [SUPABASE_FILES] File uploaded successfully', {
      fileId: result.rows[0].id,
      displayName: result.rows[0].display_name,
      folderId: result.rows[0].folder_id,
      supabasePath: result.rows[0].supabase_path
    })

    return successResponse({ file: result.rows[0] })
  } catch (error) {
    console.error('❌ [SUPABASE_FILES] Upload file error:', error)
    return errorResponse(500, 'Failed to upload file')
  }
}

// Download file with signed URL
async function downloadFile(event, user) {
  console.log('🔍 [SUPABASE_FILES] downloadFile called', {
    userId: user.userId,
    role: user.role,
    fileId: event.path.split('/')[3]
  })

  try {
    const fileId = parseInt(event.path.split('/')[3])

    // Get file info
    const fileInfo = await query(
      'SELECT * FROM shared_files WHERE id = $1 AND is_active = true',
      [fileId]
    )

    if (fileInfo.rows.length === 0) {
      return errorResponse(404, 'File not found')
    }

    const file = fileInfo.rows[0]

    // Check if file is stored in Supabase or Cloudinary
    let downloadUrl
    if (file.supabase_path) {
      // Supabase file - generate signed URL
      const { data, error } = await supabase.storage
        .from(file.supabase_bucket || 'files')
        .createSignedUrl(file.supabase_path, 3600)
      
      if (error) {
        console.error('❌ [SUPABASE_FILES] Failed to create signed URL:', error)
        return errorResponse(500, 'Failed to generate download URL')
      }
      
      downloadUrl = data.signedUrl
    } else if (file.cloudinary_url) {
      // Cloudinary file - use existing URL
      downloadUrl = file.cloudinary_url
    } else {
      return errorResponse(404, 'File storage not found')
    }

    // Log download access
    await query(
      'INSERT INTO file_access_logs (file_id, accessed_by, action) VALUES ($1, $2, $3)',
      [fileId, user.userId, 'download']
    )

    // Increment download count
    await query(
      'UPDATE shared_files SET download_count = download_count + 1 WHERE id = $1',
      [fileId]
    )

    console.log('✅ [SUPABASE_FILES] File download initiated', {
      fileId: file.id,
      displayName: file.display_name,
      downloadedBy: user.userId,
      storageType: file.supabase_path ? 'supabase' : 'cloudinary'
    })

    return successResponse({ 
      downloadUrl: downloadUrl,
      fileName: file.display_name,
      fileSize: file.file_size,
      storageType: file.supabase_path ? 'supabase' : 'cloudinary'
    })
  } catch (error) {
    console.error('❌ [SUPABASE_FILES] Download file error:', error)
    return errorResponse(500, 'Failed to download file')
  }
}

// Get file view URL (for preview)
async function getFileViewUrl(event, user) {
  console.log('🔍 [SUPABASE_FILES] getFileViewUrl called', {
    userId: user.userId,
    role: user.role,
    fileId: event.path.split('/')[3]
  })

  try {
    const fileId = parseInt(event.path.split('/')[3])

    // Get file info
    const fileInfo = await query(
      'SELECT * FROM shared_files WHERE id = $1 AND is_active = true',
      [fileId]
    )

    if (fileInfo.rows.length === 0) {
      return errorResponse(404, 'File not found')
    }

    const file = fileInfo.rows[0]

    // Check if file is stored in Supabase or Cloudinary
    let viewUrl
    if (file.supabase_path) {
      // Supabase file - generate signed URL for viewing
      const { data, error } = await supabase.storage
        .from(file.supabase_bucket || 'files')
        .createSignedUrl(file.supabase_path, 3600)
      
      if (error) {
        console.error('❌ [SUPABASE_FILES] Failed to create view URL:', error)
        return errorResponse(500, 'Failed to generate view URL')
      }
      
      viewUrl = data.signedUrl
    } else if (file.cloudinary_url) {
      // Cloudinary file - use existing URL
      viewUrl = file.cloudinary_url
    } else {
      return errorResponse(404, 'File storage not found')
    }

    console.log('✅ [SUPABASE_FILES] File view URL generated', {
      fileId: file.id,
      displayName: file.display_name,
      storageType: file.supabase_path ? 'supabase' : 'cloudinary'
    })

    return successResponse({ 
      viewUrl: viewUrl,
      fileName: file.display_name,
      fileType: file.file_type,
      storageType: file.supabase_path ? 'supabase' : 'cloudinary'
    })
  } catch (error) {
    console.error('❌ [SUPABASE_FILES] Get view URL error:', error)
    return errorResponse(500, 'Failed to get view URL')
  }
}

// Get public files (for teachers)
async function getPublicFiles(event, user) {
  console.log('🔍 [SUPABASE_FILES] getPublicFiles called', {
    userId: user.userId,
    role: user.role
  })

  try {
    const { folder_id, search, file_type } = event.queryStringParameters || {}

    let queryText = `
      SELECT f.*, u.username as uploaded_by_name, fo.name as folder_name
      FROM shared_files f
      LEFT JOIN users u ON f.uploaded_by = u.id
      LEFT JOIN file_folders fo ON f.folder_id = fo.id
      WHERE f.is_active = true
    `
    
    const params = []
    let paramCount = 0

    if (folder_id && folder_id !== 'null') {
      paramCount++
      queryText += ` AND f.folder_id = $${paramCount}`
      params.push(folder_id)
    }

    if (search) {
      paramCount++
      queryText += ` AND (f.display_name ILIKE $${paramCount} OR f.original_name ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    if (file_type) {
      paramCount++
      queryText += ` AND f.file_type = $${paramCount}`
      params.push(file_type)
    }

    queryText += ` ORDER BY f.created_at DESC`

    const result = await query(queryText, params)
    
    console.log('✅ [SUPABASE_FILES] Public files fetched successfully', {
      count: result.rows.length,
      folderId: folder_id,
      search: search,
      fileType: file_type
    })

    return successResponse({ files: result.rows })
  } catch (error) {
    console.error('❌ [SUPABASE_FILES] Get public files error:', error)
    return errorResponse(500, 'Failed to fetch files')
  }
}

// Public file download (no authentication required)
async function downloadFilePublic(event, user) {
  console.log('🔍 [SUPABASE_FILES] downloadFilePublic called', {
    fileId: event.path.split('/')[3]
  })

  try {
    const fileId = parseInt(event.path.split('/')[3])

    // Get file info
    const fileInfo = await query(
      'SELECT * FROM shared_files WHERE id = $1 AND is_active = true',
      [fileId]
    )

    if (fileInfo.rows.length === 0) {
      return errorResponse(404, 'File not found')
    }

    const file = fileInfo.rows[0]

    // Check if file is stored in Supabase or Cloudinary
    let downloadUrl
    if (file.supabase_path) {
      // Supabase file - generate signed URL
      const { data, error } = await supabase.storage
        .from(file.supabase_bucket || 'files')
        .createSignedUrl(file.supabase_path, 3600)
      
      if (error) {
        console.error('❌ [SUPABASE_FILES] Failed to create public signed URL:', error)
        return errorResponse(500, 'Failed to generate download URL')
      }
      
      downloadUrl = data.signedUrl
    } else if (file.cloudinary_url) {
      // Cloudinary file - use existing URL
      downloadUrl = file.cloudinary_url
    } else {
      return errorResponse(404, 'File storage not found')
    }

    // Log public download access
    await query(
      'INSERT INTO file_access_logs (file_id, accessed_by, action) VALUES ($1, $2, $3)',
      [fileId, null, 'public_download']
    )

    // Increment download count
    await query(
      'UPDATE shared_files SET download_count = download_count + 1 WHERE id = $1',
      [fileId]
    )

    console.log('✅ [SUPABASE_FILES] Public file download initiated', {
      fileId: file.id,
      displayName: file.display_name,
      storageType: file.supabase_path ? 'supabase' : 'cloudinary'
    })

    return successResponse({ 
      downloadUrl: downloadUrl,
      fileName: file.display_name,
      fileSize: file.file_size,
      storageType: file.supabase_path ? 'supabase' : 'cloudinary'
    })
  } catch (error) {
    console.error('❌ [SUPABASE_FILES] Public download file error:', error)
    return errorResponse(500, 'Failed to download file')
  }
}

exports.handler = handler
