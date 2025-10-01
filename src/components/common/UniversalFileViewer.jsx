import React from 'react'
import PDFViewer from './PDFViewer'
import WordViewer from './WordViewer'
import Modal from './Modal'

function UniversalFileViewer({ file, isOpen, onClose }) {
  const getFileType = (filename) => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  // Get the appropriate URL for the file (Supabase signed URL or Cloudinary URL)
  const getFileUrl = () => {
    // If file has a url property (from Supabase signed URL), use it
    if (file.url) {
      return file.url
    }
    // Otherwise, use cloudinary_url for legacy files
    if (file.cloudinary_url) {
      return file.cloudinary_url
    }
    // Fallback to empty string
    return ''
  }

  const renderViewer = () => {
    const fileType = getFileType(file.original_name || file.display_name)
    const fileUrl = getFileUrl()
    
    // Create a file object with the URL for the viewers
    const fileWithUrl = { ...file, url: fileUrl }
    
    switch (fileType) {
      case 'pdf':
        return <PDFViewer file={fileWithUrl} onClose={onClose} />
      case 'docx':
      case 'doc':
        return <WordViewer file={fileWithUrl} onClose={onClose} />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return (
          <div className="image-viewer text-center">
            <img 
              src={fileUrl} 
              alt={file.display_name}
              className="max-w-full max-h-96 mx-auto"
              style={{ maxHeight: '70vh' }}
            />
          </div>
        )
      case 'mp3':
      case 'wav':
      case 'ogg':
        return (
          <div className="audio-viewer text-center p-8">
            <audio controls className="w-full max-w-md mx-auto">
              <source src={fileUrl} type={`audio/${fileType}`} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )
      default:
        return (
          <div className="unsupported-file text-center p-8">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">File type not supported for preview</p>
            <button 
              onClick={async () => {
                try {
                  // Fetch the file and trigger proper download
                  const response = await fetch(fileUrl)
                  if (!response.ok) {
                    throw new Error(`Download failed: ${response.status}`)
                  }
                  
                  // Get the file blob
                  const blob = await response.blob()
                  
                  // Create a blob URL and trigger download
                  const blobUrl = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = blobUrl
                  link.download = file.display_name || file.original_name
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  
                  // Clean up the blob URL
                  URL.revokeObjectURL(blobUrl)
                } catch (error) {
                  console.error('Download failed:', error)
                  alert('Download failed: ' + error.message)
                }
              }}
              className="btn-primary"
            >
              Download File
            </button>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <Modal 
      isOpen={isOpen}
      onClose={onClose}
      title={file.display_name}
      size="xl"
    >
      {renderViewer()}
    </Modal>
  )
}

export default UniversalFileViewer
