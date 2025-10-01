require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, corsHeaders, getPool } = require('./utils/database.js')

const handler = async (event, context) => {
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
    // Check if this is a public endpoint that doesn't require authentication
    let user = null
    let isPublicEndpoint = false

    if (path === '/api/files/public' && method === 'GET') {
      // Public file access for teachers
      isPublicEndpoint = true
    } else if (path.match(/^\/api\/files\/\d+\/download\/public$/) && method === 'GET') {
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
    if (path === '/api/files/folders' && method === 'GET') {
      return await getFolders(event, user)
    } else if (path === '/api/files/folders' && method === 'POST') {
      return await createFolder(event, user)
    } else if (path.match(/^\/api\/files\/folders\/\d+$/) && method === 'PUT') {
      return await updateFolder(event, user)
    } else if (path.match(/^\/api\/files\/folders\/\d+$/) && method === 'DELETE') {
      return await deleteFolder(event, user)
    } else if (path === '/api/files/upload' && method === 'POST') {
      return await uploadFile(event, user)
    } else if (path.match(/^\/api\/files\/\d+$/) && method === 'PUT') {
      return await updateFile(event, user)
    } else if (path.match(/^\/api\/files\/\d+$/) && method === 'DELETE') {
      return await deleteFile(event, user)
    } else if (path === '/api/files' && method === 'GET') {
      return await getFiles(event, user)
    } else if (path.match(/^\/api\/files\/\d+\/download$/) && method === 'GET') {
      return await downloadFile(event, user)
    } else if (path.match(/^\/api\/files\/\d+\/download\/public$/) && method === 'GET') {
      return await downloadFilePublic(event, user)
    } else if (path === '/api/files/public' && method === 'GET') {
      return await getPublicFiles(event, user)
    } else {
      return errorResponse(404, 'Not found')
    }
  } catch (error) {
    console.error('Files API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// Get all folders
async function getFolders(event, user) {
  console.log('🔍 [FILES] getFolders called', {
    userId: user.userId,
    role: user.role
  })

  try {
    const queryText = `
      SELECT f.*, u.username as created_by_name
      FROM file_folders f
      LEFT JOIN users u ON f.created_by = u.id
      WHERE f.is_active = true
      ORDER BY f.display_order, f.name
    `
    
    const result = await query(queryText)
    
    console.log('✅ [FILES] Folders fetched successfully', {
      count: result.rows.length
    })

    return successResponse({ folders: result.rows })
  } catch (error) {
    console.error('❌ [FILES] Get folders error:', error)
    return errorResponse(500, 'Failed to fetch folders')
  }
}

// Create new folder
async function createFolder(event, user) {
  console.log('🔍 [FILES] createFolder called', {
    userId: user.userId,
    role: user.role,
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [FILES] Create folder forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const { name, description, display_order } = JSON.parse(event.body)

    if (!name || name.trim() === '') {
      return errorResponse(400, 'Folder name is required')
    }

    // Check if folder name already exists
    const existingFolder = await query(
      'SELECT id FROM file_folders WHERE name = $1 AND is_active = true',
      [name.trim()]
    )

    if (existingFolder.rows.length > 0) {
      return errorResponse(400, 'Folder with this name already exists')
    }

    const queryText = `
      INSERT INTO file_folders (name, description, created_by, display_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `
    
    const result = await query(queryText, [
      name.trim(),
      description || '',
      user.userId,
      display_order || 0
    ])

    console.log('✅ [FILES] Folder created successfully', {
      folderId: result.rows[0].id,
      name: result.rows[0].name
    })

    return successResponse({ folder: result.rows[0] })
  } catch (error) {
    console.error('❌ [FILES] Create folder error:', error)
    return errorResponse(500, 'Failed to create folder')
  }
}

// Update folder
async function updateFolder(event, user) {
  console.log('🔍 [FILES] updateFolder called', {
    userId: user.userId,
    role: user.role,
    folderId: event.path.split('/')[3],
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [FILES] Update folder forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const folderId = parseInt(event.path.split('/')[3])
    const { name, description, display_order } = JSON.parse(event.body)

    if (!name || name.trim() === '') {
      return errorResponse(400, 'Folder name is required')
    }

    // Check if folder exists
    const folderCheck = await query(
      'SELECT id FROM file_folders WHERE id = $1 AND is_active = true',
      [folderIdInt]
    )

    if (folderCheck.rows.length === 0) {
      return errorResponse(404, 'Folder not found')
    }

    // Check if new name conflicts with existing folder
    const nameConflict = await query(
      'SELECT id FROM file_folders WHERE name = $1 AND id != $2 AND is_active = true',
      [name.trim(), folderId]
    )

    if (nameConflict.rows.length > 0) {
      return errorResponse(400, 'Folder with this name already exists')
    }

    const queryText = `
      UPDATE file_folders 
      SET name = $1, description = $2, display_order = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `
    
    const result = await query(queryText, [
      name.trim(),
      description || '',
      display_order || 0,
      folderId
    ])

    console.log('✅ [FILES] Folder updated successfully', {
      folderId: result.rows[0].id,
      name: result.rows[0].name
    })

    return successResponse({ folder: result.rows[0] })
  } catch (error) {
    console.error('❌ [FILES] Update folder error:', error)
    return errorResponse(500, 'Failed to update folder')
  }
}

// Delete folder
async function deleteFolder(event, user) {
  const pathParts = event.path.split('/')
  const folderId = pathParts[pathParts.length - 1] // Get the last part of the path
  console.log('🔍 [FILES] deleteFolder called', {
    userId: user.userId,
    role: user.role,
    folderId: folderId,
    pathParts: pathParts
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [FILES] Delete folder forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const folderIdInt = parseInt(folderId)

    // Check if folder exists
    const folderCheck = await query(
      'SELECT id FROM file_folders WHERE id = $1 AND is_active = true',
      [folderIdInt]
    )

    if (folderCheck.rows.length === 0) {
      return errorResponse(404, 'Folder not found')
    }

    // Get all files in the folder to delete from Cloudinary
    const filesInFolder = await query(
      'SELECT id, cloudinary_public_id, display_name FROM shared_files WHERE folder_id = $1 AND is_active = true',
      [folderIdInt]
    )

    // Start transaction
    await query('BEGIN')

    try {
      // Soft delete all files in the folder
      if (filesInFolder.rows.length > 0) {
        await query(
          'UPDATE shared_files SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE folder_id = $1',
          [folderIdInt]
        )
      }

      // Soft delete folder
      const queryText = `
        UPDATE file_folders 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `
      
      const result = await query(queryText, [folderId])

      // Commit transaction
      await query('COMMIT')

      console.log('✅ [FILES] Folder deleted successfully', {
        folderId: result.rows[0].id,
        name: result.rows[0].name,
        filesDeleted: filesInFolder.rows.length
      })

      // Note: Cloudinary files will be cleaned up by a separate process
      // or we could add Cloudinary deletion here if needed
      return successResponse({ 
        message: 'Folder and all files deleted successfully',
        filesDeleted: filesInFolder.rows.length
      })

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('❌ [FILES] Delete folder error:', error)
    return errorResponse(500, 'Failed to delete folder')
  }
}

// Upload file
async function uploadFile(event, user) {
  console.log('🔍 [FILES] uploadFile called', {
    userId: user.userId,
    role: user.role
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [FILES] Upload file forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    // Parse JSON data (file already uploaded to Cloudinary)
    const contentType = event.headers['content-type'] || event.headers['Content-Type']
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse(400, 'Content-Type must be application/json')
    }

    // Parse the file metadata from JSON body
    const fileData = JSON.parse(event.body)
    console.log('🔍 [FILES] Received file data:', fileData)
    
    const { folder_id, original_name, display_name, file_type, file_size, cloudinary_public_id, cloudinary_url } = fileData

    if (!original_name || !display_name || !file_type || !cloudinary_public_id || !cloudinary_url) {
      console.log('❌ [FILES] Missing required fields:', {
        folder_id: !!folder_id,
        original_name: !!original_name,
        display_name: !!display_name,
        file_type: !!file_type,
        cloudinary_public_id: !!cloudinary_public_id,
        cloudinary_url: !!cloudinary_url
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
        console.log('❌ [FILES] Folder not found or inactive', { folder_id })
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
      INSERT INTO shared_files (folder_id, original_name, display_name, file_type, file_size, cloudinary_public_id, cloudinary_url, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `
    
    const result = await query(queryText, [
      folder_id,
      original_name,
      display_name,
      file_type,
      file_size,
      cloudinary_public_id,
      cloudinary_url,
      user.userId
    ])

    console.log('✅ [FILES] File uploaded successfully', {
      fileId: result.rows[0].id,
      displayName: result.rows[0].display_name,
      folderId: result.rows[0].folder_id
    })

    return successResponse({ file: result.rows[0] })
  } catch (error) {
    console.error('❌ [FILES] Upload file error:', error)
    return errorResponse(500, 'Failed to upload file')
  }
}

// Update file
async function updateFile(event, user) {
  console.log('🔍 [FILES] updateFile called', {
    userId: user.userId,
    role: user.role,
    fileId: event.path.split('/')[3],
    body: JSON.parse(event.body)
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [FILES] Update file forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const fileId = parseInt(event.path.split('/')[3])
    const { display_name, folder_id } = JSON.parse(event.body)

    if (!display_name || display_name.trim() === '') {
      return errorResponse(400, 'File display name is required')
    }

    // Check if file exists
    const fileCheck = await query(
      'SELECT id, folder_id FROM shared_files WHERE id = $1 AND is_active = true',
      [fileId]
    )

    if (fileCheck.rows.length === 0) {
      return errorResponse(404, 'File not found')
    }

    // If moving to different folder, check if folder exists
    if (folder_id && folder_id !== fileCheck.rows[0].folder_id) {
      const folderCheck = await query(
        'SELECT id FROM file_folders WHERE id = $1 AND is_active = true',
        [folder_id]
      )

      if (folderCheck.rows.length === 0) {
        return errorResponse(404, 'Target folder not found')
      }

      // Check if file with same name exists in target folder
      const nameConflict = await query(
        'SELECT id FROM shared_files WHERE folder_id = $1 AND display_name = $2 AND id != $3 AND is_active = true',
        [folder_id, display_name.trim(), fileId]
      )

      if (nameConflict.rows.length > 0) {
        return errorResponse(400, 'File with this name already exists in target folder')
      }
    }

    const queryText = `
      UPDATE shared_files 
      SET display_name = $1, folder_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `
    
    const result = await query(queryText, [
      display_name.trim(),
      folder_id || fileCheck.rows[0].folder_id,
      fileId
    ])

    console.log('✅ [FILES] File updated successfully', {
      fileId: result.rows[0].id,
      displayName: result.rows[0].display_name
    })

    return successResponse({ file: result.rows[0] })
  } catch (error) {
    console.error('❌ [FILES] Update file error:', error)
    return errorResponse(500, 'Failed to update file')
  }
}

// Delete file
async function deleteFile(event, user) {
  console.log('🔍 [FILES] deleteFile called', {
    userId: user.userId,
    role: user.role,
    fileId: event.path.split('/')[3]
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [FILES] Delete file forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

    const fileId = parseInt(event.path.split('/')[3])

    // Get file info for storage deletion
    const fileInfo = await query(
      'SELECT cloudinary_public_id, supabase_path, supabase_bucket, display_name FROM shared_files WHERE id = $1 AND is_active = true',
      [fileId]
    )

    if (fileInfo.rows.length === 0) {
      return errorResponse(404, 'File not found')
    }

    const file = fileInfo.rows[0]

    // Route to appropriate delete handler based on storage type
    if (file.supabase_path) {
      // Supabase file - redirect to supabase-files endpoint
      console.log('🔄 [FILES] Redirecting Supabase file deletion to supabase-files endpoint')
      
      // Import the supabase-files handler
      const { handler: supabaseHandler } = require('./supabase-files.js')
      
      // Create a new event object for the supabase-files handler
      const supabaseEvent = {
        ...event,
        path: `/api/supabase-files/${fileId}`,
        httpMethod: 'DELETE'
      }
      
      return await supabaseHandler(supabaseEvent, context)
    } else {
      // Cloudinary file - handle locally
      console.log('🔄 [FILES] Handling Cloudinary file deletion locally')
      
      // Soft delete file
      const queryText = `
        UPDATE shared_files 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `
      
      const result = await query(queryText, [fileId])

      console.log('✅ [FILES] Cloudinary file deleted successfully', {
        fileId: result.rows[0].id,
        displayName: result.rows[0].display_name,
        cloudinaryPublicId: result.rows[0].cloudinary_public_id
      })

      return successResponse({ 
        message: 'File deleted successfully',
        storageType: 'cloudinary',
        cloudinary_public_id: result.rows[0].cloudinary_public_id
      })
    }
  } catch (error) {
    console.error('❌ [FILES] Delete file error:', error)
    return errorResponse(500, 'Failed to delete file')
  }
}

// Get files (admin only)
async function getFiles(event, user) {
  console.log('🔍 [FILES] getFiles called', {
    userId: user.userId,
    role: user.role
  })

  try {
    if (user.role !== 'admin') {
      console.log('❌ [FILES] Get files forbidden - not admin', { role: user.role })
      return errorResponse(403, 'Forbidden')
    }

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
    
    console.log('✅ [FILES] Files fetched successfully', {
      count: result.rows.length,
      folderId: folder_id,
      search: search,
      fileType: file_type
    })

    return successResponse({ files: result.rows })
  } catch (error) {
    console.error('❌ [FILES] Get files error:', error)
    return errorResponse(500, 'Failed to fetch files')
  }
}

// Get public files (for teachers)
async function getPublicFiles(event, user) {
  console.log('🔍 [FILES] getPublicFiles called', {
    userId: user?.userId || 'public',
    role: user?.role || 'public'
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
    
    console.log('✅ [FILES] Public files fetched successfully', {
      count: result.rows.length,
      folderId: folder_id,
      search: search,
      fileType: file_type
    })

    return successResponse({ files: result.rows })
  } catch (error) {
    console.error('❌ [FILES] Get public files error:', error)
    return errorResponse(500, 'Failed to fetch files')
  }
}

// Download file
async function downloadFile(event, user) {
  console.log('🔍 [FILES] downloadFile called', {
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

    console.log('✅ [FILES] File download initiated', {
      fileId: file.id,
      displayName: file.display_name,
      downloadedBy: user.userId
    })

    // Make the URL publicly accessible by adding transformation parameters
    let publicUrl = file.cloudinary_url
    
    // If it's a raw file, ensure it's publicly accessible
    if (file.cloudinary_url.includes('/raw/upload/')) {
      // Add transformation parameters to make it publicly accessible
      publicUrl = file.cloudinary_url.replace('/raw/upload/', '/raw/upload/f_auto,q_auto/')
    }

    // Fetch the file from Cloudinary and serve it directly
    try {
      const response = await fetch(publicUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file from Cloudinary: ${response.status}`)
      }
      
      const fileBuffer = await response.arrayBuffer()
      const base64Content = Buffer.from(fileBuffer).toString('base64')
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${file.display_name}"`,
          'Content-Length': fileBuffer.byteLength.toString()
        },
        body: base64Content,
        isBase64Encoded: true
      }
    } catch (fetchError) {
      console.error('❌ [FILES] Error fetching file from Cloudinary:', fetchError)
      return errorResponse(500, 'Failed to fetch file from storage')
    }
  } catch (error) {
    console.error('❌ [FILES] Download file error:', error)
    return errorResponse(500, 'Failed to download file')
  }
}

// Download file (public - no authentication required)
async function downloadFilePublic(event, user) {
  console.log('🔍 [FILES] downloadFilePublic called', {
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

    console.log('✅ [FILES] Public file download initiated', {
      fileId: file.id,
      displayName: file.display_name
    })

    // Make the URL publicly accessible by adding transformation parameters
    let publicUrl = file.cloudinary_url
    
    // For image uploads, add transformation parameters to make it publicly accessible
    if (file.cloudinary_url.includes('/image/upload/')) {
      publicUrl = file.cloudinary_url.replace('/image/upload/', '/image/upload/f_auto,q_auto/')
    }
    // For raw uploads, add transformation parameters to make it publicly accessible
    else if (file.cloudinary_url.includes('/raw/upload/')) {
      publicUrl = file.cloudinary_url.replace('/raw/upload/', '/raw/upload/f_auto,q_auto/')
    }

    // Fetch the file from Cloudinary and serve it directly
    try {
      const response = await fetch(publicUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`)
      }

      const fileBuffer = await response.arrayBuffer()
      const base64Content = Buffer.from(fileBuffer).toString('base64')

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': file.file_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${file.display_name}"`,
          'Content-Length': fileBuffer.byteLength.toString()
        },
        body: base64Content,
        isBase64Encoded: true
      }
    } catch (fetchError) {
      console.error('❌ [FILES] Failed to fetch file from Cloudinary:', fetchError)
      return errorResponse(500, 'Failed to fetch file from storage')
    }
  } catch (error) {
    console.error('❌ [FILES] Public download file error:', error)
    return errorResponse(500, 'Failed to download file')
  }
}

// Export the handler for Netlify Functions
module.exports = { handler }
