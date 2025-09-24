import React, { useState, useEffect } from 'react'
import apiService from '../../utils/api'

const ExtensionReminder = ({ onExtendSchedules }) => {
  const [needsExtension, setNeedsExtension] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkReminderOncePerDay()
  }, [])

  const checkReminderOncePerDay = async () => {
    try {
      setLoading(true)
      
      // Get current date and check if we've already checked today
      const today = new Date().toDateString()
      const lastCheckData = localStorage.getItem('extensionCheckData')
      
      if (lastCheckData) {
        const { date: lastCheckDate, needsExtension: lastNeedsExtension, count: lastCount } = JSON.parse(lastCheckData)
        
        if (lastCheckDate === today) {
          // Already checked today, use cached result
          console.log('✅ [EXTENSION_REMINDER] Using cached result from today:', { lastNeedsExtension, lastCount })
          setNeedsExtension(lastNeedsExtension)
          setCount(lastCount)
          setLoading(false)
          return
        } else {
          // Different day, delete old data
          localStorage.removeItem('extensionCheckData')
          console.log('🗑️ [EXTENSION_REMINDER] Deleted old check data from:', lastCheckDate)
        }
      }
      
      // Check reminder (new day or first time)
      console.log('🔍 [EXTENSION_REMINDER] Checking reminder for today:', today)
      const response = await apiService.checkExtensionReminder()
      
      if (response.success) {
        setNeedsExtension(response.needsExtension)
        setCount(response.count)
        
        // Write current date and checked status to localStorage
        const checkData = {
          date: today,
          needsExtension: response.needsExtension,
          count: response.count
        }
        localStorage.setItem('extensionCheckData', JSON.stringify(checkData))
        console.log('💾 [EXTENSION_REMINDER] Saved check data to localStorage:', checkData)
      }
    } catch (error) {
      console.error('❌ [EXTENSION_REMINDER] Error checking extension reminder:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExtendAndRefresh = async () => {
    await onExtendSchedules()
    await checkReminderOncePerDay() // Refresh after extending
  }

  const handleForceRefresh = async () => {
    // Clear cache and force fresh check
    localStorage.removeItem('extensionCheckData')
    console.log('🗑️ [EXTENSION_REMINDER] Cleared cache, forcing fresh check')
    await checkReminderOncePerDay()
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-4 h-4 bg-blue-300 rounded-full"></div>
          <div className="h-4 bg-blue-300 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  if (!needsExtension) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-yellow-800">
            ⚠️ {count} schedules need extension
          </h3>
          <p className="text-sm text-yellow-600">
            Some schedules have 2 weeks or less remaining
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExtendAndRefresh}
            className="btn btn-primary text-sm"
          >
            Extend +1 Week
          </button>
          <button
            onClick={handleForceRefresh}
            className="btn btn-secondary text-sm"
            title="Force refresh to check updated count"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExtensionReminder
