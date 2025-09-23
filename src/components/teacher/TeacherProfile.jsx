import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Button from '../common/Button'
import Input from '../common/Input'
import ImageUploader from '../common/ImageUploader'
import ImagePreview from '../common/ImagePreview'
import apiService from '../../utils/api'
import { useAuth } from '../../context/AuthContext'

const TeacherProfile = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    photo_url: ''
  })

  useEffect(() => {
    if (user?.teacherId) {
      fetchProfile()
    }
  }, [user?.teacherId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await apiService.getTeacher(user.teacherId)
      
      if (response.success) {
        setProfile(response.teacher)
        setFormData({
          name: response.teacher.name || '',
          email: response.teacher.email || '',
          description: response.teacher.description || '',
          photo_url: response.teacher.photo_url || ''
        })
      } else {
        setError(response.error || 'Failed to fetch profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await apiService.updateTeacher(user.teacherId, formData)
      
      if (response.success) {
        setProfile(response.teacher)
        setEditMode(false)
        setSuccess('Profile updated successfully')
      } else {
        setError(response.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
    } finally {
      setSaving(false)
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
    setFormData(prev => ({
      ...prev,
      photo_url: imageData.secure_url
    }))
  }

  const handleImageError = (error) => {
    setError(error)
  }

  const handleImageDelete = () => {
    setFormData(prev => ({
      ...prev,
      photo_url: ''
    }))
  }

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      email: profile?.email || '',
      description: profile?.description || '',
      photo_url: profile?.photo_url || ''
    })
    setEditMode(false)
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-600">Loading profile...</span>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-neutral-500">
        Profile not found
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-800">My Profile</h2>
          {!editMode && (
            <Button
              onClick={() => setEditMode(true)}
              variant="outline"
              size="sm"
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4"
          >
            {success}
          </motion.div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Photo Section */}
          <div className="text-center">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Profile Photo
            </label>
            
            {formData.photo_url ? (
              <div className="space-y-4">
                <ImagePreview
                  src={formData.photo_url}
                  alt="Profile photo"
                  className="w-32 h-32 mx-auto"
                  showDelete={editMode}
                  onDelete={handleImageDelete}
                />
                {editMode && (
                  <div>
                    <p className="text-sm text-neutral-600 mb-2">Upload new photo:</p>
                    <ImageUploader
                      onUpload={handleImageUpload}
                      onError={handleImageError}
                      folder="lang-school/teachers"
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              editMode && (
                <ImageUploader
                  onUpload={handleImageUpload}
                  onError={handleImageError}
                  folder="lang-school/teachers"
                  className="w-full"
                />
              )
            )}

            {!editMode && !formData.photo_url && (
              <div className="w-32 h-32 bg-neutral-200 rounded-full mx-auto flex items-center justify-center">
                <span className="text-neutral-500 text-4xl">👤</span>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={!editMode}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={!editMode}
            />
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
              rows={4}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={!editMode}
            />
          </div>

          {/* Action Buttons */}
          {editMode && (
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                loading={saving}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>
    </motion.div>
  )
}

export default TeacherProfile
