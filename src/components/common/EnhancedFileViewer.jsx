import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { getFileIcon, formatFileSize } from '../../utils/fileTypes'
import { getFileIconComponent } from '../../utils/FileIconComponent'
import CachedImage from './CachedImage'

const EnhancedFileViewer = ({ file, isOpen, onClose, showAsInline = false }) => {
  console.log('🔍 [ENHANCED_FILE_VIEWER] Called with:', { file, isOpen, onClose, showAsInline })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [excelSheets, setExcelSheets] = useState([])
  const [currentSheet, setCurrentSheet] = useState(0)
  const [excelScale, setExcelScale] = useState(0.9)
  const [excelMaxHeight, setExcelMaxHeight] = useState('70vh')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFullWidth, setIsFullWidth] = useState(false)
  const spreadsheetRef = useRef(null)
  const tableContainerRef = useRef(null)

  // Reset state when file changes
  useEffect(() => {
    if (file) {
      setLoading(false)
      setError(null)
      setFileContent(null)
      setFileType(null)
      setNumPages(null)
      setPageNumber(1)
      setExcelSheets([])
      setCurrentSheet(0)
      setExcelScale(0.9)
      setExcelMaxHeight('70vh')
      setIsExpanded(false)
      setIsFullWidth(false)
      loadFileContent()
    }
  }, [file])

  // Handle window resize for responsive scaling
  useEffect(() => {
    const handleResize = () => {
      if (fileType === 'excel' && excelSheets.length > 0) {
        calculateOptimalScale(excelSheets[currentSheet]?.data)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [fileType, excelSheets, currentSheet])

  // Debug scroll height when content changes
  useEffect(() => {
    if (fileContent && tableContainerRef.current) {
      const container = tableContainerRef.current
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight
      console.log('📊 [ENHANCED_FILE_VIEWER] Scroll debug:', {
        scrollHeight,
        clientHeight,
        maxHeight: excelMaxHeight,
        scale: excelScale,
        rows: fileContent.length
      })
    }
  }, [fileContent, excelScale, excelMaxHeight])

  const loadFileContent = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      // Use Cloudinary URL directly for preview, make it publicly accessible
      let cloudinaryUrl = file.cloudinary_url
      
      // For image uploads, add transformation parameters to make it publicly accessible
      if (cloudinaryUrl.includes('/image/upload/')) {
        cloudinaryUrl = cloudinaryUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/')
      }
      // For raw uploads, add transformation parameters to make it publicly accessible
      else if (cloudinaryUrl.includes('/raw/upload/')) {
        cloudinaryUrl = cloudinaryUrl.replace('/raw/upload/', '/raw/upload/f_auto,q_auto/')
      }
      
      console.log('📥 [ENHANCED_FILE_VIEWER] Loading file from Cloudinary:', cloudinaryUrl)

      const response = await fetch(cloudinaryUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const fileExtension = getFileExtension(file.original_name || file.display_name)

      console.log('📄 [ENHANCED_FILE_VIEWER] File loaded, extension:', fileExtension)

      switch (fileExtension.toLowerCase()) {
        case 'pdf':
          setFileType('pdf')
          // No need to load content - we'll use Cloudinary directly
          setFileContent(null)
          break

        case 'xlsx':
        case 'xls':
          setFileType('excel')
          await loadExcelFile(arrayBuffer)
          break

        case 'docx':
        case 'doc':
          setFileType('word')
          await loadWordFile(arrayBuffer)
          break

        default:
          setFileType('unsupported')
          setError('File type not supported for preview')
      }
    } catch (err) {
      console.error('❌ [ENHANCED_FILE_VIEWER] Error loading file:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getFileExtension = (filename) => {
    return filename.split('.').pop() || ''
  }

  const loadExcelFile = async (arrayBuffer) => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetNames = workbook.SheetNames
      
      // Store all sheet names
      setExcelSheets(sheetNames)
      
      // Load the first sheet by default
      const worksheet = workbook.Sheets[sheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      setFileContent(jsonData)
      setCurrentSheet(0)
      calculateOptimalScale(jsonData)
      console.log('📊 [ENHANCED_FILE_VIEWER] Excel data loaded:', jsonData.length, 'rows from', sheetNames.length, 'sheets')
    } catch (err) {
      console.error('❌ [ENHANCED_FILE_VIEWER] Error parsing Excel file:', err)
      setError('Failed to parse Excel file')
    }
  }

  const loadWordFile = async (arrayBuffer) => {
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer })
      setFileContent(result.value)
      console.log('📝 [ENHANCED_FILE_VIEWER] Word document converted to HTML')
    } catch (err) {
      console.error('❌ [ENHANCED_FILE_VIEWER] Error parsing Word file:', err)
      setError('Failed to parse Word document')
    }
  }

  const switchExcelSheet = async (sheetIndex) => {
    if (!file || !excelSheets[sheetIndex]) return
    
    try {
      setLoading(true)
      const response = await fetch(file.cloudinary_url)
      const arrayBuffer = await response.arrayBuffer()
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const worksheet = workbook.Sheets[excelSheets[sheetIndex]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      setFileContent(jsonData)
      setCurrentSheet(sheetIndex)
      calculateOptimalScale(jsonData)
      console.log('📊 [ENHANCED_FILE_VIEWER] Switched to sheet:', excelSheets[sheetIndex])
    } catch (err) {
      console.error('❌ [ENHANCED_FILE_VIEWER] Error switching sheet:', err)
      setError('Failed to switch sheet')
    } finally {
      setLoading(false)
    }
  }

  const calculateOptimalScale = (data) => {
    if (!data || data.length === 0) return

    // Calculate approximate table width based on number of columns and content
    const maxColumns = Math.max(...data.map(row => row ? row.length : 0))
    
    // Estimate column width based on content length
    let estimatedWidth = 0
    for (let col = 0; col < maxColumns; col++) {
      let maxCellWidth = 80 // Minimum column width
      for (let row = 0; row < Math.min(data.length, 10); row++) { // Check first 10 rows
        if (data[row] && data[row][col]) {
          const cellLength = String(data[row][col]).length
          maxCellWidth = Math.max(maxCellWidth, cellLength * 8 + 20) // 8px per char + padding
        }
      }
      estimatedWidth += Math.min(maxCellWidth, 200) // Cap at 200px per column
    }
    
    // Get responsive container width based on viewport
    const getContainerWidth = () => {
      if (typeof window === 'undefined') return 800
      
      const viewportWidth = window.innerWidth
      if (viewportWidth < 640) return viewportWidth - 32 // Mobile: full width minus padding
      if (viewportWidth < 768) return viewportWidth - 64 // Small tablet
      if (viewportWidth < 1024) return viewportWidth - 128 // Tablet
      if (viewportWidth < 1280) return 800 // Small desktop
      return 1000 // Large desktop
    }
    
    const containerWidth = getContainerWidth()
    
    // Calculate scale needed to fit content
    const requiredScale = containerWidth / estimatedWidth
    
    // Use horizontal scroll if scale would be too small (less than 0.4 on mobile, 0.6 on desktop)
    const minScale = window.innerWidth < 640 ? 0.4 : 0.6
    if (requiredScale < minScale) {
      setExcelScale(1.0) // No scaling, use horizontal scroll
      setExcelMaxHeight(window.innerWidth < 640 ? '60vh' : '85vh') // Give more height for horizontal scroll mode
    } else {
      setExcelScale(Math.max(minScale, Math.min(0.9, requiredScale))) // Scale between minScale and 0.9
      setExcelMaxHeight(window.innerWidth < 640 ? '50vh' : '70vh') // Normal height for scaled mode
    }
    
    console.log('📊 [ENHANCED_FILE_VIEWER] Calculated scale:', excelScale, 'for', maxColumns, 'columns, estimated width:', estimatedWidth)
  }

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded) {
      // Expand to 1.5x height
      setExcelMaxHeight('105vh') // 1.5 * 70vh
    } else {
      // Return to normal height
      setExcelMaxHeight(excelScale === 1.0 ? '85vh' : '70vh')
    }
  }

  const toggleFullWidth = () => {
    setIsFullWidth(!isFullWidth)
  }

  const handleDownload = () => {
    const downloadUrl = `/api/files/${file.id}/download/public`
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = file.display_name || file.original_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderPDFViewer = () => {
    // Use Cloudinary's native PDF preview
    const cloudinaryUrl = file.cloudinary_url
    
    // Make the URL publicly accessible by adding transformation parameters
    let publicUrl = cloudinaryUrl
    if (cloudinaryUrl.includes('/image/upload/')) {
      publicUrl = cloudinaryUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/')
    } else if (cloudinaryUrl.includes('/raw/upload/')) {
      publicUrl = cloudinaryUrl.replace('/raw/upload/', '/raw/upload/f_auto,q_auto/')
    }

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">PDF Document Preview</h3>
          </div>
        </div>
        <div 
          className="flex-1 overflow-auto p-4" 
          style={{ 
            maxHeight: '70vh',
            height: '70vh'
          }}
        >
          <div className="w-full h-full flex justify-center">
            <div className="w-full h-full" style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
              <object
                data={publicUrl}
                type="application/pdf"
                width="125%"
                height="125%"
                className="border rounded-lg shadow-lg"
                style={{ minHeight: '600px' }}
              >
                <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
                  <p className="text-gray-600 mb-4">PDF cannot be displayed in this browser.</p>
                  <a 
                    href={publicUrl} 
                    download={file.display_name || file.original_name}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Download PDF
                  </a>
                </div>
              </object>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderExcelViewer = () => {
    if (!fileContent) return <div>Loading Excel file...</div>

    return (
      <div className="flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Excel Data Preview</h3>
            <div className="flex items-center space-x-3">
              {excelSheets.length > 1 && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Sheet:</label>
                  <select
                    value={currentSheet}
                    onChange={(e) => switchExcelSheet(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {excelSheets.map((sheetName, index) => (
                      <option key={index} value={index}>
                        {sheetName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleExpansion}
                  className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                  title={isExpanded ? "Collapse height" : "Expand height (1.5x)"}
                >
                  {isExpanded ? (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Collapse H
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Expand H
                    </>
                  )}
                </button>
                <button
                  onClick={toggleFullWidth}
                  className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                  title={isFullWidth ? "Normal width" : "Full width (stretch to content)"}
                >
                  {isFullWidth ? (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15v4.5M15 15h4.5M15 15l5.5 5.5" />
                      </svg>
                      Normal W
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Full W
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading sheet...</p>
              </div>
            </div>
          ) : (
            <>
              <div 
                ref={tableContainerRef}
                className="w-full border rounded overflow-auto" 
                style={{ 
                  height: excelMaxHeight,
                  maxHeight: excelMaxHeight,
                  overflowX: excelScale === 1.0 ? 'auto' : 'hidden',
                  overflowY: 'auto',
                  width: isFullWidth ? '100vw' : '100%',
                  maxWidth: isFullWidth ? 'none' : '100%',
                  marginLeft: isFullWidth ? 'calc(-50vw + 50%)' : '0',
                  marginRight: isFullWidth ? 'calc(-50vw + 50%)' : '0',
                  // Responsive adjustments
                  minWidth: window.innerWidth < 640 ? '100%' : 'auto'
                }}
              >
                <div 
                  style={{ 
                    transform: `scale(${excelScale})`, 
                    transformOrigin: 'top left', 
                    paddingBottom: excelScale === 1.0 ? '40px' : '20px',
                    width: excelScale === 1.0 ? 'max-content' : '111%',
                    minHeight: excelScale === 1.0 ? '100%' : 'auto'
                  }}
                >
                  <table 
                    className="min-w-full divide-y divide-gray-200" 
                    style={{ 
                      fontSize: '0.75rem', 
                      width: excelScale === 1.0 ? 'max-content' : '111%',
                      minWidth: excelScale === 1.0 ? '100%' : 'auto',
                      tableLayout: 'auto',
                      height: excelScale === 1.0 ? 'auto' : 'auto'
                    }}
                  >
                    <thead className="bg-gray-50">
                      {fileContent[0] && (
                        <tr>
                          {fileContent[0].map((header, index) => (
                            <th
                              key={index}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                            >
                              {header || `Column ${index + 1}`}
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200" style={{ height: 'auto' }}>
                      {fileContent.slice(1, excelScale === 1.0 ? fileContent.length : 101).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50" style={{ height: 'auto' }}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap"
                              style={{
                                maxWidth: excelScale === 1.0 ? 'none' : '200px',
                                overflow: excelScale === 1.0 ? 'visible' : 'hidden',
                                textOverflow: excelScale === 1.0 ? 'clip' : 'ellipsis',
                                height: 'auto',
                                minHeight: '32px'
                              }}
                            >
                              {cell || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {excelScale !== 1.0 && fileContent.length > 101 && (
                  <p className="text-sm text-gray-500">
                    Showing first 100 rows of {fileContent.length - 1} total rows
                  </p>
                )}
                {excelScale === 1.0 && fileContent.length > 1 && (
                  <p className="text-sm text-gray-500">
                    Showing all {fileContent.length - 1} rows - scroll to view all content
                  </p>
                )}
                {excelScale === 1.0 && (
                  <p className="text-sm text-blue-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                    Wide table - scroll horizontally to view all columns
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderWordViewer = () => {
    if (!fileContent) return <div>Loading Word document...</div>

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Word Document Preview</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFullWidth}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                title={isFullWidth ? "Normal width" : "Full width (stretch to content)"}
              >
                {isFullWidth ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15v4.5M15 15h4.5M15 15l5.5 5.5" />
                    </svg>
                    Normal W
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Full W
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <div 
          className="flex-1 overflow-auto p-2 sm:p-4" 
          style={{ 
            maxHeight: '70vh',
            height: '70vh'
          }}
        >
          <div 
            className="prose max-w-none w-full"
            style={{ 
              fontSize: window.innerWidth < 640 ? '0.65rem' : '0.75rem', 
              lineHeight: '1.4',
              transform: window.innerWidth < 640 ? 'scale(0.8)' : 'scale(0.9)',
              transformOrigin: 'top left'
            }}
            dangerouslySetInnerHTML={{ __html: fileContent }}
          />
        </div>
      </div>
    )
  }

  const renderUnsupportedFile = () => {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md">
          <div className="mb-4">{getFileIconComponent(file.file_type)}</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{file.display_name}</h3>
          <p className="text-gray-600 mb-6">
            This file type cannot be previewed directly. Click download to open it in your default application.
          </p>
          <button
            onClick={handleDownload}
            className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            📥 Download File
          </button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading file preview...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Preview Error</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleDownload}
              className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              📥 Download File
            </button>
          </div>
        </div>
      )
    }

    switch (fileType) {
      case 'pdf':
        return renderPDFViewer()
      case 'excel':
        return renderExcelViewer()
      case 'word':
        return renderWordViewer()
      case 'unsupported':
        return renderUnsupportedFile()
      default:
        return <div>Loading...</div>
    }
  }

  if (!isOpen || !file) return null

  return (
    <div className={`fixed inset-0 z-50 ${showAsInline ? 'relative' : 'fixed'}`}>
      {!showAsInline && (
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      )}
      
      <div className={`${showAsInline ? 'h-full' : 'fixed inset-4'} bg-white rounded-lg shadow-xl flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div>{getFileIconComponent(file.file_type)}</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{file.display_name}</h2>
              <p className="text-sm text-gray-500">
                {formatFileSize(file.file_size)} • {file.file_type}
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
          {renderContent()}
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

export default EnhancedFileViewer
