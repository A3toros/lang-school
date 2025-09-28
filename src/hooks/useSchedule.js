import { useState, useEffect, useCallback } from 'react'
import { getCurrentWeekStart, getWeekEnd, getWeekDates, addDays, subtractDays } from '../utils/dateUtils'
import apiService from '../utils/api'

export const useSchedule = (teacherId = null) => {
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekStart())
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const weekDates = getWeekDates(currentWeek)
  const weekEnd = getWeekEnd(currentWeek)

  const fetchSchedule = useCallback(async (weekStart) => {
    if (!weekStart) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.getSchedules({ 
        week_start: weekStart,
        teacher_id: teacherId 
      })
      
      if (response.success) {
        setSchedule(response.schedules || [])
      } else {
        setError(response.error || 'Failed to fetch schedule')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch schedule')
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  const goToPreviousWeek = useCallback(() => {
    const newWeek = subtractDays(currentWeek, 7)
    setCurrentWeek(newWeek)
  }, [currentWeek])

  const goToNextWeek = useCallback(() => {
    const newWeek = addDays(currentWeek, 7)
    setCurrentWeek(newWeek)
  }, [currentWeek])

  const goToCurrentWeek = useCallback(() => {
    const today = getCurrentWeekStart()
    setCurrentWeek(today)
  }, [])

  const goToWeek = useCallback((weekStart) => {
    setCurrentWeek(weekStart)
  }, [])

  const updateSchedule = useCallback(async (scheduleData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.updateSchedule(scheduleData)
      
      if (response.success) {
        // Refresh the schedule
        await fetchSchedule(currentWeek)
        return { success: true }
      } else {
        setError(response.error || 'Failed to update schedule')
        return { success: false, error: response.error }
      }
    } catch (err) {
      setError(err.message || 'Failed to update schedule')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [currentWeek, fetchSchedule])

  const saveWeekSchedule = useCallback(async (weekData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.saveWeekSchedule({
        week_start: currentWeek,
        schedules: weekData
      })
      
      if (response.success) {
        await fetchSchedule(currentWeek)
        return { success: true }
      } else {
        setError(response.error || 'Failed to save schedule')
        return { success: false, error: response.error }
      }
    } catch (err) {
      setError(err.message || 'Failed to save schedule')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [currentWeek, fetchSchedule])

  const markAttendance = useCallback(async (scheduleId, status) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.markAttendance(scheduleId, status)
      
      if (response.success) {
        // Update local schedule
        // Let backend source of truth refresh the state; don’t set attendance_date optimistically
        setSchedule(prev => prev.map(item => 
          item.id === scheduleId 
            ? { ...item, attendance_status: status }
            : item
        ))
        return { success: true }
      } else {
        setError(response.error || 'Failed to mark attendance')
        return { success: false, error: response.error }
      }
    } catch (err) {
      setError(err.message || 'Failed to mark attendance')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const getScheduleForDay = useCallback((dayOfWeek) => {
    return schedule.filter(item => item.day_of_week === dayOfWeek)
  }, [schedule])

  const getScheduleForTimeSlot = useCallback((dayOfWeek, timeSlot) => {
    return schedule.find(item => 
      item.day_of_week === dayOfWeek && item.time_slot === timeSlot
    )
  }, [schedule])

  const getStudentSchedule = useCallback((studentId) => {
    return schedule.filter(item => item.student_id === studentId)
  }, [schedule])

  const getTeacherSchedule = useCallback((teacherId) => {
    return schedule.filter(item => item.teacher_id === teacherId)
  }, [schedule])

  const isCurrentWeek = useCallback(() => {
    const today = getCurrentWeekStart()
    return currentWeek === today
  }, [currentWeek])

  const getWeekInfo = useCallback(() => {
    return {
      start: currentWeek,
      end: weekEnd,
      dates: weekDates,
      isCurrent: isCurrentWeek()
    }
  }, [currentWeek, weekEnd, weekDates, isCurrentWeek])

  // Fetch schedule when week changes
  useEffect(() => {
    fetchSchedule(currentWeek)
  }, [currentWeek, fetchSchedule])

  return {
    // State
    currentWeek,
    schedule,
    loading,
    error,
    weekDates,
    weekEnd,
    
    // Actions
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    goToWeek,
    updateSchedule,
    saveWeekSchedule,
    markAttendance,
    refreshSchedule: () => fetchSchedule(currentWeek),
    
    // Getters
    getScheduleForDay,
    getScheduleForTimeSlot,
    getStudentSchedule,
    getTeacherSchedule,
    isCurrentWeek,
    getWeekInfo,
    
    // Utilities
    clearError: () => setError(null)
  }
}

export default useSchedule
