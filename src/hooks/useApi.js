import { useState, useCallback } from 'react'
import apiService from '../utils/api'

export const useApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const makeRequest = useCallback(async (apiCall, ...args) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiCall(...args)
      return result
    } catch (err) {
      setError(err.message || 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getTeachers = useCallback((...args) => 
    makeRequest(apiService.getTeachers, ...args), [makeRequest])
  
  const getStudents = useCallback((...args) => 
    makeRequest(apiService.getStudents, ...args), [makeRequest])
  
  const getSchedules = useCallback((...args) => 
    makeRequest(apiService.getSchedules, ...args), [makeRequest])
  
  const getAttendance = useCallback((...args) => 
    makeRequest(apiService.getAttendance, ...args), [makeRequest])
  
  const getReports = useCallback((...args) => 
    makeRequest(apiService.getReports, ...args), [makeRequest])
  
  const getContent = useCallback((...args) => 
    makeRequest(apiService.getContent, ...args), [makeRequest])
  
  const getAnalytics = useCallback((...args) => 
    makeRequest(apiService.getAnalytics, ...args), [makeRequest])
  
  const getUsers = useCallback((...args) => 
    makeRequest(apiService.getUsers, ...args), [makeRequest])
  
  const getDashboard = useCallback((...args) => 
    makeRequest(apiService.getDashboard, ...args), [makeRequest])

  return {
    loading,
    error,
    clearError: () => setError(null),
    getTeachers,
    getStudents,
    getSchedules,
    getAttendance,
    getReports,
    getContent,
    getAnalytics,
    getUsers,
    getDashboard
  }
}

export default useApi
