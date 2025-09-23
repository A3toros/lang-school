import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Modal from '../common/Modal'
import apiService from '../../utils/api'

const StudentModal = ({ 
  isOpen, 
  onClose, 
  student = null, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    lessons_per_week: 1
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!student

  useEffect(() => {
    if (isOpen) {
      if (student) {
        setFormData({
          name: student.name || '',
          lessons_per_week: student.lessons_per_week || 1
        })
      } else {
        setFormData({
          name: '',
          lessons_per_week: 1
        })
      }
      setError('')
    }
  }, [isOpen, student])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError('')

      let response
      if (isEdit) {
        response = await apiService.updateStudent(student.id, formData)
      } else {
        response = await apiService.createStudent({
          ...formData,
          added_date: new Date().toISOString().split('T')[0]
        })
      }

      if (response.success) {
        onSave?.(response.student || response.data)
        onClose()
      } else {
        setError(response.error || 'Failed to save student')
      }
    } catch (error) {
      console.error('Error saving student:', error)
      setError('Failed to save student')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'lessons_per_week' ? parseInt(value) || 1 : value
    }))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Student' : 'Add New Student'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
          >
            {error}
          </motion.div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
            Student Name *
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
          <label htmlFor="lessons_per_week" className="block text-sm font-medium text-neutral-700 mb-1">
            Lessons per Week (Auto-calculated)
            <span className="text-xs text-gray-500 ml-1" title="Automatically calculated based on actual lessons scheduled this week">
              ℹ️
            </span>
          </label>
          <input
            type="number"
            id="lessons_per_week"
            name="lessons_per_week"
            value={formData.lessons_per_week}
            onChange={handleChange}
            min="0"
            max="7"
            disabled
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-gray-100 cursor-not-allowed"
            required
          />
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEdit ? 'Updating...' : 'Creating...'}
              </div>
            ) : (
              isEdit ? 'Update Student' : 'Create Student'
            )}
          </motion.button>
        </div>
      </form>
    </Modal>
  )
}

export default StudentModal
