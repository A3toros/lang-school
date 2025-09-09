import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'

const ScheduleTable = ({ teacherId, weekStart }) => {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (teacherId) {
      fetchSchedule()
    }
  }, [teacherId, weekStart])

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      const response = await apiService.getTeacherSchedule(teacherId, weekStart)
      setSchedule(response.schedule || [])
    } catch (err) {
      setError('Failed to load schedule')
      console.error('Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }

  const timeSlots = [
    '6:30-7:00', '7:00-7:30', '7:30-8:00', '8:00-8:30', '8:30-9:00',
    '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00', '11:00-11:30',
    '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
    '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30',
    '16:30-17:00', '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00',
    '19:00-19:30', '19:30-20:00', '20:00-20:30', '20:30-21:00', '21:00-21:30',
    '21:30-22:00'
  ]

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const getStudentForSlot = (dayOfWeek, timeSlot) => {
    return schedule.find(s => s.day_of_week === dayOfWeek && s.time_slot === timeSlot)
  }

  const getAttendanceStatus = (student) => {
    if (!student) return 'scheduled'
    return student.attendance_status || 'scheduled'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-white'
      case 'absent':
        return 'bg-error text-white'
      default:
        return 'bg-neutral-200 text-neutral-700'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-neutral-800">Weekly Schedule</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                editMode
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-primary-100'
              }`}
            >
              {editMode ? 'Read Mode' : 'Edit Mode'}
            </button>
            {editMode && (
              <button className="btn-primary text-sm">
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 w-24">Time</th>
              {days.map((day, index) => (
                <th key={day} className="px-4 py-3 text-center text-sm font-medium text-neutral-700 min-w-[120px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot, timeIndex) => (
              <tr key={timeSlot} className="border-b border-neutral-100">
                <td className="px-4 py-3 text-sm text-neutral-600 font-medium">
                  {timeSlot}
                </td>
                {days.map((day, dayIndex) => {
                  const student = getStudentForSlot(dayIndex, timeSlot)
                  const status = getAttendanceStatus(student)
                  
                  return (
                    <td key={`${dayIndex}-${timeIndex}`} className="px-2 py-2">
                      {student ? (
                        <motion.div
                          className={`p-2 rounded-lg text-xs font-medium text-center cursor-pointer transition-all duration-200 ${getStatusColor(status)}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="truncate">{student.student_name}</div>
                          {editMode && (
                            <div className="mt-1 text-xs opacity-75">
                              Click to edit
                            </div>
                          )}
                        </motion.div>
                      ) : editMode ? (
                        <motion.button
                          className="w-full h-12 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-primary-400 hover:text-primary-500 transition-all duration-200"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          + Add Student
                        </motion.button>
                      ) : (
                        <div className="w-full h-12 flex items-center justify-center text-neutral-300">
                          -
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-success rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-error rounded"></div>
            <span>Absent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-neutral-200 rounded"></div>
            <span>Scheduled</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScheduleTable
