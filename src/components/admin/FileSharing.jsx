import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'
import FolderTree from './FolderTree'
import UniversalFileViewer from '../common/UniversalFileViewer'
import { getFileIcon, formatFileSize } from '../../utils/fileTypes'

const FileSharing = () => {
  const [activeTab, setActiveTab] = useState('files')
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [foldersResponse, filesResponse] = await Promise.all([
        apiService.getFolders(),
        apiService.getFiles()
      ])

      if (foldersResponse.success) {
        setFolders(foldersResponse.folders)
      }
      if (filesResponse.success) {
        setFiles(filesResponse.files)
      }
    } catch (error) {
      console.error('Error fetching file data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderSelect = async (folderId) => {
    console.log('📁 [FILE_SHARING] Folder selected:', folderId)
    setSelectedFolder(folderId)
    await fetchFilesForFolder(folderId)
  }

  const fetchFilesForFolder = async (folderId) => {
    try {
      const response = await apiService.getFiles({ folder_id: folderId })
      console.log('📁 [FILE_SHARING] Files response for folder', folderId, ':', response)
      if (response.success) {
        setFiles(response.files)
        console.log('📁 [FILE_SHARING] Files updated:', response.files)
      }
    } catch (error) {
      console.error('Error fetching folder files:', error)
    }
  }

  const handleCurrentFolderChange = async (folderId) => {
    console.log('📁 [FILE_SHARING] Current folder changed to:', folderId)
    setSelectedFolder(folderId)
    setCurrentFolderId(folderId)
    await fetchFilesForFolder(folderId)
  }

  const handleSearch = async () => {
    try {
      const filters = {}
      if (searchTerm) filters.search = searchTerm
      if (fileTypeFilter) filters.file_type = fileTypeFilter
      if (selectedFolder) filters.folder_id = selectedFolder

      const response = await apiService.getFiles(filters)
      if (response.success) {
        setFiles(response.files)
      }
    } catch (error) {
      console.error('Error searching files:', error)
    }
  }

  const handleFileUpload = (newFile) => {
    console.log('🔄 [FILE_SHARING] Adding new file to list:', newFile)
    setFiles(prev => {
      const updated = [newFile, ...prev]
      console.log('🔄 [FILE_SHARING] Updated file list:', updated)
      return updated
    })
  }

  const handleFileSelect = async (file) => {
    console.log('📁 [FILE_SHARING] File selected for viewing:', file)
    console.log('📁 [FILE_SHARING] File cloudinary_url:', file.cloudinary_url)
    console.log('📁 [FILE_SHARING] File supabase_path:', file.supabase_path)
    
    try {
      // For Supabase files, get a signed URL for viewing
      if (file.supabase_path) {
        console.log('📁 [FILE_SHARING] Getting signed URL for Supabase file')
        const response = await apiService.getFileViewUrl(file.id)
        console.log('📁 [FILE_SHARING] API response:', response)
        
        if (response.success) {
          const fileWithUrl = {
            ...file,
            url: response.viewUrl,
            display_name: response.fileName,
            original_name: response.fileName
          }
          console.log('📁 [FILE_SHARING] Setting selectedFile with signed URL:', fileWithUrl)
          setSelectedFile(fileWithUrl)
        } else {
          console.error('Failed to get file view URL:', response.error)
          alert('Failed to load file preview: ' + response.error)
          setSelectedFile(null)
        }
      } else {
        // For Cloudinary files, use the existing URL
        console.log('📁 [FILE_SHARING] Using Cloudinary URL for file')
        setSelectedFile(file)
      }
    } catch (error) {
      console.error('Failed to get file URL:', error)
      alert('Failed to load file preview: ' + error.message)
      setSelectedFile(null)
    }
  }

  // Debug: Log files whenever they change
  useEffect(() => {
    console.log('📁 [FILE_SHARING] Files state updated:', files)
  }, [files])

  // Debug: Log selectedFile whenever it changes
  useEffect(() => {
    console.log('📁 [FILE_SHARING] selectedFile state updated:', selectedFile)
  }, [selectedFile])

  const handleFileUpdate = (updatedFile) => {
    setFiles(prev => prev.map(file => 
      file.id === updatedFile.id ? updatedFile : file
    ))
  }

  const handleFileDelete = async (file) => {
    try {
      console.log('🗑️ [FILE_SHARING] Deleting file:', file)
      
      // Call API to delete file from database and Cloudinary
      const response = await apiService.deleteFile(file.id)
      
      if (response.success) {
        console.log('✅ [FILE_SHARING] File deleted successfully')
        // Update local state
        setFiles(prev => prev.filter(f => f.id !== file.id))
      } else {
        console.error('❌ [FILE_SHARING] Failed to delete file:', response.error)
        alert('Failed to delete file: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('❌ [FILE_SHARING] Error deleting file:', error)
      alert('Error deleting file: ' + error.message)
    }
  }

  const handleFileMove = async (file) => {
    try {
      console.log('📁 [FILE_SHARING] Moving file:', file)
      
      // Show folder selection dialog
      const targetFolderId = await showFolderSelectionDialog(file)
      
      if (targetFolderId !== null && targetFolderId !== file.folder_id) {
        // Call API to move file
        const response = await apiService.updateFile(file.id, {
          folder_id: targetFolderId
        })
        
        if (response.success) {
          console.log('✅ [FILE_SHARING] File moved successfully')
          // Update local state
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, folder_id: targetFolderId } : f
          ))
        } else {
          console.error('❌ [FILE_SHARING] Failed to move file:', response.error)
          alert('Failed to move file: ' + (response.error || 'Unknown error'))
        }
      }
    } catch (error) {
      console.error('❌ [FILE_SHARING] Error moving file:', error)
      alert('Error moving file: ' + error.message)
    }
  }

  const showFolderSelectionDialog = (file) => {
    return new Promise((resolve) => {
      // Create a simple folder selection dialog
      const dialog = document.createElement('div')
      dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4">Move "${file.display_name}" to:</h3>
          <div class="space-y-2 mb-4 max-h-60 overflow-y-auto">
            <button class="w-full text-left px-3 py-2 hover:bg-gray-100 rounded border-2 border-dashed border-gray-300" data-folder-id="null">
              📁 Root Folder
            </button>
            ${folders.map(folder => `
              <button class="w-full text-left px-3 py-2 hover:bg-gray-100 rounded" data-folder-id="${folder.id}">
                📁 ${folder.name}
              </button>
            `).join('')}
          </div>
          <div class="flex justify-end space-x-2">
            <button id="cancel-move" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
              Cancel
            </button>
          </div>
        </div>
      `
      
      document.body.appendChild(dialog)
      
      // Handle folder selection
      dialog.addEventListener('click', (e) => {
        if (e.target.dataset.folderId !== undefined) {
          const folderId = e.target.dataset.folderId === 'null' ? null : parseInt(e.target.dataset.folderId)
          document.body.removeChild(dialog)
          resolve(folderId)
        } else if (e.target.id === 'cancel-move') {
          document.body.removeChild(dialog)
          resolve(null)
        }
      })
    })
  }

  const handleFolderUpdate = (updatedFolder) => {
    setFolders(prev => prev.map(folder => 
      folder.id === updatedFolder.id ? updatedFolder : folder
    ))
  }

  const handleFolderDelete = (folderId) => {
    setFolders(prev => prev.filter(folder => folder.id !== folderId))
    if (selectedFolder === folderId) {
      setSelectedFolder(null)
      fetchData() // Refresh all files
    }
  }

  const handleFolderCreate = (newFolder) => {
    setFolders(prev => [newFolder, ...prev])
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-full overflow-hidden h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border-b border-gray-200">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">File Sharing</h2>
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
          <div className="flex space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
              activeTab === 'files'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Files
          </button>
          <button
            onClick={() => setActiveTab('folders')}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
              activeTab === 'folders'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Folders
          </button>
          </div>
        </div>
      </div>

      {activeTab === 'files' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex overflow-hidden"
        >

          {/* Left Sidebar - Folder Tree */}
          <div className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            fixed lg:relative inset-y-0 left-0 z-40
            w-64 lg:w-64 flex-shrink-0 border-r border-gray-200 bg-white
            transition-transform duration-300 ease-in-out
            lg:transition-none
          `}>
            <FolderTree
              folders={folders}
              files={files}
              selectedFolder={selectedFolder}
              onFolderSelect={handleFolderSelect}
              onFolderCreate={handleFolderCreate}
              onFolderUpdate={handleFolderUpdate}
              onFolderDelete={handleFolderDelete}
              onSubfolderCreate={handleFolderCreate}
              onCurrentFolderChange={handleCurrentFolderChange}
              onFileUpdate={handleFileUpdate}
              onFileDelete={handleFileDelete}
              onFileMove={handleFileMove}
              onFileSelect={handleFileSelect}
              onFileUpload={handleFileUpload}
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
                    <option value="">All types</option>
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
                <button
                  onClick={handleSearch}
                  className="px-3 sm:px-4 py-1 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Preview Area - Shows file content or placeholder */}
            <div className="flex-1 overflow-hidden p-2 sm:p-4">
              {(() => {
                console.log('📁 [FILE_SHARING] Rendering preview area, selectedFile:', selectedFile)
                return selectedFile ? (
                  <div className="h-full">
                    <UniversalFileViewer 
                      file={selectedFile} 
                      isOpen={true} 
                      onClose={() => setSelectedFile(null)} 
                      showAsInline={true}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center px-4">
                      <div className="text-4xl sm:text-6xl mb-4">📁</div>
                      <div className="text-base sm:text-lg font-medium">File Preview Area</div>
                      <div className="text-xs sm:text-sm">Click on a file in the folder tree to preview it here</div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'folders' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-hidden"
        >
          <FolderTree
            folders={folders}
            selectedFolder={selectedFolder}
            onFolderSelect={handleFolderSelect}
            onFolderCreate={handleFolderCreate}
            onFolderUpdate={handleFolderUpdate}
            onFileUpdate={handleFileUpdate}
            onFileDelete={handleFileDelete}
            onFileMove={handleFileMove}
            onFolderDelete={handleFolderDelete}
            onSubfolderCreate={handleFolderCreate}
            onFileSelect={handleFileSelect}
          />
        </motion.div>
      )}

    </div>
  )
}

export default FileSharing
