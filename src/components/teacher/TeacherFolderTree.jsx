import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TeacherFolderTree = ({ 
  folders, 
  selectedFolder, 
  onFolderSelect 
}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set())

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
          className={`flex items-center py-2 px-3 sm:py-1 sm:px-2 hover:bg-gray-100 rounded cursor-pointer text-base sm:text-sm ${
            selectedFolder === folder.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onFolderSelect(folder.id)}
        >
          {hasSubfolders ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(folder.id)
              }}
              className="mr-1 w-5 h-5 sm:w-4 sm:h-4 flex items-center justify-center"
            >
              <motion.svg
                className="w-4 h-4 sm:w-3 sm:h-3"
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
            <div className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />
          )}
          
          <svg className="w-5 h-5 sm:w-4 sm:h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          
          <span className="flex-1 truncate">{folder.name}</span>
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

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">File Library</h3>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Root folder */}
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm ${
            selectedFolder === null ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          }`}
          onClick={() => onFolderSelect(null)}
        >
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="flex-1">All Files</span>
        </div>

        {/* Root folders */}
        {getRootFolders().map(folder => renderFolder(folder))}
      </div>
    </div>
  )
}

export default TeacherFolderTree
