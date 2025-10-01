import React, { useState } from 'react'

function WordViewer({ file, onClose }) {
  const [googleDocsFailed, setGoogleDocsFailed] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=true`

  return (
    <div className="word-viewer-container">
      {!googleDocsFailed && !showFallback ? (
        <div className="relative">
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
            title={`Preview of ${file.display_name}`}
          />
        </div>
      ) : (
        <div className="fallback-viewer p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Document preview not available</p>
          <p className="text-sm text-gray-500 mb-6">Please download the document to view it</p>
          <button 
            onClick={async () => {
              try {
                // Fetch the file and trigger proper download
                const response = await fetch(file.url)
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
            Download Document
          </button>
        </div>
      )}
    </div>
  )
}

export default WordViewer
