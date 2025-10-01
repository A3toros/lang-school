# Supabase File System Issues Analysis

## Current Problems Identified

### 1. Download Issue: Files Download as 1KB Instead of Full Size
**Problem**: When downloading files, users get 1KB files instead of the actual file content.

**Root Cause Analysis**:
- The download endpoint is returning a signed URL, but the frontend is trying to fetch the file content directly
- The signed URL might be expiring or not being handled correctly
- The blob download logic might not be working properly with Supabase signed URLs

**Current Download Flow**:
1. Frontend calls `/api/supabase-files/{id}/download/public`
2. Backend generates signed URL and returns it
3. Frontend tries to fetch the signed URL and create a blob
4. **ISSUE**: The fetch might be failing or returning HTML error page instead of file content

### 2. PDF Viewer Not Working
**Problem**: PDF files don't display in the viewer, showing "No PDF file specified" or worker errors.

**Root Cause Analysis**:
- PDF.js worker configuration issues
- File URL not being passed correctly to PDFViewer
- Signed URL might not be accessible for PDF.js

**Current View Flow**:
1. User clicks on PDF file
2. Frontend calls `/api/supabase-files/{id}/view` to get signed URL
3. PDFViewer receives the file with URL
4. **ISSUE**: PDFViewer can't load the PDF from the signed URL

## Code Analysis

### Download Implementation Issues

**In `FolderTree.jsx` (lines 264-290)**:
```javascript
const handleFileDownload = async (e) => {
  // ... 
  const downloadUrl = selectedFile.supabase_path 
    ? `/api/supabase-files/${selectedFile.id}/download/public`
    : `/api/files/${selectedFile.id}/download/public`
  
  // Fetch the file and trigger proper download
  const response = await fetch(downloadUrl)
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  
  // Get the file blob
  const blob = await response.blob()
  // ... blob download logic
}
```

**Issues**:
1. **Wrong approach**: Fetching the API endpoint instead of the signed URL
2. **API endpoint returns JSON**: The endpoint returns `{downloadUrl: "signed_url"}`, not the file content
3. **Should fetch the signed URL**: Need to get the signed URL first, then fetch that URL

### PDF Viewer Implementation Issues

**In `FileSharing.jsx` (lines 104-115)**:
```javascript
const handleFileSelect = async (file) => {
  // For Supabase files, get a signed URL for viewing
  if (file.supabase_path) {
    const response = await apiService.getFileViewUrl(file.id)
    if (response.success) {
      const fileWithUrl = {
        ...file,
        url: response.viewUrl,
        display_name: response.fileName,
        original_name: response.fileName
      }
      setSelectedFile(fileWithUrl)
    }
  }
}
```

**Issues**:
1. **URL might be invalid**: The signed URL might not be accessible
2. **CORS issues**: Supabase signed URLs might have CORS restrictions
3. **PDF.js worker**: Still having worker configuration issues

## Proposed Solutions

### Solution 1: Fix Download Implementation

**Current (Broken) Flow**:
```
Frontend → /api/supabase-files/{id}/download → Fetch API response → Create blob
```

**Fixed Flow**:
```
Frontend → /api/supabase-files/{id}/download → Get signed URL → Fetch signed URL → Create blob
```

**Implementation**:
```javascript
const handleFileDownload = async (e) => {
  try {
    // First, get the signed URL
    const response = await apiService.downloadFile(selectedFile.id)
    if (!response.success) {
      throw new Error(response.error)
    }
    
    // Then fetch the actual file content from the signed URL
    const fileResponse = await fetch(response.downloadUrl)
    if (!fileResponse.ok) {
      throw new Error(`Download failed: ${fileResponse.status}`)
    }
    
    // Create blob and trigger download
    const blob = await fileResponse.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = response.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('Download failed:', error)
    alert('Download failed: ' + error.message)
  }
}
```

### Solution 2: Fix PDF Viewer

**Option A: Use Direct Signed URL**
```javascript
// In FileSharing.jsx
const handleFileSelect = async (file) => {
  if (file.supabase_path) {
    const response = await apiService.getFileViewUrl(file.id)
    if (response.success) {
      // Pass the signed URL directly to PDFViewer
      setSelectedFile({
        ...file,
        url: response.viewUrl
      })
    }
  }
}
```

**Option B: Use Proxy Endpoint**
Create a proxy endpoint that streams the file content:
```javascript
// In functions/supabase-files.js
async function streamFile(event, user) {
  const fileId = parseInt(event.path.split('/')[3])
  const file = await query('SELECT * FROM shared_files WHERE id = $1', [fileId])
  
  if (file.supabase_path) {
    const { data, error } = await supabase.storage
      .from(file.supabase_bucket)
      .download(file.supabase_path)
    
    if (error) throw error
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': file.content_type,
        'Content-Disposition': `attachment; filename="${file.display_name}"`
      },
      body: data
    }
  }
}
```

### Solution 3: Fix PDF.js Worker

**Option A: Use CDN (Current)**
```javascript
options={{
  workerSrc: 'https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.js'
}}
```

**Option B: Use Local Worker with Vite Config**
```javascript
// vite.config.js
export default {
  optimizeDeps: {
    include: ['pdfjs-dist/build/pdf.worker.min.js']
  }
}
```

**Option C: Use react-pdf's built-in worker**
```javascript
// Remove options prop entirely and let react-pdf handle it
<Document
  file={file.url}
  onLoadSuccess={onDocumentLoadSuccess}
  onLoadError={onDocumentLoadError}
  loading={<div className="text-center p-8">Loading PDF...</div>}
>
```

## Implementation Priority

1. **HIGH**: Fix download implementation (Solution 1)
2. **HIGH**: Fix PDF viewer URL handling (Solution 2A)
3. **MEDIUM**: Fix PDF.js worker (Solution 3C)
4. **LOW**: Add error handling and fallbacks

## Testing Strategy

1. **Download Test**: Upload a file, try to download it, verify file size matches
2. **PDF View Test**: Upload a PDF, try to view it, verify it displays correctly
3. **Error Handling**: Test with invalid files, network errors, etc.

## Files to Modify

1. `src/components/admin/FolderTree.jsx` - Fix download logic
2. `src/components/admin/FileSharing.jsx` - Fix PDF viewer URL handling
3. `src/components/teacher/FileLibrary.jsx` - Fix download logic
4. `src/components/common/PDFViewer.jsx` - Fix worker configuration
5. `functions/supabase-files.js` - Add error handling and logging

## Next Steps

1. Implement Solution 1 (Fix downloads)
2. Implement Solution 2A (Fix PDF viewer)
3. Test both functionalities
4. Add proper error handling
5. Update all components to use consistent patterns
