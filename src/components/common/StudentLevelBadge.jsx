import React from 'react'

const StudentLevelBadge = ({ level, size = 'sm' }) => {
  if (!level) return null

  const getBadgeStyles = (level, size) => {
    const baseStyles = 'inline-flex items-center rounded-full font-medium'
    
    const sizeStyles = {
      xs: 'px-1.5 py-0.5 text-xs',
      sm: 'px-2 py-1 text-xs',
      md: 'px-2.5 py-1.5 text-sm',
      lg: 'px-3 py-1.5 text-sm'
    }
    
    const colorStyles = {
      'A1': 'bg-gray-100 text-gray-800',
      'A1+': 'bg-gray-100 text-gray-800',
      'A2': 'bg-gray-100 text-gray-800',
      'B1': 'bg-gray-100 text-gray-800',
      'B2': 'bg-gray-100 text-gray-800',
      'C1': 'bg-gray-100 text-gray-800',
      'C2': 'bg-gray-100 text-gray-800'
    }
    
    return `${baseStyles} ${sizeStyles[size]} ${colorStyles[level] || 'bg-gray-100 text-gray-800'}`
  }

  return (
    <span className={getBadgeStyles(level, size)}>
      {level}
    </span>
  )
}

export default StudentLevelBadge
