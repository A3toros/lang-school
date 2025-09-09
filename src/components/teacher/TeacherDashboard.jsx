import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import TeacherSchedule from './TeacherSchedule'
import LessonReportForm from './LessonReportForm'
import apiService from '../../utils/api'

const TeacherDashboard = () => {
  const { user } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(new Date().toISOString().split('T')[0])
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [teacherStats, setTeacherStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const teacherId = user?.teacherId

  useEffect(() => {
    if (teacherId) {
      fetchTeacherStats(teacherId)
    }
  }, [teacherId, currentWeek])

  const fetchTeacherStats = async (id) => {
    setLoadingStats(true)
    try {
      const response = await apiService.getTeacherMonthlyStats(id, new Date().getFullYear(), new Date().getMonth() + 1)
      if (response.success) {
        setTeacherStats(response.stats)
      } else {
        console.error('Failed to fetch teacher stats:', response.error)
        setTeacherStats(null)
      }
    } catch (error) {
      console.error('Error fetching teacher stats:', error)
      setTeacherStats(null)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleWeekChange = (weekStart) => {
    setCurrentWeek(weekStart)
  }

  const handleStudentClick = (student, lessonDate, timeSlot) => {
    setSelectedStudentForReport({ student, lessonDate, timeSlot })
    setShowReportModal(true)
  }

  const handleReportSubmit = () => {
    setShowReportModal(false)
    setSelectedStudentForReport(null)
    // Optionally refresh stats after report submission
    if (teacherId) {
      fetchTeacherStats(teacherId)
    }
  }

  if (!teacherId) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-600">You must be logged in as a teacher to view this page.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white shadow-sm border-b border-neutral-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-neutral-800">
                Teacher Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-neutral-600">
                Welcome, {user?.teacher_name || user?.username}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-800 mb-4">
              Your Personal Dashboard
            </h2>
            <p className="text-neutral-600 mb-8">
              View your schedule and manage lesson reports
            </p>
          </div>

          {/* Teacher Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card p-4 text-center">
              <h3 className="text-lg font-semibold text-neutral-700">Total Lessons (Month)</h3>
              {loadingStats ? (
                <div className="animate-pulse h-6 bg-neutral-200 rounded mt-2"></div>
              ) : (
                <p className="text-3xl font-bold text-primary-600 mt-2">
                  {teacherStats?.total_lessons || 0}
                </p>
              )}
            </div>
            <div className="card p-4 text-center">
              <h3 className="text-lg font-semibold text-neutral-700">Completed Lessons</h3>
              {loadingStats ? (
                <div className="animate-pulse h-6 bg-neutral-200 rounded mt-2"></div>
              ) : (
                <p className="text-3xl font-bold text-success mt-2">
                  {teacherStats?.completed_lessons || 0}
                </p>
              )}
            </div>
            <div className="card p-4 text-center">
              <h3 className="text-lg font-semibold text-neutral-700">Attendance Rate</h3>
              {loadingStats ? (
                <div className="animate-pulse h-6 bg-neutral-200 rounded mt-2"></div>
              ) : (
                <p className="text-3xl font-bold text-info mt-2">
                  {teacherStats?.attendance_percentage ? `${teacherStats.attendance_percentage}%` : 'N/A'}
                </p>
              )}
            </div>
          </div>

          {/* Teacher Schedule */}
          <TeacherSchedule
            teacherId={teacherId}
            currentWeek={currentWeek}
            onWeekChange={handleWeekChange}
            onStudentClick={handleStudentClick}
          />
        </motion.div>
      </main>

      {/* Lesson Report Modal */}
      {showReportModal && selectedStudentForReport && (
        <LessonReportForm
          teacherId={teacherId}
          student={selectedStudentForReport.student}
          lessonDate={selectedStudentForReport.lessonDate}
          timeSlot={selectedStudentForReport.timeSlot}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  )
}

export default TeacherDashboard
