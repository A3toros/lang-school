import React, { useState } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

function PDFViewer({ file, onClose }) {
  console.log('🔍 [PDF_VIEWER] Received file:', file)
  console.log('🔍 [PDF_VIEWER] File URL:', file.url)
  console.log('🔍 [PDF_VIEWER] File URL type:', typeof file.url)
  console.log('🔍 [PDF_VIEWER] File URL length:', file.url?.length)
  
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [useIframe, setUseIframe] = useState(false)

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
  }

  const onDocumentLoadError = (error) => {
    console.error('❌ [PDF_VIEWER] Document load error:', error)
    console.error('❌ [PDF_VIEWER] File URL was:', file.url)
    console.error('❌ [PDF_VIEWER] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    
    // If PDF.js fails due to worker issues, try iframe fallback
    if (error.message.includes('worker') || error.message.includes('fake worker')) {
      console.log('🔄 [PDF_VIEWER] PDF.js failed, trying iframe fallback')
      setUseIframe(true)
      setError(null)
      setLoading(false)
    } else {
      setError(`Failed to load PDF: ${error.message}`)
      setLoading(false)
    }
  }

  // Validate URL before rendering
  if (!file.url) {
    console.error('❌ [PDF_VIEWER] No file URL provided')
    return (
      <div className="pdf-viewer-container p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">No file URL provided</p>
          <button 
            onClick={onClose}
            className="btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // Iframe fallback for when PDF.js fails
  if (useIframe) {
    console.log('🔄 [PDF_VIEWER] Rendering iframe fallback')
    return (
      <div className="pdf-viewer-container">
        <div className="pdf-controls bg-gray-100 p-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">PDF Viewer (iframe)</span>
            <button 
              onClick={() => setUseIframe(false)}
              className="btn-secondary text-sm"
            >
              Try PDF.js Again
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => window.open(file.url, '_blank')}
              className="btn-primary text-sm"
            >
              Open in New Tab
            </button>
          </div>
        </div>
        <div className="pdf-content bg-white" style={{ height: '70vh' }}>
          <iframe
            src={file.url}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title={`PDF: ${file.display_name}`}
            onError={() => {
              console.error('❌ [PDF_VIEWER] Iframe also failed to load')
              setError('Failed to load PDF in both PDF.js and iframe')
            }}
          />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pdf-viewer-container p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-2">
            <button 
              onClick={() => setUseIframe(true)}
              className="btn-secondary"
            >
              Try iframe
            </button>
            <button 
              onClick={() => window.open(file.url, '_blank')}
              className="btn-primary"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-controls bg-gray-100 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="btn-secondary text-sm"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            {pageNumber} of {numPages || '?'}
          </span>
          <button 
            onClick={() => setPageNumber(prev => Math.min(numPages || 1, prev + 1))}
            disabled={pageNumber >= (numPages || 1)}
            className="btn-secondary text-sm"
          >
            Next
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
            className="btn-secondary text-sm"
          >
            Zoom Out
          </button>
          <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(prev => Math.min(2.0, prev + 0.1))}
            className="btn-secondary text-sm"
          >
            Zoom In
          </button>
        </div>
      </div>
      
      <div className="pdf-content bg-white p-4 overflow-auto" style={{ maxHeight: '70vh' }}>
        <Document
          file={file.url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="text-center p-8">Loading PDF...</div>}
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

export default PDFViewer
