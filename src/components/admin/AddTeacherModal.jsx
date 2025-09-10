import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Modal from '../common/Modal'
import ImageUploader from '../common/ImageUploader'
import apiService from '../../utils/api'

const AddTeacherModal = ({ 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    description: '',
    photo_url: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await apiService.createTeacher(formData)

      if (response.success) {
        onSave?.(response.teacher || response.data)
        onClose()
        // Reset form
        setFormData({
          name: '',
          email: '',
          username: '',
          password: '',
          description: '',
          photo_url: ''
        })
      } else {
        setError(response.error || 'Failed to create teacher')
      }
    } catch (error) {
      console.error('Error creating teacher:', error)
      setError('Failed to create teacher')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = async (imageData) => {
    try {
      setUploadingImage(true)
      setFormData(prev => ({
        ...prev,
        photo_url: imageData.secure_url
      }))
    } catch (error) {
      console.error('Error uploading image:', error)
      setError('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageError = (error) => {
    setError(error)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Teacher"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
              Teacher Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Teacher Photo
          </label>
          <ImageUploader
            onUpload={handleImageUpload}
            onError={handleImageError}
            folder="lang-school/teachers"
            className="w-full"
            uploadedImageUrl={formData.photo_url}
            showUploadArea={!formData.photo_url}
          />
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || uploadingImage}
            className="flex-1 px-4 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={loading || uploadingImage}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </div>
            ) : (
              'Create Teacher'
            )}
          </motion.button>
        </div>
      </form>
    </Modal>
  )
}

export default AddTeacherModal
