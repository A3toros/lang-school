import React, { useState } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'

const FolderManager = ({ folders, onFolderCreate, onFolderUpdate, onFolderDelete }) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)
  const [newFolder, setNewFolder] = useState({
    name: '',
    description: '',
    display_order: 0
  })

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    try {
      const response = await apiService.createFolder(newFolder)
      if (response.success) {
        onFolderCreate(response.folder)
        setNewFolder({ name: '', description: '', display_order: 0 })
        setShowCreateForm(false)
      } else {
        alert('Failed to create folder: ' + response.error)
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Failed to create folder')
    }
  }

  const handleUpdateFolder = async (e) => {
    e.preventDefault()
    try {
      const response = await apiService.updateFolder(editingFolder.id, editingFolder)
      if (response.success) {
        onFolderUpdate(response.folder)
        setEditingFolder(null)
      } else {
        alert('Failed to update folder: ' + response.error)
      }
    } catch (error) {
      console.error('Error updating folder:', error)
      alert('Failed to update folder')
    }
  }

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      return
    }

    try {
      const response = await apiService.deleteFolder(folderId)
      if (response.success) {
        onFolderDelete(folderId)
      } else {
        alert('Failed to delete folder: ' + response.error)
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Manage Folders</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200"
        >
          Create Folder
        </button>
      </div>

      {/* Create Folder Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-lg p-6"
        >
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={newFolder.description}
                onChange={(e) => setNewFolder(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter folder description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={newFolder.display_order}
                onChange={(e) => setNewFolder(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200"
              >
                Create Folder
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewFolder({ name: '', description: '', display_order: 0 })
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Edit Folder Form */}
      {editingFolder && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-lg p-6"
        >
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Edit Folder</h4>
          <form onSubmit={handleUpdateFolder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name *
              </label>
              <input
                type="text"
                value={editingFolder.name}
                onChange={(e) => setEditingFolder(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editingFolder.description}
                onChange={(e) => setEditingFolder(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={editingFolder.display_order}
                onChange={(e) => setEditingFolder(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200"
              >
                Update Folder
              </button>
              <button
                type="button"
                onClick={() => setEditingFolder(null)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Folders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map(folder => (
          <motion.div
            key={folder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-gray-800">{folder.name}</h4>
              <div className="flex space-x-1">
                <button
                  onClick={() => setEditingFolder(folder)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  title="Edit folder"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                  title="Delete folder"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            {folder.description && (
              <p className="text-sm text-gray-600 mb-2">{folder.description}</p>
            )}
            <div className="text-xs text-gray-500">
              <p>Order: {folder.display_order}</p>
              <p>Created: {new Date(folder.created_at).toLocaleDateString()}</p>
              <p>By: {folder.created_by_name || 'Unknown'}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {folders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No folders created yet.</p>
          <p className="text-sm">Click "Create Folder" to get started.</p>
        </div>
      )}
    </div>
  )
}

export default FolderManager
