import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'

const FileContextMenu = ({ 
  file, 
  folders, 
  onFileMove, 
  onFileDelete, 
  onFileDownload,
  onClose 
}) => {
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState(file.folder_id)

  const handleMove = async () => {
    try {
      const response = await apiService.updateFile(file.id, {
        folder_id: selectedFolderId
      })
      
      if (response.success) {
        onFileMove(response.file)
        setShowMoveDialog(false)
        onClose()
      } else {
        alert('Failed to move file: ' + response.error)
      }
    } catch (error) {
      console.error('Error moving file:', error)
      alert('Failed to move file')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return
    }

    try {
      const response = await apiService.deleteFile(file.id)
      if (response.success) {
        onFileDelete(file.id)
        
        // If there's a Cloudinary public ID, delete from Cloudinary too
        if (response.cloudinary_public_id) {
          try {
            await apiService.deleteImage(response.cloudinary_public_id)
          } catch (cloudinaryError) {
            console.warn('Failed to delete from Cloudinary:', cloudinaryError)
          }
        }
        
        onClose()
      } else {
        alert('Failed to delete file: ' + response.error)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file')
    }
  }

  const handleDownload = () => {
    onFileDownload(file)
    onClose()
  }

  const getRootFolders = () => {
    return folders.filter(folder => !folder.parent_id)
  }

  const getSubfolders = (parentId) => {
    return folders.filter(folder => folder.parent_id === parentId)
  }

  const renderFolderOption = (folder, level = 0) => {
    const subfolders = getSubfolders(folder.id)
    const hasSubfolders = subfolders.length > 0

    return (
      <div key={folder.id}>
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm ${
            selectedFolderId === folder.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="flex-1 truncate">{folder.name}</span>
        </div>
        {hasSubfolders && subfolders.map(subfolder => renderFolderOption(subfolder, level + 1))}
      </div>
    )
  }

  return (
    <>
      {/* Context Menu */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute right-0 top-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-48"
      >
        <button
          onClick={handleDownload}
          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download
        </button>
        
        <button
          onClick={() => setShowMoveDialog(true)}
          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Move to Folder
        </button>
        
        <div className="border-t border-gray-200 my-1" />
        
        <button
          onClick={handleDelete}
          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </motion.div>

      {/* Move Dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Move File</h4>
            <p className="text-sm text-gray-600 mb-4">Select destination folder for "{file.display_name}"</p>
            
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-4">
              {/* Root folder option */}
              <div 
                className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm ${
                  selectedFolderId === null ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                }`}
                onClick={() => setSelectedFolderId(null)}
              >
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="flex-1">All Files (Root)</span>
              </div>
              
              {/* Folder options */}
              {getRootFolders().map(folder => renderFolderOption(folder))}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowMoveDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Move File
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default FileContextMenu
