# File System Rewrite Plan: Migration from Cloudinary to Supabase

## Overview
This document outlines a complete rewrite of the file uploading, viewing, and downloading system, migrating from Cloudinary to Supabase Storage with enhanced file viewing capabilities using react-pdf and Google Docs Viewer.

## Current System Analysis

### Current Architecture
- **Storage**: Cloudinary for file storage
- **Database**: PostgreSQL with `shared_files` table
- **File Types**: PDF, DOCX, XLSX, images, audio files
- **Viewing**: Basic iframe embedding with Google Docs Viewer fallback
- **Upload**: Multipart form data via Cloudinary API
- **Access Control**: Role-based (admin/teacher) with public download endpoints

### Current File Flow
1. File uploaded via `functions/cloudinary.js` → Cloudinary
2. Metadata saved to `shared_files` table
3. Files accessed via Cloudinary URLs
4. Viewing through `FileViewer.jsx` and `EnhancedFileViewer.jsx`
5. Download via direct Cloudinary URLs

## New Supabase Architecture

### 1. Environment Setup
```bash
npm install @supabase/supabase-js react-pdf
```

### 2. Environment Variables
```env
# PostgreSQL connection string for direct database access
SUPABASE_URL=postgresql://postgres.carqvkbmbnqofizbbkjt:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres

# Supabase project URL and keys (get from Supabase dashboard)
SUPABASE_PROJECT_URL=https://carqvkbmbnqofizbbkjt.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Schema Updates

#### Use Existing Tables
We'll use the existing `shared_files` table structure and add Supabase columns alongside Cloudinary:

```sql
-- Add Supabase-specific columns to existing shared_files table
ALTER TABLE shared_files 
ADD COLUMN supabase_path TEXT,
ADD COLUMN supabase_bucket TEXT DEFAULT 'files',
ADD COLUMN content_type TEXT;

-- Keep existing Cloudinary columns for migration period
-- cloudinary_public_id, cloudinary_url will remain for backward compatibility
```

#### Existing shared_files Table Structure (from db-schema.sql)
```sql
CREATE TABLE shared_files (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER REFERENCES file_folders(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'pdf', 'doc', 'docx', 'txt', etc.
    file_size BIGINT NOT NULL, -- in bytes
    cloudinary_public_id VARCHAR(255) NOT NULL,
    cloudinary_url VARCHAR(500) NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### ALTER Existing shared_files Table (add Supabase columns)
```sql
-- Add Supabase columns to existing shared_files table
ALTER TABLE shared_files 
ADD COLUMN supabase_path TEXT,
ADD COLUMN supabase_bucket TEXT DEFAULT 'files',
ADD COLUMN content_type TEXT;

-- Make cloudinary columns nullable for hybrid storage support
ALTER TABLE shared_files 
ALTER COLUMN cloudinary_public_id DROP NOT NULL,
ALTER COLUMN cloudinary_url DROP NOT NULL;
```


### 4. Supabase Storage Buckets with Folder Support
```javascript
// Bucket configuration with folder structure support
const buckets = {
  'files': {
    public: false, // Private bucket for secure access
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg'
    ]
  }
}

// Folder path generation for Supabase Storage
const generateFolderPath = (folderId, fileName) => {
  if (folderId) {
    return `folders/folder-${folderId}/${fileName}`
  }
  return `root/${fileName}`
}
```

## Implementation Plan

### Phase 1: Supabase Integration Setup

#### 1.1 Supabase Client Configuration
```javascript
// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js'

// Use the project URL and keys from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For direct PostgreSQL operations, use the connection string
export const postgresConnection = import.meta.env.VITE_SUPABASE_URL

// Service role client for server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl, 
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

#### 1.2 File Upload Service with Folder Support
```javascript
// src/services/supabaseFileService.js
class SupabaseFileService {
  async uploadFile(file, folderId = null, options = {}) {
    const filePath = this.generateFilePath(file, folderId)
    
    const { data, error } = await supabase.storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    return {
      path: data.path,
      bucket: 'files',
      size: file.size,
      contentType: file.type
    }
  }
  
  generateFilePath(file, folderId) {
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    
    if (folderId) {
      return `folders/folder-${folderId}/${fileName}`
    }
    return `root/${fileName}`
  }
  
  async getSignedUrl(filePath, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('files')
      .createSignedUrl(filePath, expiresIn)
    
    if (error) throw error
    return data.signedUrl
  }
  
  async deleteFile(filePath) {
    const { error } = await supabase.storage
      .from('files')
      .remove([filePath])
    
    if (error) throw error
  }
}
```

### Phase 2: Enhanced File Viewers

#### 2.1 PDF Viewer Component
```javascript
// src/components/common/PDFViewer.jsx
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Set up PDF.js worker
pdfjs.GlobalWorker.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

function PDFViewer({ file, onClose }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
  }

  const onDocumentLoadError = (error) => {
    setError('Failed to load PDF')
    setLoading(false)
  }

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-controls">
        <button onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}>
          Previous
        </button>
        <span>{pageNumber} of {numPages}</span>
        <button onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}>
          Next
        </button>
        <button onClick={() => setScale(prev => Math.min(2.0, prev + 0.1))}>
          Zoom In
        </button>
        <button onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}>
          Zoom Out
        </button>
      </div>
      
      <div className="pdf-content">
        <Document
          file={file.url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div>Loading PDF...</div>}
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  )
}
```

#### 2.2 Word Document Viewer
```javascript
// src/components/common/WordViewer.jsx
function WordViewer({ file, onClose }) {
  const [googleDocsFailed, setGoogleDocsFailed] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=true`

  return (
    <div className="word-viewer-container">
      {!googleDocsFailed && !showFallback ? (
        <iframe
          src={googleDocsUrl}
          width="100%"
          height="600px"
          style={{ border: 'none' }}
          onError={() => setGoogleDocsFailed(true)}
          onLoad={() => {
            // Set timeout for fallback
            setTimeout(() => {
              if (!googleDocsFailed) setShowFallback(true)
            }, 10000)
          }}
        />
      ) : (
        <div className="fallback-viewer">
          <p>Document preview not available. Please download to view.</p>
          <button onClick={() => window.open(file.url, '_blank')}>
            Download Document
          </button>
        </div>
      )}
    </div>
  )
}
```

#### 2.3 Universal File Viewer
```javascript
// src/components/common/UniversalFileViewer.jsx
import PDFViewer from './PDFViewer'
import WordViewer from './WordViewer'
import ImageViewer from './ImageViewer'
import AudioViewer from './AudioViewer'

function UniversalFileViewer({ file, isOpen, onClose }) {
  const getFileType = (filename) => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const renderViewer = () => {
    const fileType = getFileType(file.original_name || file.display_name)
    
    switch (fileType) {
      case 'pdf':
        return <PDFViewer file={file} onClose={onClose} />
      case 'docx':
      case 'doc':
        return <WordViewer file={file} onClose={onClose} />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <ImageViewer file={file} onClose={onClose} />
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <AudioViewer file={file} onClose={onClose} />
      default:
        return (
          <div className="unsupported-file">
            <p>File type not supported for preview</p>
            <button onClick={() => window.open(file.url, '_blank')}>
              Download File
            </button>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="file-viewer-modal">
      <div className="file-viewer-content">
        <div className="file-viewer-header">
          <h3>{file.display_name}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="file-viewer-body">
          {renderViewer()}
        </div>
      </div>
    </div>
  )
}
```

### Phase 3: Backend API Updates

#### 3.1 Updated File Upload Endpoint
```javascript
// functions/supabase-files.js
async function uploadFile(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const { file, folder_id, display_name } = JSON.parse(event.body)
    
    // Upload to Supabase Storage
    const supabaseService = new SupabaseFileService()
    const uploadResult = await supabaseService.uploadFile(file, folder_id)
    
    // Save metadata to existing shared_files table
    const queryText = `
      INSERT INTO shared_files (
        folder_id, original_name, display_name, file_type, 
        file_size, supabase_path, supabase_bucket, content_type, uploaded_by,
        cloudinary_public_id, cloudinary_url, is_active, download_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `
    
    const result = await query(queryText, [
      folder_id,
      file.name,
      display_name || file.name,
      file.type,
      file.size,
      uploadResult.path,
      uploadResult.bucket,
      uploadResult.contentType,
      user.userId,
      null, // cloudinary_public_id (null for Supabase files)
      null, // cloudinary_url (null for Supabase files)
      true, // is_active
      0     // download_count
    ])
    
    return successResponse({ file: result.rows[0] })
  } catch (error) {
    console.error('Upload error:', error)
    return errorResponse(500, 'Upload failed')
  }
}
```

#### 3.2 Secure Download Endpoint
```javascript
async function downloadFile(event, user) {
  try {
    const fileId = parseInt(event.path.split('/')[3])
    
    // Get file info from existing shared_files table
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
      const supabaseService = new SupabaseFileService()
      downloadUrl = await supabaseService.getSignedUrl(file.supabase_path, 3600)
    } else if (file.cloudinary_url) {
      // Cloudinary file - use existing URL
      downloadUrl = file.cloudinary_url
    } else {
      return errorResponse(404, 'File storage not found')
    }
    
    // Log download access using existing file_access_logs table
    await query(
      'INSERT INTO file_access_logs (file_id, accessed_by, action) VALUES ($1, $2, $3)',
      [fileId, user.userId, 'download']
    )
    
    return successResponse({ 
      downloadUrl: downloadUrl,
      fileName: file.display_name,
      fileSize: file.file_size
    })
  } catch (error) {
    console.error('Download error:', error)
    return errorResponse(500, 'Download failed')
  }
}
```

### Phase 4: Frontend Integration

#### 4.1 Reuse Existing Modal Components
```javascript
// Available modals for reuse:
// - Modal.jsx (generic modal with size variants)
// - LoadingSpinnerModal.jsx (with loading states)
// - FileContextMenu.jsx (file operations)
// - FileViewer.jsx (file preview)
// - BulkOperations.jsx (bulk file operations)

// Enhanced File Upload Modal
<Modal 
  isOpen={showUploadModal} 
  title="Upload Files to Supabase" 
  size="lg"
>
  <FileUploadProgress 
    files={selectedFiles}
    onComplete={handleUploadComplete}
    storageType="supabase"
  />
</Modal>

// File Move Modal (reuse existing)
<FileContextMenu 
  file={selectedFile}
  folders={folders}
  onFileMove={handleFileMove}
  onFileDelete={handleFileDelete}
  storageType="supabase" // New prop for storage type
/>

// Enhanced File Viewer
<FileViewer 
  file={selectedFile}
  isOpen={showViewer}
  onClose={() => setShowViewer(false)}
  storageType="supabase"
  signedUrl={file.signedUrl}
/>

// Bulk File Operations
<BulkOperations 
  selectedItems={selectedFiles}
  type="files"
  operations={[
    { id: 'move', label: 'Move to Folder' },
    { id: 'delete', label: 'Delete Files' },
    { id: 'download', label: 'Download Selected' }
  ]}
/>
```

#### 4.2 Updated File Upload Component
```javascript
// src/components/admin/SupabaseFileUpload.jsx
function SupabaseFileUpload({ onFileUpload, currentFolderId }) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const handleFileUpload = async (files) => {
    setUploading(true)
    
    for (const file of files) {
      try {
        // Upload to Supabase
        const supabaseService = new SupabaseFileService()
        const uploadResult = await supabaseService.uploadFile(file, currentFolderId)
        
        // Save metadata to database
        const fileData = {
          display_name: file.name,
          original_name: file.name,
          file_type: file.type,
          file_size: file.size,
          supabase_path: uploadResult.path,
          supabase_bucket: uploadResult.bucket,
          content_type: uploadResult.contentType,
          folder_id: currentFolderId
        }
        
        const response = await apiService.uploadFile(fileData)
        if (response.success) {
          onFileUpload(response.file)
        }
      } catch (error) {
        console.error('Upload failed:', error)
        alert(`Failed to upload ${file.name}: ${error.message}`)
      }
    }
    
    setUploading(false)
  }
  
  return (
    <div className="file-upload-container">
      <input
        type="file"
        multiple
        onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        disabled={uploading}
      />
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}
    </div>
  )
}
```

#### 4.2 Updated File Library Component
```javascript
// src/components/teacher/SupabaseFileLibrary.jsx
function SupabaseFileLibrary() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  
  useEffect(() => {
    loadFiles()
  }, [])
  
  const loadFiles = async () => {
    try {
      const response = await apiService.getPublicFiles()
      if (response.success) {
        setFiles(response.files)
      }
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleFileClick = async (file) => {
    try {
      // Get signed URL for viewing
      const response = await apiService.getFileViewUrl(file.id)
      if (response.success) {
        setSelectedFile({ ...file, url: response.viewUrl })
      }
    } catch (error) {
      console.error('Failed to get file URL:', error)
    }
  }
  
  const handleDownload = async (file) => {
    try {
      const response = await apiService.downloadFile(file.id)
      if (response.success) {
        // Create temporary download link
        const link = document.createElement('a')
        link.href = response.downloadUrl
        link.download = file.display_name
        link.click()
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }
  
  return (
    <div className="file-library">
      <h2>File Library</h2>
      
      {loading ? (
        <div>Loading files...</div>
      ) : (
        <div className="files-grid">
          {files.map(file => (
            <div key={file.id} className="file-item">
              <div onClick={() => handleFileClick(file)}>
                <span className="file-icon">{getFileIcon(file.file_type)}</span>
                <span className="file-name">{file.display_name}</span>
              </div>
              <button onClick={() => handleDownload(file)}>
                Download
              </button>
            </div>
          ))}
        </div>
      )}
      
      {selectedFile && (
        <UniversalFileViewer
          file={selectedFile}
          isOpen={true}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  )
}
```

### Phase 5: Migration Strategy

#### 5.1 Data Migration Script
```javascript
// scripts/migrate-to-supabase.js
async function migrateFiles() {
  // 1. Get all existing files from database
  const files = await query('SELECT * FROM shared_files WHERE is_active = true')
  
  for (const file of files.rows) {
    try {
      // 2. Download file from Cloudinary
      const cloudinaryResponse = await fetch(file.cloudinary_url)
      const fileBlob = await cloudinaryResponse.blob()
      
      // 3. Upload to Supabase
      const supabaseService = new SupabaseFileService()
      const uploadResult = await supabaseService.uploadFile(fileBlob, file.folder_id)
      
      // 4. Update database record
      await query(
        'UPDATE shared_files SET supabase_path = $1, supabase_bucket = $2 WHERE id = $3',
        [uploadResult.path, uploadResult.bucket, file.id]
      )
      
      console.log(`Migrated file: ${file.display_name}`)
    } catch (error) {
      console.error(`Failed to migrate file ${file.display_name}:`, error)
    }
  }
}
```

#### 5.2 Gradual Migration Approach
1. **Phase 1**: Deploy new Supabase system alongside existing Cloudinary
2. **Phase 2**: Migrate new uploads to Supabase
3. **Phase 3**: Migrate existing files in batches
4. **Phase 4**: Update all components to use Supabase
5. **Phase 5**: Remove Cloudinary dependencies

### Phase 6: Security & Performance

#### 6.1 Row Level Security (RLS)
```sql
-- Enable RLS on supabase_files table
ALTER TABLE supabase_files ENABLE ROW LEVEL SECURITY;

-- Policy for file access
CREATE POLICY "Users can access files they have permission for" ON supabase_files
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM shared_files sf
    WHERE sf.id = supabase_files.file_id
    AND (
      sf.uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'teacher')
      )
    )
  )
);
```

#### 6.2 File Access Control
```javascript
// src/utils/fileAccess.js
export const canAccessFile = (file, user) => {
  // Admin can access all files
  if (user.role === 'admin') return true
  
  // Teachers can access public files
  if (user.role === 'teacher' && file.is_public) return true
  
  // Users can access files they uploaded
  if (file.uploaded_by === user.userId) return true
  
  return false
}
```

#### 6.3 Performance Optimizations
- **CDN Integration**: Use Supabase CDN for faster file delivery
- **Image Optimization**: Automatic image resizing and format conversion
- **Caching**: Implement browser caching for frequently accessed files
- **Lazy Loading**: Load file previews on demand

## Testing Strategy

### Unit Tests
- File upload service tests
- File viewer component tests
- Access control tests

### Integration Tests
- End-to-end file upload flow
- File viewing across different types
- Download functionality
- Migration script validation

### Performance Tests
- Large file upload handling
- Concurrent user access
- CDN performance
- Database query optimization

## Deployment Checklist

### Pre-deployment
- [ ] Set up Supabase project and buckets
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Test file upload/download flows
- [ ] Verify security policies

### Deployment
- [ ] Deploy new backend functions
- [ ] Update frontend components
- [ ] Run migration scripts
- [ ] Monitor system performance
- [ ] Verify all file operations work

### Post-deployment
- [ ] Monitor error logs
- [ ] Check file access patterns
- [ ] Optimize performance based on usage
- [ ] Plan Cloudinary deprecation timeline

## Rollback Plan

### Emergency Rollback
1. Revert to Cloudinary URLs in database
2. Update frontend to use Cloudinary endpoints
3. Disable Supabase file operations
4. Monitor system stability

### Gradual Rollback
1. Stop new Supabase uploads
2. Migrate critical files back to Cloudinary
3. Update access patterns
4. Complete rollback over 24-48 hours

## Success Metrics

### Performance Metrics
- File upload speed improvement
- File download speed improvement
- Page load time reduction
- Error rate reduction

### User Experience Metrics
- File preview success rate
- User satisfaction scores
- Support ticket reduction
- Feature adoption rates

### Cost Metrics
- Storage cost comparison
- Bandwidth cost analysis
- Development time savings
- Maintenance cost reduction

## Conclusion

This comprehensive rewrite will modernize the file system with:
- **Better Performance**: Supabase CDN and optimized storage
- **Enhanced Security**: Row-level security and signed URLs
- **Improved UX**: Native PDF viewing and better file previews
- **Cost Efficiency**: Reduced storage and bandwidth costs
- **Future-Proof**: Scalable architecture for growth

The migration should be executed in phases to minimize risk and ensure smooth transition for users.
