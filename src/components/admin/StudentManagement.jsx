import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'

const StudentManagement = ({ onStudentSelect, selectedStudent }) => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    name: '',
    date_from: '',
    date_to: '',
    lessons_min: '',
    lessons_max: '',
    status: 'active'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', teacher_id: '' })
  const [teachers, setTeachers] = useState([])

  useEffect(() => {
    fetchStudents()
    fetchTeachers()
  }, [pagination.page, filters])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const response = await apiService.getStudents({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      })
      
      if (response.success) {
        setStudents(response.students)
        setPagination(prev => ({ ...prev, total: response.total }))
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const response = await apiService.getTeachers()
      if (response.success) {
        setTeachers(response.teachers)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleAddStudent = async () => {
    try {
      if (!newStudent.name || !newStudent.teacher_id) {
        alert('Please fill in all required fields')
        return
      }

      const response = await apiService.createStudent({
        name: newStudent.name,
        teacher_id: parseInt(newStudent.teacher_id),
        lessons_per_week: 1,
        added_date: new Date().toISOString().split('T')[0]
      })

      if (response.success) {
        setNewStudent({ name: '', teacher_id: '' })
        setShowAddModal(false)
        fetchStudents()
      }
    } catch (error) {
      console.error('Error adding student:', error)
      alert('Failed to add student')
    }
  }

  const handleReassignStudent = async (studentId, newTeacherId) => {
    try {
      const response = await apiService.reassignStudent(studentId, newTeacherId)
      if (response.success) {
        fetchStudents()
        alert('Student reassigned successfully')
      }
    } catch (error) {
      console.error('Error reassigning student:', error)
      alert('Failed to reassign student')
    }
  }

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        const response = await apiService.deleteStudent(studentId)
        if (response.success) {
          fetchStudents()
          alert('Student deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting student:', error)
        alert('Failed to delete student')
      }
    }
  }

  const handleReactivateStudent = async (studentId) => {
    try {
      const response = await apiService.reactivateStudent(studentId)
      if (response.success) {
        fetchStudents()
        alert('Student reactivated successfully')
      }
    } catch (error) {
      console.error('Error reactivating student:', error)
      alert('Failed to reactivate student')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Student Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Add New Student
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={filters.name}
          onChange={(e) => handleFilterChange('name', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <input
          type="date"
          placeholder="From date"
          value={filters.date_from}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <input
          type="date"
          placeholder="To date"
          value={filters.date_to}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lessons/Week</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No students found
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <motion.tr
                  key={student.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selectedStudent?.id === student.id ? 'bg-primary-50' : ''}`}
                  onClick={() => onStudentSelect(student)}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.teacher_name || 'Unassigned'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.lessons_per_week}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(student.added_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      student.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <select
                        onChange={(e) => {
                          e.stopPropagation()
                          if (e.target.value) {
                            handleReassignStudent(student.id, parseInt(e.target.value))
                            e.target.value = ''
                          }
                        }}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Reassign</option>
                        {teachers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                      {student.is_active ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteStudent(student.id)
                          }}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReactivateStudent(student.id)
                          }}
                          className="text-green-600 hover:text-green-800 text-xs"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-700">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page * pagination.limit >= pagination.total}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
          >
            <h3 className="text-lg font-semibold mb-4">Add New Student</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Student Name"
                value={newStudent.name}
                onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <select
                value={newStudent.teacher_id}
                onChange={(e) => setNewStudent(prev => ({ ...prev, teacher_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
              >
                Add Student
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default StudentManagement
