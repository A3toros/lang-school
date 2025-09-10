import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import apiService from '../utils/api'

const TeacherPage = () => {
  const { user, logout } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(new Date().toISOString().split('T')[0])
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [reportComment, setReportComment] = useState('')
  const [attendanceStats, setAttendanceStats] = useState({
    completed: 0,
    absent: 0,
    scheduled: 0,
    attendance_rate: 0
  })

  useEffect(() => {
    fetchSchedule()
    fetchAttendanceStats()
  }, [currentWeek])

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      const response = await apiService.getTeacherSchedule(user.teacherId, currentWeek)
      if (response.success) {
        setSchedule(response.schedule)
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceStats = async () => {
    try {
      const response = await apiService.getAttendanceStats({
        teacher_id: user.teacherId,
        period: `${currentWeek},${getWeekEnd(currentWeek)}`
      })
      if (response.success) {
        setAttendanceStats(response.stats)
      }
    } catch (error) {
      console.error('Error fetching attendance stats:', error)
    }
  }

  const getWeekEnd = (weekStart) => {
    const endDate = new Date(weekStart)
    endDate.setDate(endDate.getDate() + 6)
    return endDate.toISOString().split('T')[0]
  }

  const getWeekStart = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  const handleWeekChange = (direction) => {
    const currentDate = new Date(currentWeek)
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 7)
    } else {
      currentDate.setDate(currentDate.getDate() + 7)
    }
    setCurrentWeek(getWeekStart(currentDate))
  }

  const handleMarkAttendance = async (scheduleId, status) => {
    try {
      const response = await apiService.markAttendance(scheduleId, status, new Date().toISOString().split('T')[0])
      if (response.success) {
        fetchSchedule()
        fetchAttendanceStats()
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      alert('Failed to mark attendance')
    }
  }

  const handleStudentClick = (student, timeSlot) => {
    setSelectedStudent(student)
    setSelectedTimeSlot(timeSlot)
    setShowReportModal(true)
  }

  const handleSubmitReport = async () => {
    try {
      if (!reportComment.trim()) {
        alert('Please enter a comment')
        return
      }

      const response = await apiService.createReport({
        student_id: selectedStudent.id,
        lesson_date: new Date().toISOString().split('T')[0],
        time_slot: selectedTimeSlot,
        comment: reportComment
      })

      if (response.success) {
        setShowReportModal(false)
        setReportComment('')
        setSelectedStudent(null)
        setSelectedTimeSlot('')
        alert('Report submitted successfully')
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Failed to submit report')
    }
  }

  const getAttendanceStatus = (schedule) => {
    if (schedule.attendance_status === 'completed') return 'completed'
    if (schedule.attendance_status === 'absent') return 'absent'
    return 'scheduled'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'absent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const timeSlots = [
    '6:30-7:00', '7:00-7:30', '7:30-8:00', '8:00-8:30', '8:30-9:00', '9:00-9:30',
    '9:30-10:00', '10:00-10:30', '10:30-11:00', '11:00-11:30', '11:30-12:00',
    '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00', '14:00-14:30',
    '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00',
    '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30',
    '19:30-20:00', '20:00-20:30', '20:30-21:00', '21:00-21:30', '21:30-22:00'
  ]

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Teacher Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.teacher_name || user?.username}. Let's talk!</span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="w-6 h-6 text-green-600">✓</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{attendanceStats.completed}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <div className="w-6 h-6 text-red-600">✗</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-semibold text-gray-900">{attendanceStats.absent}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <div className="w-6 h-6 text-gray-600">⏰</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-semibold text-gray-900">{attendanceStats.scheduled}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <div className="w-6 h-6 text-blue-600">📊</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{attendanceStats.attendance_rate}%</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Schedule Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {/* Week Navigation */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Week of {new Date(currentWeek).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleWeekChange('prev')}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setCurrentWeek(getWeekStart(new Date()))}
                  className="px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600"
                >
                  This Week
                </button>
                <button
                  onClick={() => handleWeekChange('next')}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  {days.map((day, index) => (
                    <th key={day} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {timeSlot}
                    </td>
                    {days.map((day, dayIndex) => {
                      const daySchedule = schedule.filter(s => 
                        s.day_of_week === dayIndex && s.time_slot === timeSlot
                      )
                      return (
                        <td key={`${day}-${timeSlot}`} className="px-4 py-3">
                          {daySchedule.map((scheduleItem) => {
                            const status = getAttendanceStatus(scheduleItem)
                            return (
                              <div
                                key={scheduleItem.id}
                                className={`p-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${getStatusColor(status)}`}
                                onClick={() => handleStudentClick(scheduleItem.student, timeSlot)}
                              >
                                <div className="font-medium text-sm">
                                  {scheduleItem.student_name}
                                </div>
                                <div className="flex space-x-1 mt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMarkAttendance(scheduleItem.id, 'completed')
                                    }}
                                    className={`text-xs px-2 py-1 rounded ${
                                      status === 'completed' 
                                        ? 'bg-green-200 text-green-800' 
                                        : 'bg-gray-200 text-gray-600 hover:bg-green-200'
                                    }`}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMarkAttendance(scheduleItem.id, 'absent')
                                    }}
                                    className={`text-xs px-2 py-1 rounded ${
                                      status === 'absent' 
                                        ? 'bg-red-200 text-red-800' 
                                        : 'bg-gray-200 text-gray-600 hover:bg-red-200'
                                    }`}
                                  >
                                    ✗
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Report Modal */}
        {showReportModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
            >
              <h3 className="text-lg font-semibold mb-4">
                Lesson Report - {selectedStudent.student_name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Slot
                  </label>
                  <input
                    type="text"
                    value={selectedTimeSlot}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comment
                  </label>
                  <textarea
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your lesson report comment..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReport}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}

export default TeacherPage