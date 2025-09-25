import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Button from '../common/Button'
import apiService from '../../utils/api'

const AttendanceTracking = ({ 
  schedule, 
  onAttendanceUpdate,
  teacherId 
}) => {
  const [attendanceData, setAttendanceData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (schedule) {
      const initialData = {}
      schedule.forEach(item => {
        initialData[item.id] = item.attendance_status || 'scheduled'
      })
      setAttendanceData(initialData)
    }
  }, [schedule])

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-white'
      case 'absent':
        return 'bg-error text-white'
      case 'scheduled':
        return 'bg-neutral-300 text-neutral-700'
      default:
        return 'bg-neutral-300 text-neutral-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✓'
      case 'absent':
        return '✗'
      case 'scheduled':
        return '○'
      default:
        return '○'
    }
  }

  const handleStatusChange = async (scheduleId, newStatus) => {
    try {
      setLoading(true)
      setError('')

      const response = await apiService.markAttendance(scheduleId, newStatus)
      
      if (response.success) {
        setAttendanceData(prev => ({
          ...prev,
          [scheduleId]: newStatus
        }))
        onAttendanceUpdate?.(scheduleId, newStatus)
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

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'scheduled':
        return 'completed'
      case 'completed':
        return 'absent'
      case 'absent':
        return 'scheduled'
      default:
        return 'completed'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'absent':
        return 'UI'
      case 'scheduled':
        return 'Scheduled'
      default:
        return 'Scheduled'
    }
  }

  if (!schedule || schedule.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        No schedule data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedule.map((item) => {
          const currentStatus = attendanceData[item.id] || 'scheduled'
          const nextStatus = getNextStatus(currentStatus)
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm"
            >
              <div className="space-y-3">
                {/* Student Info */}
                <div>
                  <h3 className="font-medium text-neutral-800">{item.student_name}</h3>
                  <p className="text-sm text-neutral-600">
                    {item.day_name} at {item.time_slot}
                  </p>
                </div>

                {/* Current Status */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-neutral-700">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                    {getStatusIcon(currentStatus)} {getStatusLabel(currentStatus)}
                  </span>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => handleStatusChange(item.id, nextStatus)}
                  disabled={loading}
                  variant={nextStatus === 'completed' ? 'success' : nextStatus === 'absent' ? 'error' : 'outline'}
                  size="sm"
                  className="w-full"
                >
                  Mark as {getStatusLabel(nextStatus)}
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="bg-neutral-50 rounded-lg p-4">
        <h3 className="font-medium text-neutral-800 mb-3">Attendance Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-success">
              {Object.values(attendanceData).filter(status => status === 'completed').length}
            </div>
            <div className="text-sm text-neutral-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-error">
              {Object.values(attendanceData).filter(status => status === 'absent').length}
            </div>
            <div className="text-sm text-neutral-600">U</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-500">
              {Object.values(attendanceData).filter(status => status === 'scheduled').length}
            </div>
            <div className="text-sm text-neutral-600">Scheduled</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttendanceTracking
