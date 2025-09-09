import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'

const TeacherManagement = ({ onTeacherSelect, selectedTeacher }) => {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    description: '',
    photo_url: ''
  })

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      const response = await apiService.getTeachers()
      if (response.success) {
        setTeachers(response.teachers)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTeacher = async () => {
    try {
      if (!newTeacher.name || !newTeacher.email || !newTeacher.username || !newTeacher.password) {
        alert('Please fill in all required fields')
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
        alert('Teacher added successfully')
      }
    } catch (error) {
      console.error('Error adding teacher:', error)
      alert('Failed to add teacher')
    }
  }

  const handleEditTeacher = async () => {
    try {
      if (!editingTeacher.name || !editingTeacher.email) {
        alert('Please fill in all required fields')
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
        alert('Teacher updated successfully')
      }
    } catch (error) {
      console.error('Error updating teacher:', error)
      alert('Failed to update teacher')
    }
  }

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher? This will also deactivate all associated students and schedules.')) {
      try {
        const response = await apiService.deleteTeacher(teacherId)
        if (response.success) {
          fetchTeachers()
          alert('Teacher deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting teacher:', error)
        alert('Failed to delete teacher')
      }
    }
  }

  const handleReactivateTeacher = async (teacherId) => {
    try {
      const response = await apiService.reactivateTeacher(teacherId)
      if (response.success) {
        fetchTeachers()
        alert('Teacher reactivated successfully')
      }
    } catch (error) {
      console.error('Error reactivating teacher:', error)
      alert('Failed to reactivate teacher')
    }
  }

  const handleChangePassword = async (teacherId, newPassword) => {
    try {
      const response = await apiService.changeTeacherPassword(teacherId, newPassword)
      if (response.success) {
        alert('Password changed successfully')
        setShowPasswordModal(false)
      }
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Failed to change password')
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Teacher Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Add New Teacher
        </button>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : teachers.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            No teachers found
          </div>
        ) : (
          teachers.map((teacher) => (
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
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  teacher.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {teacher.is_active ? 'Active' : 'Inactive'}
                </span>
                
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
                      openPasswordModal(teacher)
                    }}
                    className="text-yellow-600 hover:text-yellow-800 text-xs px-2 py-1 rounded hover:bg-yellow-50"
                  >
                    Password
                  </button>
                  {teacher.is_active ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTeacher(teacher.id)
                      }}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReactivateTeacher(teacher.id)
                      }}
                      className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded hover:bg-green-50"
                    >
                      Reactivate
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
              <input
                type="url"
                placeholder="Photo URL"
                value={newTeacher.photo_url}
                onChange={(e) => setNewTeacher(prev => ({ ...prev, photo_url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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
              <input
                type="text"
                placeholder="Teacher Name *"
                value={editingTeacher.name}
                onChange={(e) => setEditingTeacher(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="email"
                placeholder="Email *"
                value={editingTeacher.email}
                onChange={(e) => setEditingTeacher(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <textarea
                placeholder="Description"
                value={editingTeacher.description || ''}
                onChange={(e) => setEditingTeacher(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="Photo URL"
                value={editingTeacher.photo_url || ''}
                onChange={(e) => setEditingTeacher(prev => ({ ...prev, photo_url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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

      {/* Password Change Modal */}
      {showPasswordModal && editingTeacher && (
        <PasswordChangeModal
          teacher={editingTeacher}
          onClose={() => setShowPasswordModal(false)}
          onChangePassword={handleChangePassword}
        />
      )}
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

export default TeacherManagement
