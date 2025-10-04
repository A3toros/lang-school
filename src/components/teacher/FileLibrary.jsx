import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'
import TeacherFolderTree from './TeacherFolderTree'
import UniversalFileViewer from '../common/UniversalFileViewer'
import { getFileIcon, formatFileSize } from '../../utils/fileTypes'
import { getFileIconComponent } from '../../utils/FileIconComponent'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
            console.log('📁 [FILE_LIBRARY] Starting download for file:', file.id)
            
            let downloadUrl, fileName
            
            if (file.supabase_path) {
              // For Supabase files, get the signed URL first
              console.log('📁 [FILE_LIBRARY] Getting signed URL for Supabase file')
              const response = await apiService.downloadFilePublic(file.id)
              if (!response.success) {
                throw new Error(response.error || 'Failed to get download URL')
              }
              downloadUrl = response.downloadUrl
              fileName = response.fileName
              console.log('📁 [FILE_LIBRARY] Got signed URL:', downloadUrl.substring(0, 50) + '...')
            } else {
              // For Cloudinary files, use the existing URL
              downloadUrl = file.cloudinary_url
              fileName = file.display_name || file.original_name
              console.log('📁 [FILE_LIBRARY] Using Cloudinary URL:', downloadUrl.substring(0, 50) + '...')
            }
            
            // Fetch the actual file content from the URL
            console.log('📁 [FILE_LIBRARY] Fetching file content from URL')
            const fileResponse = await fetch(downloadUrl)
            if (!fileResponse.ok) {
              throw new Error(`Download failed: ${fileResponse.status} ${fileResponse.statusText}`)
            }
            
            // Get the file blob
            const blob = await fileResponse.blob()
            console.log('📁 [FILE_LIBRARY] File blob size:', blob.size, 'bytes')
            
            if (blob.size === 0) {
              throw new Error('Downloaded file is empty')
            }
            
            // Create a blob URL and trigger download
            const blobUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            // Clean up the blob URL
            URL.revokeObjectURL(blobUrl)
            
            console.log('✅ [FILE_LIBRARY] Download initiated')
          } catch (error) {
            console.error('Error downloading file:', error)
            alert('Failed to download file: ' + error.message)
          }
        }

  const handlePreviewFile = async (file) => {
    console.log('📁 [FILE_LIBRARY] File selected for viewing:', file)
    console.log('📁 [FILE_LIBRARY] File cloudinary_url:', file.cloudinary_url)
    console.log('📁 [FILE_LIBRARY] File supabase_path:', file.supabase_path)
    
    try {
      // For Supabase files, get a signed URL for viewing
      if (file.supabase_path) {
        console.log('📁 [FILE_LIBRARY] Getting signed URL for Supabase file')
        const response = await apiService.getFileViewUrlPublic(file.id)
        console.log('📁 [FILE_LIBRARY] API response:', response)
        
        if (response.success) {
          const fileWithUrl = {
            ...file,
            url: response.viewUrl,
            display_name: response.fileName,
            original_name: response.fileName
          }
          console.log('📁 [FILE_LIBRARY] Setting previewFile with signed URL:', fileWithUrl)
          setPreviewFile(fileWithUrl)
          setShowPreview(true)
        } else {
          console.error('Failed to get file view URL:', response.error)
          alert('Failed to load file preview: ' + response.error)
        }
      } else {
        // For Cloudinary files, use the existing URL
        console.log('📁 [FILE_LIBRARY] Using Cloudinary URL for file')
        setPreviewFile(file)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Failed to get file URL:', error)
      alert('Failed to load file preview: ' + error.message)
    }
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
        <div className="flex items-center space-x-2">
          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-xs sm:text-sm text-gray-500">
            {files.length} file{files.length !== 1 ? 's' : ''} available
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Folder Tree */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:relative inset-y-0 left-0 z-40
          w-64 lg:w-64 flex-shrink-0 border-r border-gray-200 bg-white
          transition-transform duration-300 ease-in-out
          lg:transition-none
        `}>
          <TeacherFolderTree
            folders={folders}
            selectedFolder={selectedFolder}
            onFolderSelect={setSelectedFolder}
          />
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Filter Bar */}
          <div className="p-2 sm:p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs sm:text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="w-full sm:w-32 md:w-40">
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
              <div className="w-full sm:w-32 md:w-40">
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
              {/* List Header - Hidden on mobile */}
              <div className="hidden sm:block bg-gray-50 border-b border-gray-200 px-4 py-2">
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
                    className="flex items-center px-2 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="sm:hidden flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className="flex-shrink-0">{getFileIconComponent(file.file_type)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900 truncate" title={file.display_name}>
                            {file.display_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {file.folder_name || 'Root'} • {file.file_type.toUpperCase()}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-xs text-gray-500">
                              {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                            </div>
                            <div className="flex items-center space-x-2">
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
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 sm:w-full">
                      <div className="col-span-6 flex items-center space-x-3 min-w-0">
                        <span>{getFileIconComponent(file.file_type)}</span>
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
      <UniversalFileViewer
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