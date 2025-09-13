import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'
import TeacherFolderTree from './TeacherFolderTree'
import FileViewer from '../admin/FileViewer'
import { getFileIcon, formatFileSize } from '../../utils/fileTypes'

const FileLibrary = () => {
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('')
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [previewFile, setPreviewFile] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [filesResponse, foldersResponse] = await Promise.all([
        apiService.getPublicFiles(),
        apiService.getFolders()
      ])
      
      if (filesResponse.success) {
        setFiles(filesResponse.files)
      }
      
      if (foldersResponse.success) {
        setFolders(foldersResponse.folders)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    // Search is handled by filtering in the render
  }


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const sortFiles = (files) => {
    return [...files].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.display_name.localeCompare(b.display_name)
        case 'date':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'size':
          return b.file_size - a.file_size
        case 'downloads':
          return (b.download_count || 0) - (a.download_count || 0)
        default:
          return 0
      }
    })
  }

  const handleDownloadFile = async (file) => {
    try {
      const response = await apiService.downloadFile(file.id)
      if (response.success) {
        // Open download URL in new tab
        window.open(response.download_url, '_blank')
      } else {
        alert('Failed to download file: ' + response.error)
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Failed to download file')
    }
  }

  const handlePreviewFile = (file) => {
    setPreviewFile(file)
    setShowPreview(true)
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.display_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !fileTypeFilter || file.file_type === fileTypeFilter
    const matchesFolder = selectedFolder === null || file.folder_id === selectedFolder
    return matchesSearch && matchesType && matchesFolder
  })

  const sortedFiles = sortFiles(filteredFiles)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-full overflow-hidden h-[600px] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border-b border-gray-200">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">File Library</h2>
        <div className="text-xs sm:text-sm text-gray-500">
          {files.length} file{files.length !== 1 ? 's' : ''} available
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Folder Tree */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200">
          <TeacherFolderTree
            folders={folders}
            selectedFolder={selectedFolder}
            onFolderSelect={setSelectedFolder}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Filter Bar */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs sm:text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="sm:w-40">
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs sm:text-sm"
                >
                  <option value="">All file types</option>
                  <optgroup label="Documents">
                    <option value="pdf">PDF</option>
                    <option value="doc">DOC</option>
                    <option value="docx">DOCX</option>
                    <option value="txt">TXT</option>
                    <option value="xls">XLS</option>
                    <option value="xlsx">XLSX</option>
                    <option value="ppt">PPT</option>
                    <option value="pptx">PPTX</option>
                  </optgroup>
                  <optgroup label="Images">
                    <option value="jpg">JPG</option>
                    <option value="png">PNG</option>
                    <option value="gif">GIF</option>
                    <option value="webp">WEBP</option>
                    <option value="svg">SVG</option>
                  </optgroup>
                  <optgroup label="Audio">
                    <option value="mp3">MP3</option>
                    <option value="wav">WAV</option>
                    <option value="ogg">OGG</option>
                    <option value="m4a">M4A</option>
                    <option value="aac">AAC</option>
                    <option value="flac">FLAC</option>
                  </optgroup>
                  <optgroup label="Archives">
                    <option value="zip">ZIP</option>
                    <option value="rar">RAR</option>
                  </optgroup>
                </select>
              </div>
              <div className="sm:w-40">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs sm:text-sm"
                >
                  <option value="name">Sort by Name</option>
                  <option value="date">Sort by Date</option>
                  <option value="size">Sort by Size</option>
                  <option value="downloads">Sort by Downloads</option>
                </select>
              </div>
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-hidden">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full">
              {/* List Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-6">Name</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-2">Modified</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>

              {/* Files List */}
              <div className="divide-y divide-gray-200 overflow-y-auto h-full">
                {sortedFiles.map(file => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="col-span-6 flex items-center space-x-3 min-w-0">
                      <span className="text-xl">{getFileIcon(file.file_type)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-gray-900 truncate" title={file.display_name}>
                          {file.display_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {file.folder_name || 'Root'} • {file.file_type.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-2 text-sm text-gray-500">
                      {formatFileSize(file.file_size)}
                    </div>
                    
                    <div className="col-span-2 text-sm text-gray-500">
                      {formatDate(file.created_at)}
                    </div>
                    
                    <div className="col-span-2 flex items-center space-x-2">
                      <button
                        onClick={() => handlePreviewFile(file)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Preview"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {sortedFiles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📁</div>
                  <p>No files found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      <FileViewer
        file={previewFile}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false)
          setPreviewFile(null)
        }}
      />
    </div>
  )
}

export default FileLibrary