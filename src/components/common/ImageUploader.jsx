import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'

const ImageUploader = ({ 
  onUpload, 
  onError, 
  folder = 'lang-school',
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  transformations = null,
  className = '',
  showUploadArea = true,
  uploadedImageUrl = null
}) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (file) => {
    if (!file) return

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      onError?.('Invalid file type. Please select a JPEG, PNG, or WebP image.')
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      onError?.(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    // Upload file
    try {
      setUploading(true)
      
      // Convert file to base64
      const base64 = await fileToBase64(file)
      
      const response = await apiService.uploadImage({
        image: base64,
        folder,
        transformations
      })

      if (response.success) {
        // Cloudinary returns data directly in response, not in response.data
        const imageData = response.secure_url || response.data
        onUpload?.(imageData)
        setPreview(null)
      } else {
        onError?.(response.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      onError?.('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Show uploaded image if available */}
      {uploadedImageUrl && (
        <div className="mb-4 flex justify-center">
          <img
            src={uploadedImageUrl}
            alt="Uploaded teacher photo"
            className="w-32 h-32 object-cover rounded-lg shadow-md"
          />
        </div>
      )}

      {/* Show upload area only if showUploadArea is true */}
      {showUploadArea && (
        <motion.div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
            ${dragActive 
              ? 'border-primary-500 bg-primary-50' 
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : preview ? (
            <div className="space-y-2">
              <img
                src={preview}
                alt="Preview"
                className="max-h-32 mx-auto rounded-lg"
              />
              <p className="text-sm text-gray-600">Processing...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WebP up to {Math.round(maxSize / 1024 / 1024)}MB
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default ImageUploader
