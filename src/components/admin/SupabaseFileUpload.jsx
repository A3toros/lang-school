import React, { useState } from 'react'
import Modal from '../common/Modal'
import supabaseFileService from '../../services/supabaseFileService'
import apiService from '../../utils/api'

function SupabaseFileUpload({ onFileUpload, currentFolderId, isOpen, onClose }) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  
  const handleFileSelect = (files) => {
    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)
  }
  
  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return
    
    setUploading(true)
    setUploadProgress(0)
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const progress = ((i + 1) / selectedFiles.length) * 100
        setUploadProgress(progress)

        // Upload to Supabase
        const uploadResult = await supabaseFileService.uploadFile(file, currentFolderId)
        
        // Save metadata to database
        const fileData = {
          display_name: file.name,
          original_name: file.name,
          file_type: file.type,
          file_size: file.size,
          supabase_path: uploadResult.path,
          supabase_bucket: uploadResult.bucket,
          content_type: uploadResult.contentType,
          folder_id: currentFolderId
        }
        
        const response = await apiService.uploadFile(fileData)
        if (response.success) {
          onFileUpload(response.file)
        } else {
          console.error('Failed to save file metadata:', response.error)
          alert(`Failed to save file "${file.name}": ${response.error}`)
        }
      }
      
      // Reset form
      setSelectedFiles([])
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
      alert(`Upload failed: ${error.message}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }
  
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleDragIn = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }
  
  const handleDragOut = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }
  
  return (
    <Modal 
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Files to Supabase"
      size="lg"
    >
      <div className="space-y-4">
        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Drop files here or click to select
              </span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
        
        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Selected Files:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                  <span className="truncate">{file.name}</span>
                  <span className="text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading files...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleFileUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default SupabaseFileUpload
