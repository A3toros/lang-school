import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../common/Button'
import Modal from '../common/Modal'
import apiService from '../../utils/api'

const BulkOperations = ({ 
  selectedItems = [], 
  onOperationComplete,
  type = 'teachers' // 'teachers' or 'students'
}) => {
  const [showModal, setShowModal] = useState(false)
  const [operation, setOperation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const operations = {
    teachers: [
      { id: 'reset-passwords', label: 'Reset Passwords', description: 'Generate new random passwords for selected teachers' },
      { id: 'deactivate', label: 'Deactivate', description: 'Mark selected teachers as inactive' },
      { id: 'activate', label: 'Activate', description: 'Mark selected teachers as active' },
      { id: 'export', label: 'Export Data', description: 'Export selected teachers data to CSV' }
    ],
    students: [
      { id: 'reassign', label: 'Reassign Teacher', description: 'Reassign selected students to a different teacher' },
      { id: 'deactivate', label: 'Deactivate', description: 'Mark selected students as inactive' },
      { id: 'activate', label: 'Activate', description: 'Mark selected students as active' },
      { id: 'export', label: 'Export Data', description: 'Export selected students data to CSV' }
    ]
  }

  const handleOperation = async (operationId) => {
    if (selectedItems.length === 0) {
      setError('Please select items to perform bulk operations')
      return
    }

    setOperation(operationId)
    setShowModal(true)
  }

  const confirmOperation = async (additionalData = {}) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      let response
      const itemIds = selectedItems.map(item => item.id)

      switch (operation) {
        case 'reset-passwords':
          response = await apiService.bulkResetPasswords(itemIds)
          break
        case 'deactivate':
          response = await apiService.bulkDeactivate(type, itemIds)
          break
        case 'activate':
          response = await apiService.bulkActivate(type, itemIds)
          break
        case 'reassign':
          if (!additionalData.teacherId) {
            setError('Please select a teacher to reassign to')
            return
          }
          response = await apiService.bulkReassignStudents(itemIds, additionalData.teacherId)
          break
        case 'export':
          response = await apiService.exportData(type, itemIds)
          break
        default:
          setError('Unknown operation')
          return
      }

      if (response.success) {
        setSuccess(`${operation} completed successfully for ${selectedItems.length} items`)
        onOperationComplete?.(operation, response.data)
        setShowModal(false)
      } else {
        setError(response.error || `Failed to ${operation}`)
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error)
      setError(`Failed to ${operation}`)
    } finally {
      setLoading(false)
    }
  }

  const getOperationIcon = (operationId) => {
    switch (operationId) {
      case 'reset-passwords':
        return '🔑'
      case 'deactivate':
        return '❌'
      case 'activate':
        return '✅'
      case 'reassign':
        return '🔄'
      case 'export':
        return '📊'
      default:
        return '⚙️'
    }
  }

  if (selectedItems.length === 0) {
    return (
      <div className="text-center py-4 text-neutral-500">
        Select items to perform bulk operations
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-800">
              Bulk Operations ({selectedItems.length} selected)
            </h3>
            <p className="text-sm text-blue-600">
              Choose an operation to perform on selected {type}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {operations[type]?.map((op) => (
          <motion.button
            key={op.id}
            onClick={() => handleOperation(op.id)}
            className="p-4 bg-white border border-neutral-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all duration-200 text-left"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-2xl mb-2">{getOperationIcon(op.id)}</div>
            <div className="font-medium text-neutral-800 text-sm">{op.label}</div>
            <div className="text-xs text-neutral-600 mt-1">{op.description}</div>
          </motion.button>
        ))}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm"
        >
          {success}
        </motion.div>
      )}

      {/* Operation Confirmation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Confirm ${operations[type]?.find(op => op.id === operation)?.label}`}
        size="md"
      >
        <BulkOperationModal
          operation={operation}
          selectedCount={selectedItems.length}
          onConfirm={confirmOperation}
          onCancel={() => setShowModal(false)}
          loading={loading}
          type={type}
        />
      </Modal>
    </div>
  )
}

const BulkOperationModal = ({ 
  operation, 
  selectedCount, 
  onConfirm, 
  onCancel, 
  loading,
  type 
}) => {
  const [additionalData, setAdditionalData] = useState({})
  const [teachers, setTeachers] = useState([])

  useEffect(() => {
    if (operation === 'reassign' && type === 'students') {
      fetchTeachers()
    }
  }, [operation, type])

  const fetchTeachers = async () => {
    try {
      const response = await apiService.getTeachers()
      if (response.success) {
        setTeachers(response.teachers || [])
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  const handleConfirm = () => {
    onConfirm(additionalData)
  }

  const getConfirmationMessage = () => {
    switch (operation) {
      case 'reset-passwords':
        return `Are you sure you want to reset passwords for ${selectedCount} ${type}? This will generate new random passwords.`
      case 'deactivate':
        return `Are you sure you want to deactivate ${selectedCount} ${type}?`
      case 'activate':
        return `Are you sure you want to activate ${selectedCount} ${type}?`
      case 'reassign':
        return `Are you sure you want to reassign ${selectedCount} students to the selected teacher?`
      case 'export':
        return `Export data for ${selectedCount} ${type}?`
      default:
        return `Perform this operation on ${selectedCount} ${type}?`
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-neutral-700">{getConfirmationMessage()}</p>

      {operation === 'reassign' && type === 'students' && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Select Teacher
          </label>
          <select
            value={additionalData.teacherId || ''}
            onChange={(e) => setAdditionalData(prev => ({ ...prev, teacherId: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          >
            <option value="">Choose a teacher</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          loading={loading}
          className="flex-1"
        >
          Confirm
        </Button>
      </div>
    </div>
  )
}

export default BulkOperations
