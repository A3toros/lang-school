import React, { useState, useEffect } from 'react'
import { getFileIcon, formatFileSize } from '../../utils/fileTypes'
import { getFileIconComponent } from '../../utils/FileIconComponent'
import EnhancedFileViewer from '../common/EnhancedFileViewer'
import CachedImage from '../common/CachedImage'

const FileViewer = ({ file, isOpen, onClose, showAsInline = false }) => {
  console.log('🔍 [FILE_VIEWER] FileViewer called with:', { file, isOpen, onClose, showAsInline })
  
  const [googleDocsFailed, setGoogleDocsFailed] = useState(false)
  const [isOfficeDoc, setIsOfficeDoc] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  // Handle window resize for responsive content
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Check if file type is supported by enhanced viewer
  const isSupportedByEnhancedViewer = (file) => {
    if (!file) return false
    
    const fileName = file.original_name || file.display_name || ''
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    
    return ['pdf', 'xlsx', 'xls', 'docx', 'doc'].includes(extension)
  }
  
  // Reset Google Docs failed state when file changes
  useEffect(() => {
    if (!file) return
    
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

  // Use enhanced viewer for supported file types
  if (isSupportedByEnhancedViewer(file)) {
    console.log('🔍 [FILE_VIEWER] Using enhanced viewer for file:', file.display_name)
    return <EnhancedFileViewer file={file} isOpen={isOpen} onClose={onClose} showAsInline={showAsInline} />
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
    // Use the public download endpoint
    const downloadUrl = `/api/files/${file.id}/download/public`
    const link = document.createElement('a')
    link.href = downloadUrl
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
            <div className="mb-4">{getFileIconComponent(file.file_type)}</div>
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

    const scale = Math.min(1, windowSize.width / 1200);

    // Common wrapper: scales child but keeps it centered & responsive
    const ScaledWrapper = ({ children }) => (
      <div className="h-full w-full flex items-center justify-center overflow-auto bg-gray-50">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
          }}
        >
          {children}
        </div>
      </div>
    );

    // Images - use CachedImage for efficient caching with proper scaling
    if (file.file_type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.file_type)) {
      return (
        <ScaledWrapper>
          <CachedImage
            src={url}
            fileId={file.id}
            alt={file.display_name}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
            fallback={
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm text-gray-500">Image unavailable</span>
              </div>
            }
          />
        </ScaledWrapper>
      )
    }

    // PDFs - use <iframe> tag with responsive scaling
    if (file.file_type === 'pdf' || file.file_type === 'application/pdf') {
      // Add viewport parameters for better mobile scaling
      const pdfUrl = `${url}#view=FitH&toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=auto`
      
      return (
        <ScaledWrapper>
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={file.display_name}
          />
        </ScaledWrapper>
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
          <div className="flex items-center justify-center h-full w-full bg-gray-50 p-4">
            <div className="text-center max-w-sm sm:max-w-md">
              <div className="mb-4 text-4xl sm:text-6xl">{getFileIconComponent(file.file_type)}</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 truncate">{file.display_name}</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                {googleDocsFailed ? 'Preview failed due to authentication issues.' : 'Preview is taking too long to load.'} 
                <br />Click download to open it in your default application.
              </p>
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm sm:text-base"
                >
                  📥 Download File
                </button>
                <button
                  onClick={() => window.open(url, '_blank')}
                  className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
                >
                  🔗 Open in New Tab
                </button>
                {!googleDocsFailed && (
                  <button
                    onClick={() => setShowFallback(false)}
                    className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm sm:text-base"
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
      // Add responsive parameters for better mobile scaling
      const googleDocsUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true&chrome=false&widget=true&headers=false`
      
      console.log('🔍 [FILE_VIEWER] Office document detected:', {
        fileType: file.file_type,
        originalUrl: url,
        encodedUrl: encodedUrl,
        googleDocsUrl: googleDocsUrl
      })
      
      return (
        <div className="h-full w-full relative">
          <ScaledWrapper>
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
          </ScaledWrapper>
          {/* Loading indicator */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-blue-100 text-blue-800 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm">
            Loading preview...
          </div>
        </div>
      )
    }

    // Audio files
    if (file.file_type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(file.file_type)) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-sm sm:max-w-md">
            <div className="text-center mb-4 sm:mb-6">
              <div className="mb-2 sm:mb-4 text-4xl sm:text-6xl">{getFileIconComponent(file.file_type)}</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">{file.display_name}</h3>
            </div>
            <audio controls className="w-full h-12 sm:h-14">
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
      <div className="flex items-center justify-center h-full w-full bg-gray-50 p-4">
        <div className="text-center max-w-sm sm:max-w-md">
          <div className="text-4xl sm:text-6xl mb-4">{getFileIcon(file.file_type)}</div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 truncate">{file.display_name}</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            This file type cannot be previewed directly. Click download to open it in your default application.
          </p>
          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={handleDownload}
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm sm:text-base"
            >
              📥 Download File
            </button>
            <button
              onClick={() => window.open(url, '_blank')}
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
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
            <span>{getFileIconComponent(file.file_type)}</span>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-6xl h-[90vh] sm:h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <span className="flex-shrink-0">{getFileIconComponent(file.file_type)}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-800 truncate">{file.display_name}</h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {file.file_type.toUpperCase()} • {formatFileSize(file.file_size)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <button
              onClick={handleDownload}
              className="p-1 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Download"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 border-t border-gray-200 bg-gray-50 gap-2 sm:gap-0">
          <div className="text-xs sm:text-sm text-gray-600 flex-1 min-w-0">
            <div className="truncate">
              {file.folder_name ? `In folder: ${file.folder_name}` : 'In root folder'}
            </div>
            <div className="text-xs text-gray-500">
              Uploaded: {formatDate(file.created_at)} • Downloads: {file.download_count || 0}
            </div>
          </div>
          <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
            <button
              onClick={handleDownload}
              className="px-3 sm:px-4 py-1 sm:py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-xs sm:text-sm flex-1 sm:flex-none"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-1 sm:py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm flex-1 sm:flex-none"
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
