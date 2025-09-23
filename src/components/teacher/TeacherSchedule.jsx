import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'

const TeacherSchedule = ({ 
  teacherId, 
  currentWeek, 
  onWeekChange, 
  onStudentClick 
}) => {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (teacherId && currentWeek) {
      fetchSchedule()
    }
  }, [teacherId, currentWeek])

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.getTeacherSchedule(teacherId, currentWeek)
      
      if (response.success) {
        setSchedule(response.schedule || [])
      } else {
        setError(response.error || 'Failed to fetch schedule')
      }
    } catch (err) {
      console.error('Error fetching schedule:', err)
      setError('Failed to fetch schedule')
    } finally {
      setLoading(false)
    }
  }

  const getWeekDates = (weekStart) => {
    const start = new Date(weekStart)
    const dates = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    
    return dates
  }

  const getTimeSlots = () => {
    return [
      '8:00-8:30', '8:30-9:00', '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00',
      '11:00-11:30', '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
      '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00',
      '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00',
      '20:00-20:30', '20:30-21:00', '21:00-21:30'
    ]
  }

  const getStudentForSlot = (dayOfWeek, timeSlot) => {
    return schedule.find(s => s.day_of_week === dayOfWeek && s.time_slot === timeSlot)
  }

  const getAttendanceStatus = (attendanceStatus) => {
    switch (attendanceStatus) {
      case 'completed':
        return 'bg-success text-white'
      case 'absent':
        return 'bg-error text-white'
      case 'scheduled':
      default:
        return 'bg-neutral-200 text-neutral-700'
    }
  }

  const navigateWeek = (direction) => {
    const currentDate = new Date(currentWeek)
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction * 7))
    onWeekChange(newDate.toISOString().split('T')[0])
  }

  const weekDates = getWeekDates(currentWeek)
  const timeSlots = getTimeSlots()

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-center text-red-600">
          <p className="mb-4">{error}</p>
          <button
            onClick={fetchSchedule}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card p-6"
    >
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-neutral-800">
          Week of {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
        </h3>
        
        <button
          onClick={() => navigateWeek(1)}
          className="p-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Schedule Table */}
      <div className="w-full">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="w-10 sm:w-12 md:w-16 p-1 text-left text-2xs sm:text-xs md:text-sm font-medium text-neutral-600 uppercase tracking-wider">
                Time
              </th>
              {weekDates.map((date, index) => (
                <th key={index} className="p-1 text-center font-medium text-neutral-600 uppercase tracking-wider min-w-0">
                  <div className="flex flex-col min-w-0">
                    <div className="font-semibold text-2xs sm:text-xs md:text-sm truncate">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-neutral-500 text-2xs sm:text-xs mt-0.5 sm:mt-1 truncate">
                      {date.getDate()}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {timeSlots.map((timeSlot, timeIndex) => (
              <tr key={timeIndex} className="hover:bg-neutral-50">
                <td className="p-1 text-2xs sm:text-xs md:text-sm text-neutral-600 font-mono">
                  {timeSlot}
                </td>
                {weekDates.map((date, dayIndex) => {
                  const student = getStudentForSlot(dayIndex, timeSlot)
                  return (
                    <td key={dayIndex} className="p-1 text-center">
                      {student ? (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onStudentClick(student, date.toISOString().split('T')[0], timeSlot)}
                          className={`w-full p-1 rounded text-2xs font-medium transition-all duration-200 ${getAttendanceStatus(student.attendance_status)}`}
                        >
                          <div className="truncate">
                            {student.student_name}
                          </div>
                        </motion.button>
                      ) : (
                        <div className="w-full p-2 text-xs text-neutral-400">
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
      <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-success rounded"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-error rounded"></div>
          <span>U</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-neutral-200 rounded"></div>
          <span>Scheduled</span>
        </div>
      </div>
    </motion.div>
  )
}

export default TeacherSchedule
