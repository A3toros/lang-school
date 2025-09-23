import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'
import MonthlyStatsCard from './MonthlyStatsCard'

const TeacherMonthlyStats = ({ teacherId, year, month }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (teacherId && year && month) {
      fetchMonthlyStats(teacherId, year, month)
    }
  }, [teacherId, year, month])

  const fetchMonthlyStats = async (id, y, m) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.getTeacherMonthlyStats(id, y, m)
      
      if (response.success) {
        setStats(response.stats)
      } else {
        setError(response.error || 'Failed to fetch stats')
      }
    } catch (err) {
      console.error('Error fetching monthly stats:', err)
      setError('Failed to fetch monthly statistics')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentMonthStats = async () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    await fetchMonthlyStats(teacherId, currentYear, currentMonth)
  }

  const getPreviousMonthStats = async () => {
    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    
    await fetchMonthlyStats(teacherId, prevYear, prevMonth)
  }

  const getNextMonthStats = async () => {
    const now = new Date()
    const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
    const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
    
    await fetchMonthlyStats(teacherId, nextYear, nextMonth)
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
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
            onClick={getCurrentMonthStats}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="card p-6">
        <div className="text-center text-neutral-600">
          <p>No statistics available for this period.</p>
        </div>
      </div>
    )
  }

  const currentStats = stats[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-neutral-800">
          Monthly Statistics - {currentStats.teacher_name}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={getPreviousMonthStats}
            className="p-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
            title="Previous Month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={getCurrentMonthStats}
            className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
            title="Current Month"
          >
            Current
          </button>
          <button
            onClick={getNextMonthStats}
            className="p-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
            title="Next Month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MonthlyStatsCard
          title="Total Lessons"
          value={currentStats.total_lessons || 0}
          icon="📚"
          color="primary"
        />
        <MonthlyStatsCard
          title="Completed Lessons"
          value={currentStats.completed_lessons || 0}
          icon="✅"
          color="success"
        />
        <MonthlyStatsCard
          title="U Lessons"
          value={currentStats.absent_lessons || 0}
          icon="❌"
          color="error"
        />
        <MonthlyStatsCard
          title="Attendance Rate"
          value={`${currentStats.attendance_percentage || 0}%`}
          icon="📊"
          color="info"
        />
      </div>

      <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
        <h4 className="font-medium text-neutral-800 mb-2">Additional Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-neutral-600">
          <div>
            <span className="font-medium">Unique Students:</span> {currentStats.unique_students_taught || 0}
          </div>
          <div>
            <span className="font-medium">Period:</span> {currentStats.month}/{currentStats.year}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default TeacherMonthlyStats
