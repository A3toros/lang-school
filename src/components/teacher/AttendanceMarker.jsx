import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../common/Button'
import apiService from '../../utils/api'

const AttendanceMarker = ({ 
  scheduleItem, 
  onStatusChange,
  disabled = false 
}) => {
  const [currentStatus, setCurrentStatus] = useState(scheduleItem?.attendance_status || 'scheduled')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled', color: 'bg-neutral-300 text-neutral-700', icon: '○' },
    { value: 'completed', label: 'Completed', color: 'bg-success text-white', icon: '✓' },
    { value: 'absent', label: 'U', color: 'bg-error text-white', icon: '✗' }
  ]

  const handleStatusChange = async (newStatus) => {
    if (disabled || loading) return

    try {
      setLoading(true)
      setError('')

      const response = await apiService.markAttendance(scheduleItem.id, newStatus)
      
      if (response.success) {
        setCurrentStatus(newStatus)
        onStatusChange?.(scheduleItem.id, newStatus)
      } else {
        setError(response.error || 'Failed to update attendance')
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
      setError('Failed to update attendance')
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0]
  }

  if (!scheduleItem) {
    return (
      <div className="text-center py-4 text-neutral-500">
        No schedule item provided
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Student Info */}
      <div className="text-center">
        <h3 className="font-medium text-neutral-800">{scheduleItem.student_name}</h3>
        <p className="text-sm text-neutral-600">
          {scheduleItem.day_name} at {scheduleItem.time_slot}
        </p>
      </div>

      {/* Current Status */}
      <div className="text-center">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusInfo(currentStatus).color}`}>
          <span className="mr-1">{getStatusInfo(currentStatus).icon}</span>
          {getStatusInfo(currentStatus).label}
        </div>
      </div>

      {/* Status Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            disabled={disabled || loading || currentStatus === option.value}
            variant={currentStatus === option.value ? 'primary' : 'outline'}
            size="sm"
            className={`text-xs ${
              currentStatus === option.value 
                ? option.color 
                : 'hover:bg-neutral-100'
            }`}
          >
            {option.icon} {option.label}
          </Button>
        ))}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
          <span className="ml-2 text-sm text-neutral-600">Updating...</span>
        </div>
      )}
    </div>
  )
}

export default AttendanceMarker
