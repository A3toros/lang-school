import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'

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

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      setLoading(true)
      const [missionResponse, coursesResponse, showcaseResponse] = await Promise.all([
        apiService.getMissionContent(),
        apiService.getCourses(),
        apiService.getShowcaseSettings()
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
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMission = async () => {
    try {
      const response = await apiService.updateMissionContent(missionContent)
      if (response.success) {
        alert('Mission content saved successfully')
      }
    } catch (error) {
      console.error('Error saving mission content:', error)
      alert('Failed to save mission content')
    }
  }

  const handleSaveShowcase = async () => {
    try {
      const response = await apiService.updateShowcaseSettings(showcaseSettings)
      if (response.success) {
        alert('Showcase settings saved successfully')
      }
    } catch (error) {
      console.error('Error saving showcase settings:', error)
      alert('Failed to save showcase settings')
    }
  }

  const handleAddCourse = async () => {
    try {
      if (!newCourse.name || !newCourse.description) {
        alert('Please fill in required fields')
        return
      }

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
        alert('Course added successfully')
      }
    } catch (error) {
      console.error('Error adding course:', error)
      alert('Failed to add course')
    }
  }

  const handleEditCourse = async () => {
    try {
      if (!editingCourse.name || !editingCourse.description) {
        alert('Please fill in required fields')
        return
      }

      const response = await apiService.updateCourse(editingCourse.id, editingCourse)
      if (response.success) {
        setEditingCourse(null)
        setShowCourseModal(false)
        fetchContent()
        alert('Course updated successfully')
      }
    } catch (error) {
      console.error('Error updating course:', error)
      alert('Failed to update course')
    }
  }

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        const response = await apiService.deleteCourse(courseId)
        if (response.success) {
          fetchContent()
          alert('Course deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting course:', error)
        alert('Failed to delete course')
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
      alert('Failed to toggle course')
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Content Management</h2>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { id: 'mission', label: 'Mission Content' },
          { id: 'courses', label: 'Courses' },
          { id: 'showcase', label: 'Teacher Showcase' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
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
              Banner Image URL
            </label>
            <input
              type="url"
              value={missionContent.banner_image}
              onChange={(e) => setMissionContent(prev => ({ ...prev, banner_image: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSaveMission}
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            Save Mission Content
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Course Management</h3>
            <button
              onClick={openAddCourse}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
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
                  {course.background_image ? (
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
                      onClick={() => openEditCourse(course)}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
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
          <button
            onClick={handleSaveShowcase}
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="Background Image URL"
                value={editingCourse ? editingCourse.background_image : newCourse.background_image}
                onChange={(e) => {
                  if (editingCourse) {
                    setEditingCourse(prev => ({ ...prev, background_image: e.target.value }))
                  } else {
                    setNewCourse(prev => ({ ...prev, background_image: e.target.value }))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowCourseModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={editingCourse ? handleEditCourse : handleAddCourse}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
              >
                {editingCourse ? 'Update Course' : 'Add Course'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ContentManagement
