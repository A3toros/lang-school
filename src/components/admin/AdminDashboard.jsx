import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null)
  const [teacherPerformance, setTeacherPerformance] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [bucket, setBucket] = useState('week')
  const [analytics, setAnalytics] = useState({ loading: false, data: [], totals: { completed: 0, absent: 0, warned: 0, total: 0 } })

  useEffect(() => {
    fetchDashboardData()
    fetchTeachers()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAdminDashboard()
      
      if (response.success) {
        setOverview(response.overview)
        setTeacherPerformance(response.teacher_performance || [])
        setRecentActivity(response.recent_activity || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const res = await apiService.getTeachers()
      if (res.success) setTeachers(res.teachers || [])
    } catch (e) {
      console.error('Error fetching teachers', e)
    }
  }

  const fetchTeacherAnalytics = async () => {
    if (!selectedTeacherId || !fromDate || !toDate) return
    setAnalytics(prev => ({ ...prev, loading: true }))
    try {
      const res = await apiService.getTeacherAttendanceAnalytics(parseInt(selectedTeacherId), fromDate, toDate, bucket)
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
      console.error('Teacher analytics error', e)
      setAnalytics(prev => ({ ...prev, loading: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card p-6"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100 text-primary-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Total Teachers</p>
              <p className="text-2xl font-bold text-neutral-900">{overview?.total_teachers || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-secondary-100 text-secondary-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Total Students</p>
              <p className="text-2xl font-bold text-neutral-900">{overview?.total_students || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-success-100 text-success-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Completed Lessons</p>
              <p className="text-2xl font-bold text-neutral-900">{overview?.completed_lessons || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-info-100 text-info-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Today's Lessons</p>
              <p className="text-2xl font-bold text-neutral-900">{overview?.today_lessons || 0}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Teacher Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Teacher Performance</h3>
        <div className="space-y-4">
          {teacherPerformance.map((teacher, index) => (
            <div key={teacher.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                  {teacher.name.charAt(0)}
                </div>
                <div className="ml-3">
                  <p className="font-medium text-neutral-800">{teacher.name}</p>
                  <p className="text-sm text-neutral-600">{teacher.unique_students} students</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-800">
                  {teacher.completed_lessons} / {teacher.total_lessons} lessons
                </p>
                <p className="text-sm text-neutral-600">
                  {teacher.attendance_rate}% attendance
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Teacher Date-Range Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Teacher Analytics (Date Range)</h3>
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-3 md:space-y-0">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-neutral-600 mb-1">Teacher</label>
            <select className="input w-full" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
              <option value="">Select teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
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
          <button onClick={fetchTeacherAnalytics} className="btn btn-primary md:ml-auto">Update</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="card p-3 text-center">
            <div className="text-xs text-neutral-600">Completed</div>
            <div className="text-2xl font-semibold text-green-600">{analytics.totals.completed}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-neutral-600">Absent</div>
            <div className="text-2xl font-semibold text-red-600">{analytics.totals.absent}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-neutral-600">Warned</div>
            <div className="text-2xl font-semibold text-yellow-600">{analytics.totals.warned}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-neutral-600">Total</div>
            <div className="text-2xl font-semibold text-neutral-800">{analytics.totals.total}</div>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center p-3 bg-neutral-50 rounded-lg">
              <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm text-neutral-800">
                  <span className="font-medium">{activity.teacher_name}</span> completed lesson with{' '}
                  <span className="font-medium">{activity.student_name}</span>
                </p>
                <p className="text-xs text-neutral-600">
                  {new Date(activity.activity_date).toLocaleDateString()} at {activity.time_slot}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default AdminDashboard
