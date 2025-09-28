// Date utility functions

export const formatDate = (date, format = 'short') => {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const options = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  }
  
  return d.toLocaleDateString('en-US', options[format] || options.short)
}

export const formatTime = (timeString) => {
  if (!timeString) return ''
  
  // Handle time slots like "9:00-9:30"
  if (timeString.includes('-')) {
    return timeString
  }
  
  // Handle single time values
  const time = new Date(`2000-01-01T${timeString}`)
  if (isNaN(time.getTime())) return timeString
  
  return time.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
}

export const getCurrentWeekStart = () => {
  // Get current date in local timezone to avoid server timezone issues
  const now = new Date()
  
  // Get local date components to avoid timezone conversion issues
  const year = now.getFullYear()
  const month = now.getMonth()
  const date = now.getDate()
  
  // Create a new date object with local date components
  const today = new Date(year, month, date)
  const day = today.getDay()
  
  // Format date as YYYY-MM-DD using local components
  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
  console.log('🔍 [getCurrentWeekStart] Today:', todayStr)
  console.log('🔍 [getCurrentWeekStart] Day of week:', day)
  
  // JavaScript: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
  // Calculate days to subtract to get to Monday of current week
  // For Sunday (0): go back 6 days to get to Monday
  // For Monday (1): go back 0 days (same day)
  // For Tuesday (2): go back 1 day, etc.
  const daysToMonday = day === 0 ? 6 : day - 1
  
  console.log('🔍 [getCurrentWeekStart] Days to Monday:', daysToMonday)
  
  // Use setDate to avoid timezone issues
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysToMonday)
  
  // Format result using local components to avoid timezone conversion
  const mondayYear = monday.getFullYear()
  const mondayMonth = monday.getMonth()
  const mondayDate = monday.getDate()
  const result = `${mondayYear}-${String(mondayMonth + 1).padStart(2, '0')}-${String(mondayDate).padStart(2, '0')}`
  console.log('🔍 [getCurrentWeekStart] Calculated Monday:', result)
  
  return result
}

export const getWeekStart = (date) => {
  const d = new Date(date)
  
  // Get local date components to avoid timezone conversion issues
  const year = d.getFullYear()
  const month = d.getMonth()
  const dateNum = d.getDate()
  
  // Create a new date object with local date components
  const localDate = new Date(year, month, dateNum)
  const day = localDate.getDay()
  
  // JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
  // Calculate days to subtract to get to Monday
  const daysToMonday = day === 0 ? 6 : day - 1
  // Use setDate to avoid timezone issues
  const monday = new Date(localDate)
  monday.setDate(localDate.getDate() - daysToMonday)
  
  // Format result using local components to avoid timezone conversion
  const mondayYear = monday.getFullYear()
  const mondayMonth = monday.getMonth()
  const mondayDate = monday.getDate()
  return `${mondayYear}-${String(mondayMonth + 1).padStart(2, '0')}-${String(mondayDate).padStart(2, '0')}`
}

export const getWeekEnd = (weekStart) => {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end.toISOString().split('T')[0]
}

export const getWeekDates = (weekStart) => {
  const start = new Date(weekStart)
  const dates = []
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(date)
  }
  
  return dates
}

export const getDayName = (date) => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

export const getDayShortName = (date) => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

export const isToday = (date) => {
  const today = new Date()
  const d = new Date(date)
  return d.toDateString() === today.toDateString()
}

export const isPast = (date) => {
  const today = new Date()
  const d = new Date(date)
  return d < today
}

export const isFuture = (date) => {
  const today = new Date()
  const d = new Date(date)
  return d > today
}

export const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export const subtractDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

export const getTimeSlots = () => {
  return [
    '8:00-8:30', '8:30-9:00', '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00',
    '11:00-11:30', '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
    '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00',
    '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00',
    '20:00-20:30', '20:30-21:00', '21:00-21:30', '21:30-22:00'
  ]
}

export const getTimeSlotIndex = (timeSlot) => {
  const slots = getTimeSlots()
  return slots.indexOf(timeSlot)
}

export const getNextTimeSlot = (timeSlot) => {
  const slots = getTimeSlots()
  const currentIndex = slots.indexOf(timeSlot)
  return currentIndex < slots.length - 1 ? slots[currentIndex + 1] : null
}

export const getPreviousTimeSlot = (timeSlot) => {
  const slots = getTimeSlots()
  const currentIndex = slots.indexOf(timeSlot)
  return currentIndex > 0 ? slots[currentIndex - 1] : null
}

export const parseTimeSlot = (timeSlot) => {
  if (!timeSlot || !timeSlot.includes('-')) return null
  
  const [start, end] = timeSlot.split('-')
  return {
    start: start.trim(),
    end: end.trim(),
    duration: 30 // minutes
  }
}

export const formatTimeSlot = (startTime, endTime) => {
  return `${startTime}-${endTime}`
}

export const getCurrentMonth = () => {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    name: now.toLocaleDateString('en-US', { month: 'long' })
  }
}

export const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[monthNumber - 1] || ''
}

export const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate()
}

export const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month - 1, 1)
}

export const getLastDayOfMonth = (year, month) => {
  return new Date(year, month, 0)
}

export const isWeekend = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

export const getWeekNumber = (date) => {
  const d = new Date(date)
  const start = new Date(d.getFullYear(), 0, 1)
  const days = Math.floor((d - start) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + start.getDay() + 1) / 7)
}

export const getRelativeTime = (date) => {
  const now = new Date()
  const d = new Date(date)
  const diffInSeconds = Math.floor((now - d) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
  return `${Math.floor(diffInSeconds / 31536000)} years ago`
}

// Complex week numbering and month boundary logic
export const getMonthWeekNumber = (date, targetMonth, targetYear) => {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  
  // If the date is not in the target month/year, return null
  if (month !== targetMonth || year !== targetYear) {
    return null
  }
  
  // Get first day of target month
  const firstDayOfMonth = new Date(targetYear, targetMonth - 1, 1)
  const firstDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate which week of the month this date falls into
  const dayOfMonth = d.getDate()
  const weekNumber = Math.ceil((dayOfMonth + firstDayOfWeek) / 7)
  
  return weekNumber
}

export const getWeekInfoForMonth = (weekStart, targetMonth, targetYear) => {
  const weekDates = getWeekDates(weekStart)
  const firstDayOfMonth = new Date(targetYear, targetMonth - 1, 1)
  const lastDayOfMonth = new Date(targetYear, targetMonth, 0)
  
  // Check if this week contains any days from the target month
  const hasTargetMonthDays = weekDates.some(date => 
    date.getMonth() + 1 === targetMonth && date.getFullYear() === targetYear
  )
  
  if (!hasTargetMonthDays) {
    return {
      weekNumber: null,
      isCurrentMonth: false,
      days: weekDates.map(date => ({
        date,
        isCurrentMonth: false,
        isEditable: true // Allow editing all days in the week regardless of month
      }))
    }
  }
  
  // Find the first day of the week that belongs to target month
  const firstTargetMonthDay = weekDates.find(date => 
    date.getMonth() + 1 === targetMonth && date.getFullYear() === targetYear
  )
  
  // Calculate week number based on target month
  const weekNumber = getMonthWeekNumber(firstTargetMonthDay, targetMonth, targetYear)
  
  // Process each day in the week
  const days = weekDates.map(date => {
    const isCurrentMonth = date.getMonth() + 1 === targetMonth && date.getFullYear() === targetYear
    return {
      date,
      isCurrentMonth,
      isEditable: true // Allow editing all days in the week regardless of month
    }
  })
  
  return {
    weekNumber,
    isCurrentMonth: true,
    days
  }
}

export const getCurrentWeekInfo = (targetMonth, targetYear) => {
  const today = new Date()
  const currentWeekStart = getCurrentWeekStart()
  return getWeekInfoForMonth(currentWeekStart, targetMonth, targetYear)
}

export const getWeekNavigationInfo = (weekStart, targetMonth, targetYear) => {
  const weekInfo = getWeekInfoForMonth(weekStart, targetMonth, targetYear)
  
  if (!weekInfo.isCurrentMonth) {
    return {
      weekNumber: null,
      weekLabel: 'Other Month',
      isCurrentWeek: false
    }
  }
  
  const currentWeekInfo = getCurrentWeekInfo(targetMonth, targetYear)
  const isCurrentWeek = weekStart === getCurrentWeekStart()
  
  return {
    weekNumber: weekInfo.weekNumber,
    weekLabel: `Week ${weekInfo.weekNumber}`,
    isCurrentWeek
  }
}

export default {
  formatDate,
  formatTime,
  getCurrentWeekStart,
  getWeekStart,
  getWeekEnd,
  getWeekDates,
  getDayName,
  getDayShortName,
  isToday,
  isPast,
  isFuture,
  addDays,
  subtractDays,
  getTimeSlots,
  getTimeSlotIndex,
  getNextTimeSlot,
  getPreviousTimeSlot,
  parseTimeSlot,
  formatTimeSlot,
  getCurrentMonth,
  getMonthName,
  getDaysInMonth,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  isWeekend,
  getWeekNumber,
  getRelativeTime,
  getMonthWeekNumber,
  getWeekInfoForMonth,
  getCurrentWeekInfo,
  getWeekNavigationInfo
}
