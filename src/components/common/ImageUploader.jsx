import React, { useState, useRef, useEffect } from 'react'
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
  const [uploadedImage, setUploadedImage] = useState(uploadedImageUrl)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef(null)

  // Update uploadedImage when prop changes
  useEffect(() => {
    setUploadedImage(uploadedImageUrl)
  }, [uploadedImageUrl])

  // Also update when uploadedImageUrl changes directly
  useEffect(() => {
    if (uploadedImageUrl !== uploadedImage) {
      setUploadedImage(uploadedImageUrl)
    }
  }, [uploadedImageUrl, uploadedImage])

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
      
      const response = await apiService.uploadImage(base64, folder, null, transformations)

      if (response.success) {
        // Cloudinary returns data directly in response, not in response.data
        const imageData = response.secure_url || response.data
        const publicId = response.public_id
        setUploadedImage(imageData)
        onUpload?.(imageData, publicId)
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

  const extractPublicIdFromUrl = (url) => {
    if (!url) return null
    try {
      const parts = url.split('/')
      const publicIdWithExtension = parts[parts.length - 1]
      const publicId = publicIdWithExtension.split('.')[0]
      return publicId
    } catch (error) {
      console.error('Error extracting public ID from URL:', error)
      return null
    }
  }

  const handleDelete = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!uploadedImage) {
      onError?.('No image to delete')
      return
    }

    if (!window.confirm('Are you sure you want to delete this image?')) {
      return
    }

    setDeleting(true)

    try {
      // Extract public ID from the stored URL and delete from Cloudinary
      const publicId = extractPublicIdFromUrl(uploadedImage)
      if (publicId) {
        const response = await apiService.deleteImage(publicId)
        
        if (!response.success) {
          onError?.(response.error || 'Failed to delete image from Cloudinary')
          return
        }
      }

      // Clear the uploaded image state
      setUploadedImage(null)
      // Notify parent component
      onUpload?.('') // Clear the image URL
      alert('Image deleted successfully!')
    } catch (error) {
      console.error('Delete error:', error)
      onError?.('Failed to delete image. Please try again.')
    } finally {
      setDeleting(false)
    }
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
      {uploadedImage && uploadedImage !== '' && uploadedImage !== null && uploadedImage !== undefined && uploadedImage.startsWith('http') && (
        <div className="mb-4 flex justify-center">
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Course background image"
              className="w-full h-64 object-cover rounded-lg shadow-md"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Show upload area if showUploadArea is true and no image is uploaded */}
      {showUploadArea && (!uploadedImage || uploadedImage === '' || uploadedImage === null || uploadedImage === undefined || (uploadedImage && !uploadedImage.startsWith('http'))) && (
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