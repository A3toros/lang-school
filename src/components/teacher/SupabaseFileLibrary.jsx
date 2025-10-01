import React, { useState, useEffect } from 'react'
import UniversalFileViewer from '../common/UniversalFileViewer'
import apiService from '../../utils/api'

function SupabaseFileLibrary() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('')
  const [currentFolder, setCurrentFolder] = useState(null)
  
  useEffect(() => {
    loadFiles()
  }, [currentFolder, searchTerm, fileTypeFilter])
  
  const loadFiles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (currentFolder) {
        params.append('folder_id', currentFolder.id)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      if (fileTypeFilter) {
        params.append('file_type', fileTypeFilter)
      }
      
      const response = await apiService.getPublicFiles(params.toString())
      if (response.success) {
        setFiles(response.files)
      } else {
        console.error('Failed to load files:', response.error)
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
        setSelectedFile({ 
          ...file, 
          url: response.viewUrl,
          display_name: response.fileName,
          original_name: response.fileName
        })
      } else {
        console.error('Failed to get file view URL:', response.error)
        alert('Failed to load file preview')
      }
    } catch (error) {
      console.error('Failed to get file URL:', error)
      alert('Failed to load file preview')
    }
  }
  
  const handleDownload = async (file) => {
    try {
      const response = await apiService.downloadFile(file.id)
      if (response.success) {
        // Fetch the file and trigger proper download
        const downloadResponse = await fetch(response.downloadUrl)
        if (!downloadResponse.ok) {
          throw new Error(`Download failed: ${downloadResponse.status}`)
        }
        
        // Get the file blob
        const blob = await downloadResponse.blob()
        
        // Create a blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = response.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up the blob URL
        URL.revokeObjectURL(blobUrl)
      } else {
        console.error('Download failed:', response.error)
        alert('Download failed')
      }
    } catch (error) {
      console.error('Download failed:', error)
      alert('Download failed')
    }
  }
  
  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase() || ''
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('doc')) return '📝'
    if (type.includes('excel') || type.includes('sheet')) return '📊'
    if (type.includes('powerpoint') || type.includes('presentation')) return '📽️'
    if (type.includes('image')) return '🖼️'
    if (type.includes('audio')) return '🎵'
    if (type.includes('video')) return '🎬'
    return '📁'
  }
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  return (
    <div className="file-library">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">File Library</h2>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="application/pdf">PDF</option>
            <option value="application/msword">Word</option>
            <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word (DOCX)</option>
            <option value="application/vnd.ms-excel">Excel</option>
            <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel (XLSX)</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="audio/mpeg">MP3</option>
          </select>
        </div>
        
        {/* Current Folder */}
        {currentFolder && (
          <div className="mb-4">
            <button
              onClick={() => setCurrentFolder(null)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to All Files
            </button>
            <span className="text-gray-600 ml-2">/ {currentFolder.name}</span>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-gray-600">No files found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map(file => (
            <div key={file.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div 
                onClick={() => handleFileClick(file)}
                className="cursor-pointer"
              >
                <div className="text-center mb-3">
                  <div className="text-4xl mb-2">{getFileIcon(file.file_type)}</div>
                  <h3 className="font-medium text-gray-900 truncate" title={file.display_name}>
                    {file.display_name}
                  </h3>
                </div>
                
                <div className="text-sm text-gray-500 space-y-1">
                  <div>Size: {formatFileSize(file.file_size)}</div>
                  <div>Type: {file.file_type}</div>
                  <div>Uploaded: {formatDate(file.created_at)}</div>
                  {file.uploaded_by_name && (
                    <div>By: {file.uploaded_by_name}</div>
                  )}
                  {file.download_count > 0 && (
                    <div>Downloads: {file.download_count}</div>
                  )}
                </div>
              </div>
              
              <div className="mt-3 flex justify-between">
                <button
                  onClick={() => handleFileClick(file)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Preview
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  Download
                </button>
              </div>
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

export default SupabaseFileLibrary
