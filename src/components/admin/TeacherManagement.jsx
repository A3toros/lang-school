import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'
import ImageUploader from '../common/ImageUploader'
import SuccessNotification from '../common/SuccessNotification'

const TeacherManagement = ({ onTeacherSelect, selectedTeacher }) => {
  const [teachers, setTeachers] = useState([])
  const [inactiveTeachers, setInactiveTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active') // 'active' or 'inactive'
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showPasswordViewModal, setShowPasswordViewModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    description: '',
    photo_url: ''
  })
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [statusChangeData, setStatusChangeData] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteData, setDeleteData] = useState(null)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'success' })

  useEffect(() => {
    if (activeTab === 'active') {
      fetchTeachers()
    } else {
      fetchInactiveTeachers()
    }
  }, [activeTab])

  // Initial load - fetch both active and inactive teachers to ensure accurate counts
  useEffect(() => {
    const initialLoad = async () => {
      await Promise.all([
        fetchTeachers(),
        fetchInactiveTeachers()
      ])
    }
    initialLoad()
  }, [])

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      const response = await apiService.getTeachers({ status: 'active' })
      if (response.success) {
        setTeachers(response.teachers)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInactiveTeachers = async () => {
    try {
      setLoading(true)
      const response = await apiService.getTeachers({ status: 'inactive' })
      if (response.success) {
        setInactiveTeachers(response.teachers)
      }
    } catch (error) {
      console.error('Error fetching inactive teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const showSuccessNotification = (title, message, type = 'success') => {
    setNotificationData({ title, message, type })
    setShowNotification(true)
  }

  const handleAddTeacher = async () => {
    try {
      if (!newTeacher.name || !newTeacher.email || !newTeacher.username || !newTeacher.password) {
        showSuccessNotification('Validation Error', 'Please fill in all required fields', 'error')
        return
      }

      const response = await apiService.createTeacher({
        name: newTeacher.name,
        email: newTeacher.email,
        username: newTeacher.username,
        password: newTeacher.password,
        description: newTeacher.description,
        photo_url: newTeacher.photo_url
      })

      if (response.success) {
        setNewTeacher({
          name: '',
          email: '',
          username: '',
          password: '',
          description: '',
          photo_url: ''
        })
        setShowAddModal(false)
        fetchTeachers()
        showSuccessNotification('Success!', 'Teacher added successfully', 'success')
      }
    } catch (error) {
      console.error('Error adding teacher:', error)
      showSuccessNotification('Error', 'Failed to add teacher', 'error')
    }
  }

  const handleEditTeacher = async () => {
    try {
      if (!editingTeacher.name || !editingTeacher.email) {
        showSuccessNotification('Validation Error', 'Please fill in all required fields', 'error')
        return
      }

      const response = await apiService.updateTeacher(editingTeacher.id, {
        name: editingTeacher.name,
        email: editingTeacher.email,
        description: editingTeacher.description,
        photo_url: editingTeacher.photo_url
      })

      if (response.success) {
        setEditingTeacher(null)
        setShowEditModal(false)
        fetchTeachers()
        showSuccessNotification('Success!', 'Teacher updated successfully', 'success')
      }
    } catch (error) {
      console.error('Error updating teacher:', error)
      showSuccessNotification('Error', 'Failed to update teacher', 'error')
    }
  }

  const handleStatusChange = (teacher, newStatus) => {
    setStatusChangeData({ teacher, newStatus })
    setShowStatusConfirm(true)
  }

  const confirmStatusChange = async () => {
    try {
      const { teacher, newStatus } = statusChangeData
      
      if (newStatus === false) {
        // Deactivating teacher
        const response = await apiService.deactivateTeacher(teacher.id)
        if (response.success) {
          // Refresh both active and inactive teachers to get accurate counts
          await Promise.all([
            fetchTeachers(),
            fetchInactiveTeachers()
          ])
          showSuccessNotification('Success!', 'Teacher deactivated successfully - future schedules removed', 'success')
        }
      } else if (newStatus === true) {
        // Reactivating teacher
        const response = await apiService.reactivateTeacher(teacher.id)
        if (response.success) {
          // Refresh both active and inactive teachers to get accurate counts
          await Promise.all([
            fetchTeachers(),
            fetchInactiveTeachers()
          ])
          showSuccessNotification('Success!', 'Teacher reactivated successfully', 'success')
        }
      }
      
      setShowStatusConfirm(false)
      setStatusChangeData(null)
    } catch (error) {
      console.error('Error updating teacher status:', error)
      showSuccessNotification('Error', 'Error updating teacher status', 'error')
    }
  }

  const handleHardDelete = (teacher) => {
    setDeleteData(teacher)
    setShowDeleteConfirm(true)
  }

  const confirmHardDelete = async () => {
    try {
      const response = await apiService.deleteTeacher(deleteData.id)
      if (response.success) {
        // Refresh both active and inactive teachers to get accurate counts
        await Promise.all([
          fetchTeachers(),
          fetchInactiveTeachers()
        ])
        showSuccessNotification('Success!', 'Teacher deleted successfully - all data removed', 'success')
      }
      
      setShowDeleteConfirm(false)
      setDeleteData(null)
    } catch (error) {
      console.error('Error deleting teacher:', error)
      showSuccessNotification('Error', 'Error deleting teacher', 'error')
    }
  }

  const handleChangePassword = async (teacherId, newPassword) => {
    try {
      const response = await apiService.changeTeacherPassword(teacherId, newPassword)
      if (response.success) {
        showSuccessNotification('Success!', 'Password changed successfully', 'success')
        setShowPasswordModal(false)
      }
    } catch (error) {
      console.error('Error changing password:', error)
      showSuccessNotification('Error', 'Failed to change password', 'error')
    }
  }

  const openEditModal = (teacher) => {
    setEditingTeacher({ ...teacher })
    setShowEditModal(true)
  }

  const openPasswordModal = (teacher) => {
    setEditingTeacher(teacher)
    setShowPasswordModal(true)
  }

  const openPasswordViewModal = (teacher) => {
    setEditingTeacher(teacher)
    setShowPasswordViewModal(true)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 mb-6">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800 text-center sm:text-left">Teacher Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-500 hover:bg-primary-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm sm:text-base transition-colors duration-200"
        >
          Add New Teacher
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
            activeTab === 'active'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Active Teachers ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
            activeTab === 'inactive'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Inactive Teachers ({inactiveTeachers.length})
        </button>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : (activeTab === 'active' ? teachers : inactiveTeachers).length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            No {activeTab} teachers found
          </div>
        ) : (
          (activeTab === 'active' ? teachers : inactiveTeachers).map((teacher) => (
            <motion.div
              key={teacher.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                selectedTeacher?.id === teacher.id 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
              }`}
              onClick={() => onTeacherSelect(teacher)}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  {teacher.photo_url ? (
                    <img
                      src={teacher.photo_url}
                      alt={teacher.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-600 font-semibold text-lg">
                      {teacher.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {teacher.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {teacher.email}
                  </p>
                </div>
              </div>
              
              {teacher.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {teacher.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    teacher.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {teacher.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange(teacher, !teacher.is_active)
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      teacher.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {teacher.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
                
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(teacher)
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openPasswordViewModal(teacher)
                    }}
                    className="text-yellow-600 hover:text-yellow-800 text-xs px-2 py-1 rounded hover:bg-yellow-50"
                  >
                    Password
                  </button>
                  {teacher.is_active && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleHardDelete(teacher)
                      }}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4">Add New Teacher</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Teacher Name *"
                value={newTeacher.name}
                onChange={(e) => setNewTeacher(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="email"
                placeholder="Email *"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Username *"
                value={newTeacher.username}
                onChange={(e) => setNewTeacher(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="password"
                placeholder="Password *"
                value={newTeacher.password}
                onChange={(e) => setNewTeacher(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <textarea
                placeholder="Description"
                value={newTeacher.description}
                onChange={(e) => setNewTeacher(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Teacher Photo
                </label>
                <ImageUploader
                  onUpload={(url) => setNewTeacher(prev => ({ ...prev, photo_url: url }))}
                  onError={(error) => console.error('Upload error:', error)}
                  folder="lang-school/teachers"
                  className="w-full"
                  uploadedImageUrl={newTeacher.photo_url}
                  showUploadArea={!newTeacher.photo_url}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTeacher}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
              >
                Add Teacher
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && editingTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4">Edit Teacher</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Teacher Name *"
                  value={editingTeacher.name}
                  onChange={(e) => setEditingTeacher(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Email *"
                  value={editingTeacher.email}
                  onChange={(e) => setEditingTeacher(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  placeholder="Description"
                  value={editingTeacher.description || ''}
                  onChange={(e) => setEditingTeacher(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Teacher Photo
                </label>
                <ImageUploader
                  onUpload={(url) => setEditingTeacher(prev => ({ ...prev, photo_url: url }))}
                  onError={(error) => console.error('Upload error:', error)}
                  folder="lang-school/teachers"
                  className="w-full"
                  uploadedImageUrl={editingTeacher.photo_url}
                  showUploadArea={true}
                />
                {editingTeacher.photo_url && (
                  <p className="text-sm text-neutral-600 mt-2">Click above to upload a new photo</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTeacher}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
              >
                Update Teacher
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password View Modal */}
      {showPasswordViewModal && editingTeacher && (
        <PasswordViewModal
          teacher={editingTeacher}
          onClose={() => setShowPasswordViewModal(false)}
          onEditPassword={() => {
            setShowPasswordViewModal(false)
            setShowPasswordModal(true)
          }}
        />
      )}

      {/* Password Change Modal */}
      {showPasswordModal && editingTeacher && (
        <PasswordChangeModal
          teacher={editingTeacher}
          onClose={() => setShowPasswordModal(false)}
          onChangePassword={handleChangePassword}
        />
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusConfirm && statusChangeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Status Change
                </h3>
                <button
                  onClick={() => setShowStatusConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to {statusChangeData.newStatus ? 'reactivate' : 'deactivate'} teacher{' '}
                  <span className="font-semibold">{statusChangeData.teacher.name}</span>?
                </p>
                
              {!statusChangeData.newStatus && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">
                    <strong>Warning:</strong> Deactivating will unassign all students from this teacher and make them unavailable for new student assignments. Students will become unassigned but remain active.
                  </p>
                </div>
              )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowStatusConfirm(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusChange}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    statusChangeData.newStatus
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {statusChangeData.newStatus ? 'Reactivate' : 'Deactivate'}
                </button>
              </div>
            </div>
        </motion.div>
      </div>
    )}

    {/* Hard Delete Confirmation Modal */}
    {showDeleteConfirm && deleteData && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-red-600">
                ⚠️ Permanent Deletion
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to <strong>permanently delete</strong> teacher{' '}
                <span className="font-semibold text-red-600">{deleteData.name}</span>?
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm font-semibold mb-2">
                  This action will permanently delete:
                </p>
                <ul className="text-red-700 text-sm space-y-1">
                  <li>• Teacher record and user account</li>
                  <li>• All lesson reports and attendance data</li>
                  <li>• All schedules (past and future)</li>
                  <li>• Schedule templates and history</li>
                  <li>• Teacher photo from Cloudinary</li>
                </ul>
                <p className="text-red-800 text-sm font-semibold mt-2">
                  This action cannot be undone!
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmHardDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}

    {/* Success Notification */}
    <SuccessNotification
      isVisible={showNotification}
      onClose={() => setShowNotification(false)}
      title={notificationData.title}
      message={notificationData.message}
      type={notificationData.type}
      duration={4000}
    />
  </div>
  )
}

// Password Change Modal Component
const PasswordChangeModal = ({ teacher, onClose, onChangePassword }) => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    onChangePassword(teacher.id, newPassword)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
      >
        <h3 className="text-lg font-semibold mb-4">Change Password for {teacher.name}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
            >
              Change Password
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// Password View Modal Component
const PasswordViewModal = ({ teacher, onClose, onEditPassword }) => {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (teacher) {
      // Reset state when teacher changes
      setPassword('')
      setError('')
      setShowPassword(false)
      setLoading(false)
      fetchPassword()
    } else {
      // Reset state when modal is closed
      setPassword('')
      setError('')
      setShowPassword(false)
      setLoading(false)
    }
  }, [teacher])

  const fetchPassword = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await apiService.getTeacherPassword(teacher.id)
      
      if (response.success) {
        setPassword(response.password_info.password)
      } else {
        setError(response.error || 'Failed to fetch password')
      }
    } catch (error) {
      console.error('Error fetching password:', error)
      setError('Failed to fetch password')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password)
      // Note: This will be handled by the parent component's notification system
    } catch (error) {
      console.error('Failed to copy password:', error)
      // Note: This will be handled by the parent component's notification system
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
      >
        <h3 className="text-lg font-semibold mb-4">
          Current Password - {teacher.name}
        </h3>

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            <p className="mt-2 text-gray-600">Loading password...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {!loading && !error && password && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> This is the teacher's current password. 
                Click "Change Password" below to set a new one.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={onEditPassword}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
          >
            Change Password
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default TeacherManagement
