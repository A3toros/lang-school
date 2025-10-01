import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'
import supabaseFileService from '../../services/supabaseFileService'
import { getFileType, getFileIcon, getAcceptedTypes, formatFileSize } from '../../utils/fileTypes'
import { getFileIconComponent } from '../../utils/FileIconComponent'

const FolderTree = ({ 
  folders, 
  files,
  selectedFolder, 
  onFolderSelect, 
  onFolderCreate, 
  onFolderUpdate, 
  onFolderDelete,
  onSubfolderCreate,
  onCurrentFolderChange,
  onFileUpdate,
  onFileDelete,
  onFileMove,
  onFileSelect,
  onFileUpload
}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showSubfolderForm, setShowSubfolderForm] = useState(null)
  const [newFolder, setNewFolder] = useState({ name: '', parent_id: null })
  const [newSubfolder, setNewSubfolder] = useState({ name: '', parent_id: null })
  const [showFileMenu, setShowFileMenu] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileMenuPosition, setFileMenuPosition] = useState({ x: 0, y: 0 })
  const [editingFolder, setEditingFolder] = useState(null)
  const [showFolderMenu, setShowFolderMenu] = useState(null)
  const [editFolder, setEditFolder] = useState({ name: '' })
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [currentFolderId, setCurrentFolderId] = useState(null) // null = root, number = folder ID
  const [folderPath, setFolderPath] = useState([]) // breadcrumb path
  const menuRef = useRef(null)
  
  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside folder menu
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowFolderMenu(null)
      }
      
      // Check if click is outside file menu (but not on file menu buttons)
      if (showFileMenu && !event.target.closest('.file-context-menu')) {
        setShowFileMenu(null)
        setSelectedFile(null)
      }
    }

    if (showFolderMenu || showFileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFolderMenu, showFileMenu])

  // Debug currentFolderId changes
  useEffect(() => {
    console.log('📁 [FOLDER_TREE] currentFolderId changed:', currentFolderId)
  }, [currentFolderId])

  // Debug folderPath changes
  useEffect(() => {
    console.log('📁 [FOLDER_TREE] folderPath changed:', folderPath)
  }, [folderPath])


  const handleCreateFolder = async (e) => {
    e.preventDefault()
    try {
      const response = await apiService.createFolder(newFolder)
      if (response.success) {
        onFolderCreate(response.folder)
        setNewFolder({ name: '', parent_id: null })
        setShowCreateForm(false)
      } else {
        alert('Failed to create folder: ' + response.error)
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Failed to create folder')
    }
  }

  const handleCreateSubfolder = async (e) => {
    e.preventDefault()
    try {
      const response = await apiService.createFolder(newSubfolder)
      if (response.success) {
        onFolderCreate(response.folder)
        setNewSubfolder({ name: '', parent_id: null })
        setShowSubfolderForm(null)
      } else {
        alert('Failed to create subfolder: ' + response.error)
      }
    } catch (error) {
      console.error('Error creating subfolder:', error)
      alert('Failed to create subfolder')
    }
  }

  const handleRenameFolder = async (e) => {
    e.preventDefault()
    try {
      const response = await apiService.updateFolder(editingFolder.id, {
        name: editFolder.name,
      })
      if (response.success) {
        onFolderUpdate(response.folder)
        setEditingFolder(null)
        setEditFolder({ name: '' })
      } else {
        alert('Failed to rename folder: ' + response.error)
      }
    } catch (error) {
      console.error('Error renaming folder:', error)
      alert('Failed to rename folder')
    }
  }

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Are you sure you want to delete this folder? This will also delete all files in the folder. This action cannot be undone.')) {
      return
    }

    try {
      const response = await apiService.deleteFolder(folderId)
      if (response.success) {
        onFolderDelete(folderId)
        setShowFolderMenu(null)
      } else {
        alert('Failed to delete folder: ' + response.error)
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    }
  }

  const handleFolderMenu = (e, folder) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Get the button's position
    const buttonRect = e.currentTarget.getBoundingClientRect()
    const containerRect = e.currentTarget.closest('.folder-tree-container')?.getBoundingClientRect()
    
    if (containerRect) {
      const menuWidth = 200 // min-w-48 = 12rem = 192px, using 200 for safety
      let x = buttonRect.right
      let y = buttonRect.top
      
      // Allow overflow - use fixed positioning relative to viewport
      // Only adjust if it would go off the viewport
      if (x + menuWidth > window.innerWidth) {
        x = buttonRect.left - menuWidth
      }
      if (y < 0) y = buttonRect.bottom
      
      setMenuPosition({ x, y })
    }
    
    setShowFolderMenu(folder.id)
  }

  const startRename = (folder) => {
    setEditingFolder(folder)
    setEditFolder({ name: folder.name })
    setShowFolderMenu(null)
  }

  const handleFolderClick = (folder) => {
    // Single click - select folder
    console.log('📁 [FOLDER_TREE] Single click on folder:', folder.id, folder.name)
    setCurrentFolderId(folder.id)
    // Add folder to path when clicking (single click)
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }])
    onFolderSelect(folder.id)
  }

  const handleFolderDoubleClick = (folder) => {
    // Double click - navigate into folder (like OS file managers)
    navigateToFolder(folder)
  }

  const navigateToFolder = (folder) => {
    console.log('📁 [FOLDER_TREE] Double click - navigating to folder:', folder.id, folder.name)
    setCurrentFolderId(folder.id)
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }])
    onFolderSelect(folder.id) // Also select the folder
    if (onCurrentFolderChange) {
      onCurrentFolderChange(folder.id)
    }
  }

  const navigateBack = () => {
    console.log('📁 [FOLDER_TREE] navigateBack called', { 
      folderPath, 
      currentFolderId,
      folderPathLength: folderPath.length,
      folderPathContents: folderPath.map(f => ({ id: f.id, name: f.name }))
    })
    
    if (folderPath.length > 0) {
      const newPath = [...folderPath]
      const removedFolder = newPath.pop() // Remove last folder
      console.log('📁 [FOLDER_TREE] Removed folder from path:', removedFolder)
      console.log('📁 [FOLDER_TREE] New path after pop:', newPath)
      
      setFolderPath(newPath)
      
      if (newPath.length === 0) {
        console.log('📁 [FOLDER_TREE] Navigating to root')
        setCurrentFolderId(null)
        console.log('📁 [FOLDER_TREE] Calling onFolderSelect(null)')
        onFolderSelect(null) // Select root
        if (onCurrentFolderChange) {
          console.log('📁 [FOLDER_TREE] Calling onCurrentFolderChange(null)')
          onCurrentFolderChange(null)
        }
      } else {
        const parentFolder = newPath[newPath.length - 1]
        console.log('📁 [FOLDER_TREE] Navigating to parent folder:', parentFolder)
        setCurrentFolderId(parentFolder.id)
        console.log('📁 [FOLDER_TREE] Calling onFolderSelect with parent folder ID:', parentFolder.id)
        onFolderSelect(parentFolder.id)
        if (onCurrentFolderChange) {
          console.log('📁 [FOLDER_TREE] Calling onCurrentFolderChange with parent folder ID:', parentFolder.id)
          onCurrentFolderChange(parentFolder.id)
        }
      }
    } else {
      console.log('📁 [FOLDER_TREE] Already at root, cannot go back')
    }
  }

  const navigateToRoot = () => {
    setCurrentFolderId(null)
    setFolderPath([])
    onFolderSelect(null) // Select root
    if (onCurrentFolderChange) {
      onCurrentFolderChange(null)
    }
  }

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  // File context menu functions
  const handleFileMenuClick = (e, file) => {
    e.preventDefault()
    e.stopPropagation()
    
    const rect = e.currentTarget.getBoundingClientRect()
    setFileMenuPosition({
      x: rect.right + 5,
      y: rect.top
    })
    setSelectedFile(file)
    setShowFileMenu(file.id)
  }

  const handleFileMenuClose = () => {
    setShowFileMenu(null)
    setSelectedFile(null)
  }

      const handleFileDownload = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('📁 [FOLDER_TREE] Download clicked for file:', selectedFile)
        console.log('📁 [FOLDER_TREE] Event:', e)
        console.log('📁 [FOLDER_TREE] Selected file ID:', selectedFile?.id)
        
        if (!selectedFile) {
          console.error('📁 [FOLDER_TREE] No file selected')
          alert('Error: No file selected')
          handleFileMenuClose()
          return
        }
        
        try {
          console.log('📁 [FOLDER_TREE] Starting download')
          
          let downloadUrl, fileName
          
          if (selectedFile.supabase_path) {
            // For Supabase files, get the signed URL first
            console.log('📁 [FOLDER_TREE] Getting signed URL for Supabase file')
            const response = await apiService.downloadFile(selectedFile.id)
            if (!response.success) {
              throw new Error(response.error || 'Failed to get download URL')
            }
            downloadUrl = response.downloadUrl
            fileName = response.fileName
            console.log('📁 [FOLDER_TREE] Got signed URL:', downloadUrl.substring(0, 50) + '...')
          } else {
            // For Cloudinary files, use the existing URL
            downloadUrl = selectedFile.cloudinary_url
            fileName = selectedFile.display_name || selectedFile.original_name
            console.log('📁 [FOLDER_TREE] Using Cloudinary URL:', downloadUrl.substring(0, 50) + '...')
          }
          
          // Fetch the actual file content from the URL
          console.log('📁 [FOLDER_TREE] Fetching file content from URL')
          const fileResponse = await fetch(downloadUrl)
          if (!fileResponse.ok) {
            throw new Error(`Download failed: ${fileResponse.status} ${fileResponse.statusText}`)
          }
          
          // Get the file blob
          const blob = await fileResponse.blob()
          console.log('📁 [FOLDER_TREE] File blob size:', blob.size, 'bytes')
          
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
          
          console.log('✅ [FOLDER_TREE] Download initiated successfully')
        } catch (error) {
          console.error('❌ [FOLDER_TREE] Download failed:', error)
          alert('Download failed: ' + error.message)
        }
        
        handleFileMenuClose()
      }

  const handleFileView = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('📁 [FOLDER_TREE] View clicked for file:', selectedFile)
    console.log('📁 [FOLDER_TREE] Event:', e)
    console.log('📁 [FOLDER_TREE] Selected file ID:', selectedFile?.id)
    
    if (!selectedFile) {
      console.error('📁 [FOLDER_TREE] No file selected')
      alert('Error: No file selected')
      handleFileMenuClose()
      return
    }
    
    // Pass the file to the parent component to show in FileViewer
    if (onFileSelect) {
      console.log('📁 [FOLDER_TREE] Calling onFileSelect with file:', selectedFile)
      onFileSelect(selectedFile)
    } else {
      console.error('📁 [FOLDER_TREE] onFileSelect function not provided')
      alert('Error: File preview not available')
    }
    
    handleFileMenuClose()
  }

  const handleFileMove = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('📁 [FOLDER_TREE] Move clicked for file:', selectedFile)
    
    if (!selectedFile) {
      console.error('📁 [FOLDER_TREE] No file selected')
      alert('Error: No file selected')
      handleFileMenuClose()
      return
    }
    
    if (onFileMove) {
      try {
        onFileMove(selectedFile)
        console.log('✅ [FOLDER_TREE] Move dialog opened successfully')
      } catch (error) {
        console.error('❌ [FOLDER_TREE] Move failed:', error)
        alert('Failed to open move dialog: ' + error.message)
      }
    } else {
      console.error('📁 [FOLDER_TREE] onFileMove prop not provided')
      alert('Error: Move functionality not available')
    }
    
    handleFileMenuClose()
  }

  const handleFileDelete = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('📁 [FOLDER_TREE] Delete clicked for file:', selectedFile)
    
    if (!selectedFile) {
      console.error('📁 [FOLDER_TREE] No file selected')
      alert('Error: No file selected')
      handleFileMenuClose()
      return
    }
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedFile.display_name}"?\n\nThis action cannot be undone.`
    )
    
    if (!confirmed) {
      console.log('📁 [FOLDER_TREE] Delete cancelled by user')
      handleFileMenuClose()
      return
    }
    
    if (onFileDelete) {
      try {
        onFileDelete(selectedFile)
        console.log('✅ [FOLDER_TREE] Delete initiated successfully')
      } catch (error) {
        console.error('❌ [FOLDER_TREE] Delete failed:', error)
        alert('Failed to delete file: ' + error.message)
      }
    } else {
      console.error('📁 [FOLDER_TREE] onFileDelete prop not provided')
      alert('Error: Delete functionality not available')
    }
    
    handleFileMenuClose()
  }

  const getRootFolders = () => {
    return folders.filter(folder => !folder.parent_id)
  }

  const getSubfolders = (parentId) => {
    return folders.filter(folder => folder.parent_id === parentId)
  }

  const renderFolder = (folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const subfolders = getSubfolders(folder.id)
    const hasSubfolders = subfolders.length > 0

    return (
      <div key={folder.id} className="select-none">
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm ${
            selectedFolder === folder.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleFolderClick(folder)}
          onDoubleClick={() => handleFolderDoubleClick(folder)}
          tabIndex={0}
        >
          {hasSubfolders ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(folder.id)
              }}
              className="mr-1 w-4 h-4 flex items-center justify-center"
            >
              <motion.svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </motion.svg>
            </button>
          ) : (
            <div className="w-4 h-4 mr-1" />
          )}
          
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          
          <span className="flex-1 truncate">{folder.name}</span>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => handleFolderMenu(e, folder)}
              className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
              title="Folder options"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && hasSubfolders && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {subfolders.map(subfolder => renderFolder(subfolder, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Upload functions
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const progress = ((i + 1) / files.length) * 100
        setUploadProgress(progress)

        // Validate file type (with fallback to extension-based detection)
        const fileType = getFileType(file.type, file.name)
        if (fileType === 'unknown') {
          alert(`File "${file.name}" is not a supported file type.`)
          continue
        }

        // Upload to Supabase
        const uploadResult = await supabaseFileService.uploadFile(file, currentFolderId)

        // Save file metadata to database
        const fileData = {
          display_name: file.name,
          original_name: file.name,
          file_type: fileType,
          file_size: file.size,
          supabase_path: uploadResult.path,
          supabase_bucket: uploadResult.bucket,
          content_type: uploadResult.contentType,
          folder_id: currentFolderId
        }

        const response = await apiService.uploadFile(fileData)
        if (response.success) {
          console.log('✅ File uploaded successfully:', response.file)
          if (onFileUpload) {
            onFileUpload(response.file)
          }
        } else {
          console.error('❌ Failed to save file metadata:', response.error)
          alert(`Failed to save file "${file.name}": ${response.error}`)
        }
      }
    } catch (error) {
      console.error('❌ Upload error:', error)
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Invisible drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // No visual feedback - completely invisible
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  return (
    <div 
      className="h-full flex flex-col bg-gray-50 border-r border-gray-200 folder-tree-container relative"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">Folders</h3>
        
        {/* Navigation Breadcrumbs */}
        {currentFolderId !== null && (
          <div className="mt-2 flex items-center space-x-1 text-xs">
            <button
              onClick={navigateToRoot}
              className="flex items-center px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
              title="Go to root"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Root
            </button>
            
            <span className="text-gray-400">/</span>
            <button
              onClick={navigateBack}
              className="flex items-center px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
              title="Go back"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            {folderPath.map((pathFolder, index) => (
              <React.Fragment key={pathFolder.id}>
                <span className="text-gray-400">/</span>
                <span className="px-2 py-1 text-gray-600">
                  {pathFolder.name}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {currentFolderId === null ? (
          // Root view - show all folders
          <>
            {/* Root folder */}
            <div
              className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm ${
                selectedFolder === null ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
              }`}
              onClick={() => {
                console.log('📁 [FOLDER_TREE] All Files clicked - selecting root')
                setCurrentFolderId(null)
                onFolderSelect(null)
              }}
            >
              <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="flex-1">All Files</span>
            </div>

            {/* Root folders */}
            {getRootFolders().map(folder => renderFolder(folder))}

            {/* Files in root */}
            {(() => {
              // Filter files for root (folder_id is null)
              const rootFiles = files ? files.filter(file => file.folder_id === null) : []
              
              console.log('📁 [FOLDER_TREE] Root files:', {
                allFiles: files?.length || 0,
                rootFiles: rootFiles.length
              })
              
              return rootFiles.length > 0 ? (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-600 mb-2 px-2">
                    Files ({rootFiles.length})
                  </div>
                  {rootFiles.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm text-gray-700 group"
                    >
                      <span className="mr-2">
                        {getFileIconComponent(file.file_type)}
                      </span>
                      <span className="flex-1 truncate" title={file.display_name}>
                        {file.display_name}
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => handleFileMenuClick(e, file)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                          title="File options"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-500 italic p-2">
                  No files in root
                </div>
              )
            })()}
          </>
        ) : (
          // Inside folder view - show only subfolders of current folder
          <>
            {(() => {
              const currentFolder = folders.find(f => f.id === currentFolderId)
              const subfolders = getSubfolders(currentFolderId)
              
              return (
                <>
                  {/* Current folder info */}
                  <div className="mb-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                    📁 {currentFolder?.name || 'Unknown Folder'}
                  </div>
                  
                  {/* Subfolders */}
                  {subfolders.length > 0 ? (
                    subfolders.map(folder => renderFolder(folder))
                  ) : (
                    <div className="text-sm text-gray-500 italic p-2">
                      No subfolders in this folder
                    </div>
                  )}

                  {/* Files in current folder */}
                  {(() => {
                    // Filter files for current folder
                    const currentFolderFiles = files ? files.filter(file => 
                      file.folder_id === currentFolderId || 
                      (file.folder_id === null && currentFolderId === null)
                    ) : []
                    
                    console.log('📁 [FOLDER_TREE] Current folder files:', {
                      currentFolderId,
                      allFiles: files?.length || 0,
                      filteredFiles: currentFolderFiles.length
                    })
                    
                    return currentFolderFiles.length > 0 ? (
                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-600 mb-2 px-2">
                          Files ({currentFolderFiles.length})
                        </div>
                        {currentFolderFiles.map(file => (
                          <div
                            key={file.id}
                            className="flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm text-gray-700 group"
                          >
                            <span className="mr-2">
                              {getFileIconComponent(file.file_type)}
                            </span>
                            <span className="flex-1 truncate" title={file.display_name}>
                              {file.display_name}
                            </span>
                            <div className="relative">
                              <button
                                onClick={(e) => handleFileMenuClick(e, file)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                                title="File options"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-gray-500 italic p-2">
                        No files in this folder
                      </div>
                    )
                  })()}
                </>
              )
            })()}
          </>
        )}
      </div>

      {/* Add Folder Button */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full flex items-center justify-center py-2 px-3 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Folder
        </button>
      </div>

      {/* Upload Button */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleUploadClick}
          disabled={uploading}
          className="w-full flex items-center justify-center py-2 px-3 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              Uploading... {Math.round(uploadProgress)}%
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Files
            </>
          )}
        </button>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptedTypes().join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        
        {/* Upload Progress Bar */}
        {uploading && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Create New Folder</h4>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter folder name"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Subfolder Modal */}
      {showSubfolderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Create Subfolder</h4>
            <form onSubmit={handleCreateSubfolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subfolder Name *
                </label>
                <input
                  type="text"
                  value={newSubfolder.name}
                  onChange={(e) => setNewSubfolder(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter subfolder name"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSubfolderForm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Create Subfolder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folder Context Menu */}
      <AnimatePresence>
        {showFolderMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-48"
            style={{
              top: `${menuPosition.y}px`,
              left: `${menuPosition.x}px`
            }}
          >
            <button
              onClick={() => {
                const folder = folders.find(f => f.id === showFolderMenu)
                if (folder) {
                  setNewSubfolder({ name: '', description: '', parent_id: folder.id })
                  setShowSubfolderForm(folder.id)
                }
                setShowFolderMenu(null)
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Subfolder
            </button>
            
            <button
              onClick={() => {
                const folder = folders.find(f => f.id === showFolderMenu)
                if (folder) startRename(folder)
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename
            </button>
            
            <div className="border-t border-gray-200 my-1" />
            
            <button
              onClick={() => handleDeleteFolder(showFolderMenu)}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Rename Folder</h4>
            <form onSubmit={handleRenameFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={editFolder.name}
                  onChange={(e) => setEditFolder(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter folder name"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFolder(null)
                    setEditFolder({ name: '' })
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Context Menu Portal */}
      {showFileMenu && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[99998]" 
            onClick={handleFileMenuClose}
          />
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[99999] py-1 min-w-[120px] file-context-menu"
            style={{
              left: fileMenuPosition.x,
              top: fileMenuPosition.y
            }}
          >
            <button
              onClick={handleFileView}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </button>
            
            <button
              onClick={handleFileDownload}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
            
            <div className="border-t border-gray-200 my-1" />
            
            <button
              onClick={handleFileMove}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Move
            </button>
            
            <button
              onClick={handleFileDelete}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

    </div>
  )
}

export default FolderTree
