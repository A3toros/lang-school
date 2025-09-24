import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'
import ImageUploader from '../common/ImageUploader'
import TeacherShowcase from '../login/TeacherShowcase'
import SuccessNotification from '../common/SuccessNotification'

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('mission')
  const [missionContent, setMissionContent] = useState({
    title: '',
    content: '',
    banner_image: '',
    banner_image_public_id: ''
  })
  const [courses, setCourses] = useState([])
  const [showcaseSettings, setShowcaseSettings] = useState({
    display_count: 3,
    rotation_type: 'random'
  })
  const [teachers, setTeachers] = useState([])
  const [selectedTeachers, setSelectedTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    detailed_description: '',
    background_image: '',
    background_image_public_id: '',
    display_order: 0
  })
  const [isSavingMission, setIsSavingMission] = useState(false)
  const [isSavingCourse, setIsSavingCourse] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'success' })

  useEffect(() => {
    fetchContent()
  }, [])

  // Helper function to show notifications
  const showNotificationMessage = (title, message, type = 'success') => {
    setNotificationData({ title, message, type })
    setShowNotification(true)
  }

  const fetchContent = async () => {
    try {
      setLoading(true)
      const [missionResponse, coursesResponse, showcaseResponse, teachersResponse] = await Promise.all([
        apiService.getMissionContent(),
        apiService.getCourses(),
        apiService.getShowcaseSettings(),
        apiService.getTeachers()
      ])

      if (missionResponse.success) {
        setMissionContent(missionResponse.mission)
      }
      if (coursesResponse.success) {
        setCourses(coursesResponse.courses)
      }
      if (showcaseResponse.success) {
        setShowcaseSettings(showcaseResponse.settings)
      }
      if (teachersResponse.success) {
        setTeachers(teachersResponse.teachers)
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMission = async () => {
    try {
      setIsSavingMission(true)
      const response = await apiService.updateMissionContent(missionContent)
      if (response.success) {
        showNotificationMessage('Success!', 'Mission content saved successfully', 'success')
      }
    } catch (error) {
      console.error('Error saving mission content:', error)
      showNotificationMessage('Error', 'Failed to save mission content', 'error')
    } finally {
      setIsSavingMission(false)
    }
  }

  const handleSaveShowcase = async () => {
    try {
      console.log('Saving showcase settings:', showcaseSettings)
      console.log('Selected teachers:', selectedTeachers)
      
      // Save showcase settings
      const response = await apiService.updateShowcaseSettings(showcaseSettings)
      console.log('Showcase settings response:', response)
      
      if (response.success) {
        // If rotation type is "featured", also save the selected teachers
        if (showcaseSettings.rotation_type === 'featured') {
          if (selectedTeachers.length > 0) {
            console.log('Saving featured teachers:', selectedTeachers)
            try {
              const featuredResponse = await apiService.setFeaturedTeachers(selectedTeachers)
              console.log('Featured teachers response:', featuredResponse)
              
              if (featuredResponse && featuredResponse.success) {
                alert('Showcase settings and featured teachers saved successfully')
              } else {
                console.error('Featured teachers API failed:', featuredResponse)
                alert(`Showcase settings saved, but failed to save featured teachers: ${featuredResponse?.error || 'Unknown error'}`)
              }
            } catch (featuredError) {
              console.error('Featured teachers API error:', featuredError)
              alert(`Showcase settings saved, but failed to save featured teachers: ${featuredError.message}`)
            }
          } else {
            alert('Please select at least one teacher for featured teachers mode')
            return
          }
        } else {
          alert('Showcase settings saved successfully')
        }
      } else {
        alert('Failed to save showcase settings')
      }
    } catch (error) {
      console.error('Error saving showcase settings:', error)
      alert('Failed to save showcase settings')
    }
  }

  const handleMissionImageChange = (imageUrl, publicId) => {
    setMissionContent(prev => ({
      ...prev,
      banner_image: imageUrl,
      banner_image_public_id: publicId
    }))
  }

  const handleMissionImageDelete = () => {
    setMissionContent(prev => ({
      ...prev,
      banner_image: '',
      banner_image_public_id: ''
    }))
  }

  const handleCourseImageChange = (imageUrl, publicId) => {
    if (editingCourse) {
      setEditingCourse(prev => ({
        ...prev,
        background_image: imageUrl,
        background_image_public_id: publicId
      }))
    } else {
      setNewCourse(prev => ({
        ...prev,
        background_image: imageUrl,
        background_image_public_id: publicId
      }))
    }
  }

  const handleCourseImageDelete = () => {
    if (editingCourse) {
      setEditingCourse(prev => ({
        ...prev,
        background_image: '',
        background_image_public_id: ''
      }))
    } else {
      setNewCourse(prev => ({
        ...prev,
        background_image: '',
        background_image_public_id: ''
      }))
    }
  }

  const handleAddCourse = async () => {
    try {
      if (!newCourse.name || !newCourse.description) {
        alert('Please fill in required fields')
        return
      }

      setIsSavingCourse(true)

      const response = await apiService.createCourse(newCourse)
      if (response.success) {
        setNewCourse({
          name: '',
          description: '',
          detailed_description: '',
          background_image: '',
          background_image_public_id: '',
          display_order: courses.length + 1
        })
        setShowCourseModal(false)
        fetchContent()
        showNotificationMessage('Success!', 'Course added successfully', 'success')
      }
    } catch (error) {
      console.error('Error adding course:', error)
      showNotificationMessage('Error', 'Failed to add course', 'error')
    } finally {
      setIsSavingCourse(false)
    }
  }

  const handleEditCourse = async () => {
    try {
      if (!editingCourse.name || !editingCourse.description) {
        alert('Please fill in required fields')
        return
      }

      setIsSavingCourse(true)

      const response = await apiService.updateCourse(editingCourse.id, editingCourse)
      if (response.success) {
        setEditingCourse(null)
        setShowCourseModal(false)
        fetchContent()
        showNotificationMessage('Success!', 'Course updated successfully', 'success')
      }
    } catch (error) {
      console.error('Error updating course:', error)
      showNotificationMessage('Error', 'Failed to update course', 'error')
    } finally {
      setIsSavingCourse(false)
    }
  }

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        const response = await apiService.deleteCourse(courseId)
        if (response.success) {
          fetchContent()
          showNotificationMessage('Success!', 'Course deleted successfully', 'success')
        }
      } catch (error) {
        console.error('Error deleting course:', error)
        showNotificationMessage('Error', 'Failed to delete course', 'error')
      }
    }
  }

  const handleToggleCourse = async (courseId, isActive) => {
    try {
      const response = await apiService.toggleCourse(courseId, isActive)
      if (response.success) {
        fetchContent()
      }
    } catch (error) {
      console.error('Error toggling course:', error)
      showNotificationMessage('Error', 'Failed to toggle course', 'error')
    }
  }

  const openEditCourse = (course) => {
    setEditingCourse({ ...course })
    setShowCourseModal(true)
  }

  const openAddCourse = () => {
    setEditingCourse(null)
    setNewCourse({
      name: '',
      description: '',
      detailed_description: '',
      background_image: '',
      background_image_public_id: '',
      display_order: courses.length + 1
    })
    setShowCourseModal(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Content Management</h2>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 overflow-x-auto">
        {[
          { id: 'mission', label: 'Mission Content' },
          { id: 'courses', label: 'Courses' },
          { id: 'showcase', label: 'Teacher Showcase' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mission Content Tab */}
      {activeTab === 'mission' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mission Title
            </label>
            <input
              type="text"
              value={missionContent.title}
              onChange={(e) => setMissionContent(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mission Content
            </label>
            <textarea
              value={missionContent.content}
              onChange={(e) => setMissionContent(prev => ({ ...prev, content: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image
            </label>
            <ImageUploader
              onUpload={(url, publicId) => {
                console.log('🖼️ [CONTENT] Image upload callback', { url, publicId, currentBanner: missionContent.banner_image })
                handleMissionImageChange(url, publicId)
                // Save to database immediately after upload
                if (url) {
                  const updatedContent = { ...missionContent, banner_image: url, banner_image_public_id: publicId }
                  console.log('💾 [CONTENT] Updating mission content with new image', updatedContent)
                  apiService.updateMissionContent(updatedContent).then((response) => {
                    console.log('✅ [CONTENT] Mission content updated successfully', response)
                    // Update local state instead of full refresh
                    setMissionContent(updatedContent)
                  }).catch(error => {
                    console.error('❌ [CONTENT] Error updating mission content:', error)
                    alert('Failed to save image')
                  })
                } else {
                  // Handle delete - clear the image
                  const updatedContent = { ...missionContent, banner_image: '', banner_image_public_id: null }
                  console.log('🗑️ [CONTENT] Clearing mission image', updatedContent)
                  apiService.updateMissionContent(updatedContent).then(() => {
                    // Update local state instead of full refresh
                    setMissionContent(updatedContent)
                  }).catch(error => {
                    console.error('Error deleting image:', error)
                    alert('Failed to delete image')
                  })
                }
              }}
              onError={(error) => console.error('Mission image error:', error)}
              folder="lang-school/banners"
              transformations={[{ width: 1200, height: 400, crop: 'fill' }]}
              uploadedImageUrl={missionContent.banner_image}
              showUploadArea={true}
              className="mb-4"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveMission}
            disabled={isSavingMission}
            className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 sm:py-2 rounded-lg transition-colors duration-200 text-sm sm:text-base flex items-center justify-center min-w-[180px]"
          >
            {isSavingMission ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Mission Content'
            )}
          </button>
        </motion.div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
            <h3 className="text-base sm:text-lg font-semibold">Course Management</h3>
            <button
              type="button"
              onClick={openAddCourse}
              disabled={isSavingCourse}
              className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm sm:text-base"
            >
              Add New Course
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <motion.div
                key={course.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                whileHover={{ scale: 1.02 }}
              >
                <div className="aspect-video bg-gray-200 rounded-lg mb-3 overflow-hidden">
                  {course.background_image && course.background_image.startsWith('http') ? (
                    <img
                      src={course.background_image}
                      alt={course.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{course.name}</h4>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    course.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {course.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => openEditCourse(course)}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCourse(course.id, !course.is_active)}
                      className={`text-xs px-2 py-1 rounded hover:bg-gray-50 ${
                        course.is_active 
                          ? 'text-red-600 hover:text-red-800' 
                          : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {course.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(course.id)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Teacher Showcase Tab */}
      {activeTab === 'showcase' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Teachers to Display
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={showcaseSettings.display_count}
              onChange={(e) => setShowcaseSettings(prev => ({ ...prev, display_count: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rotation Type
            </label>
            <select
              value={showcaseSettings.rotation_type}
              onChange={(e) => setShowcaseSettings(prev => ({ ...prev, rotation_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="random">Random Selection</option>
              <option value="featured">Featured Teachers Only</option>
              <option value="alphabetical">Alphabetical Order</option>
            </select>
          </div>
          
          {/* Teacher Selection - Only show when "Featured Teachers Only" is selected */}
          {showcaseSettings.rotation_type === 'featured' && (
            <div className="mt-8">
              <TeacherShowcase
                teachers={teachers}
                showSelection={true}
                selectedTeachers={selectedTeachers}
                onSelectionChange={setSelectedTeachers}
                title="Select Featured Teachers"
                subtitle="Choose which teachers to feature on the login page"
                displayCount={showcaseSettings.display_count}
              />
            </div>
          )}
          
          <button
            type="button"
            onClick={handleSaveShowcase}
            className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-white px-4 sm:px-6 py-2 rounded-lg transition-colors duration-200 text-sm sm:text-base"
          >
            Save Showcase Settings
          </button>
        </motion.div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4">
              {editingCourse ? 'Edit Course' : 'Add New Course'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Course Name *"
                value={editingCourse ? editingCourse.name : newCourse.name}
                onChange={(e) => {
                  if (editingCourse) {
                    setEditingCourse(prev => ({ ...prev, name: e.target.value }))
                  } else {
                    setNewCourse(prev => ({ ...prev, name: e.target.value }))
                  }
                }}
                disabled={isSavingCourse}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <textarea
                placeholder="Short Description *"
                value={editingCourse ? editingCourse.description : newCourse.description}
                onChange={(e) => {
                  if (editingCourse) {
                    setEditingCourse(prev => ({ ...prev, description: e.target.value }))
                  } else {
                    setNewCourse(prev => ({ ...prev, description: e.target.value }))
                  }
                }}
                rows={3}
                disabled={isSavingCourse}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <textarea
                placeholder="Detailed Description (for popup)"
                value={editingCourse ? editingCourse.detailed_description : newCourse.detailed_description}
                onChange={(e) => {
                  if (editingCourse) {
                    setEditingCourse(prev => ({ ...prev, detailed_description: e.target.value }))
                  } else {
                    setNewCourse(prev => ({ ...prev, detailed_description: e.target.value }))
                  }
                }}
                rows={4}
                disabled={isSavingCourse}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Image
                </label>
                <div className={isSavingCourse ? 'pointer-events-none opacity-50' : ''}>
                  <ImageUploader
                    onUpload={(imageUrl, publicId) => handleCourseImageChange(imageUrl, publicId)}
                    onError={(error) => console.error('Course image error:', error)}
                    folder="lang-school/courses"
                    transformations={[{ width: 800, height: 600, crop: 'fill' }]}
                    uploadedImageUrl={editingCourse ? editingCourse.background_image : newCourse.background_image}
                    showUploadArea={true}
                  />
                </div>
              </div>
              <input
                type="number"
                placeholder="Display Order"
                value={editingCourse ? editingCourse.display_order : newCourse.display_order}
                onChange={(e) => {
                  if (editingCourse) {
                    setEditingCourse(prev => ({ ...prev, display_order: parseInt(e.target.value) }))
                  } else {
                    setNewCourse(prev => ({ ...prev, display_order: parseInt(e.target.value) }))
                  }
                }}
                disabled={isSavingCourse}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={() => setShowCourseModal(false)}
                disabled={isSavingCourse}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editingCourse ? handleEditCourse : handleAddCourse}
                disabled={isSavingCourse || !(editingCourse ? editingCourse.name : newCourse.name)?.trim() || !(editingCourse ? editingCourse.description : newCourse.description)?.trim()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center min-w-[140px]"
              >
                {isSavingCourse ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingCourse ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingCourse ? 'Update Course' : 'Add Course'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Notification */}
      <SuccessNotification
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        title={notificationData.title}
        message={notificationData.message}
        type={notificationData.type}
      />
    </div>
  )
}

export default ContentManagement
