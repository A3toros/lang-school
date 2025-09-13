import React, { useState, useEffect } from 'react'
import { getFileIcon, formatFileSize } from '../../utils/fileTypes'

const FileViewer = ({ file, isOpen, onClose, showAsInline = false }) => {
  console.log('🔍 [FILE_VIEWER] FileViewer called with:', { file, isOpen, onClose, showAsInline })
  
  const [googleDocsFailed, setGoogleDocsFailed] = useState(false)
  const [isOfficeDoc, setIsOfficeDoc] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  
  // Reset Google Docs failed state when file changes
  useEffect(() => {
    setGoogleDocsFailed(false)
    setShowFallback(false)
    
    // Check if this is an office document
    const isOffice = file.file_type === 'docx' ||
      file.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.file_type === 'xlsx' ||
      file.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.file_type === 'pptx' ||
      file.file_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    
    setIsOfficeDoc(isOffice)
    
    // Set timeout for office documents - shorter timeout since Google Docs often fails
    if (isOffice) {
      const timeout = setTimeout(() => {
        if (!googleDocsFailed && !showFallback) {
          console.log('⏰ [FILE_VIEWER] Google Docs viewer timeout, showing fallback')
          setShowFallback(true)
        }
      }, 5000) // Reduced to 5 seconds
      
      return () => clearTimeout(timeout)
    }
  }, [file?.id, googleDocsFailed, showFallback])
  
  if (!file || !isOpen) {
    console.log('🔍 [FILE_VIEWER] Returning null - file:', !!file, 'isOpen:', isOpen)
    return null
  }

  // Use the file URL directly - it should be public
  const url = file.cloudinary_url

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDownload = () => {
    // Use the public URL for direct download
    const link = document.createElement('a')
    link.href = url
    link.download = file.display_name || file.original_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderFileContent = () => {
    console.log('🔍 [FILE_VIEWER] renderFileContent called with url:', url, 'file_type:', file.file_type)
    
    if (!url) {
      console.log('🔍 [FILE_VIEWER] No URL available, showing download option')
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-6xl mb-4">{getFileIcon(file.file_type)}</div>
            <p className="text-gray-600 mb-4">File not available for preview</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Download File
            </button>
          </div>
        </div>
      )
    }

    // Images - use <img> tag
    if (file.file_type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.file_type)) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50">
          <img
            src={url}
            alt={file.display_name}
            style={{ maxWidth: "100%", maxHeight: "600px" }}
          />
        </div>
      )
    }

    // PDFs - use <iframe> tag
    if (file.file_type === 'pdf' || file.file_type === 'application/pdf') {
      return (
        <div className="h-full">
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={file.display_name}
          />
        </div>
      )
    }

    // Office documents - use Google Docs Viewer with <iframe> or fallback to download
    if (
      file.file_type === 'docx' ||
      file.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.file_type === 'xlsx' ||
      file.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.file_type === 'pptx' ||
      file.file_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      // If Google Docs failed or timeout reached, show download fallback
      if (googleDocsFailed || showFallback) {
        console.log('🔍 [FILE_VIEWER] Google Docs failed or timeout, showing download fallback')
        return (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">{getFileIcon(file.file_type)}</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{file.display_name}</h3>
              <p className="text-gray-600 mb-6">
                {googleDocsFailed ? 'Preview failed due to authentication issues.' : 'Preview is taking too long to load.'} 
                <br />Click download to open it in your default application.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                >
                  📥 Download File
                </button>
                <button
                  onClick={() => window.open(url, '_blank')}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  🔗 Open in New Tab
                </button>
                {!googleDocsFailed && (
                  <button
                    onClick={() => setShowFallback(false)}
                    className="w-full px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                  >
                    🔄 Try Preview Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }
      
      const encodedUrl = encodeURIComponent(url)
      const googleDocsUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`
      
      console.log('🔍 [FILE_VIEWER] Office document detected:', {
        fileType: file.file_type,
        originalUrl: url,
        encodedUrl: encodedUrl,
        googleDocsUrl: googleDocsUrl
      })
      
      return (
        <div className="h-full relative">
          <iframe
            src={googleDocsUrl}
            className="w-full h-full border-0"
            title={file.display_name}
            onLoad={() => {
              console.log('✅ [FILE_VIEWER] Google Docs viewer loaded successfully')
            }}
            onError={(e) => {
              console.log('❌ [FILE_VIEWER] Google Docs viewer failed:', e)
              setGoogleDocsFailed(true)
            }}
          />
          {/* Loading indicator */}
          <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            Loading preview...
          </div>
        </div>
      )
    }

    // Audio files
    if (file.file_type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(file.file_type)) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{getFileIcon(file.file_type)}</div>
              <h3 className="text-xl font-semibold text-gray-800">{file.display_name}</h3>
            </div>
            <audio controls className="w-full">
              <source src={url} type={`audio/${file.file_type}`} />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      )
    }

    // Other raw files - download link
    console.log('🔍 [FILE_VIEWER] Raw file type, showing download option for:', file.file_type)
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">{getFileIcon(file.file_type)}</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{file.display_name}</h3>
          <p className="text-gray-600 mb-6">
            This file type cannot be previewed directly. Click download to open it in your default application.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              📥 Download File
            </button>
            <button
              onClick={() => window.open(url, '_blank')}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              🔗 Open in New Tab
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showAsInline) {
    console.log('🔍 [FILE_VIEWER] Using inline display mode')
    // Inline display - no modal overlay
    return (
      <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getFileIcon(file.file_type)}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{file.display_name}</h3>
              <p className="text-sm text-gray-500">
                {file.file_type.toUpperCase()} • {formatFileSize(file.file_size)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderFileContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {file.folder_name ? `In folder: ${file.folder_name}` : 'In root folder'} • 
            Uploaded: {formatDate(file.created_at)} • 
            Downloads: {file.download_count || 0}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Modal display (for teacher interface)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getFileIcon(file.file_type)}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{file.display_name}</h3>
              <p className="text-sm text-gray-500">
                {file.file_type.toUpperCase()} • {formatFileSize(file.file_size)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderFileContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {file.folder_name ? `In folder: ${file.folder_name}` : 'In root folder'} • 
            Uploaded: {formatDate(file.created_at)} • 
            Downloads: {file.download_count || 0}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileViewer
