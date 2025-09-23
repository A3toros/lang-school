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
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [bucket, setBucket] = useState('week')
  const [analytics, setAnalytics] = useState({ loading: false, data: [], totals: { completed: 0, absent: 0, warned: 0, total: 0 } })

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

  const fetchMyAnalytics = async () => {
    if (!fromDate || !toDate) return
    setAnalytics(prev => ({ ...prev, loading: true }))
    try {
      const res = await apiService.getMyTeacherAttendanceAnalytics(fromDate, toDate, bucket)
      const rows = res?.data || []
      const totals = rows.reduce((acc, r) => {
        acc.completed += Number(r.completed || 0)
        acc.absent += Number(r.absent || 0)
        acc.warned += Number(r.warned || 0)
        acc.total += Number(r.total || 0)
        return acc
      }, { completed: 0, absent: 0, warned: 0, total: 0 })
      setAnalytics({ loading: false, data: rows, totals })
    } catch (e) {
      console.error('Analytics fetch error', e)
      setAnalytics(prev => ({ ...prev, loading: false }))
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
                Welcome, {user?.teacher_name || user?.username}. Let's talk!
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
          </div>

          {/* Date Range Analytics (Self) */}
          <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-8">
            <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-3 md:space-y-0">
              <div>
                <label className="block text-sm text-neutral-600 mb-1">From</label>
                <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-neutral-600 mb-1">To</label>
                <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-neutral-600 mb-1">Bucket</label>
                <select className="input" value={bucket} onChange={e => setBucket(e.target.value)}>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
              <button onClick={fetchMyAnalytics} className="btn btn-primary md:ml-auto">Update</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="card p-3 text-center">
                <div className="text-xs text-neutral-600">Completed</div>
                <div className="text-2xl font-semibold text-green-600">{analytics.totals.completed}</div>
              </div>
              <div className="card p-3 text-center">
                <div className="text-xs text-neutral-600">U</div>
                <div className="text-2xl font-semibold text-red-600">{analytics.totals.absent}</div>
              </div>
              <div className="card p-3 text-center">
                <div className="text-xs text-neutral-600">UI</div>
                <div className="text-2xl font-semibold text-yellow-600">{analytics.totals.warned}</div>
              </div>
              <div className="card p-3 text-center">
                <div className="text-xs text-neutral-600">Total</div>
                <div className="text-2xl font-semibold text-neutral-800">{analytics.totals.total}</div>
              </div>
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
