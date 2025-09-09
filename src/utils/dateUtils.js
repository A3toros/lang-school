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
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const monday = new Date(today.setDate(diff))
  return monday.toISOString().split('T')[0]
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
    '6:30-7:00', '7:00-7:30', '7:30-8:00', '8:00-8:30', '8:30-9:00',
    '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00', '11:00-11:30',
    '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
    '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30',
    '16:30-17:00', '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00',
    '19:00-19:30', '19:30-20:00', '20:00-20:30', '20:30-21:00', '21:00-21:30',
    '21:30-22:00'
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

export default {
  formatDate,
  formatTime,
  getCurrentWeekStart,
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
  getRelativeTime
}
