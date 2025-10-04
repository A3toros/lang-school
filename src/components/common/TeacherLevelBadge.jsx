import React from 'react'

const TeacherLevelBadge = ({ level, size = 'sm' }) => {
  if (!level) return null

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-1.5 text-base',
    lg: 'px-4 py-2 text-lg'
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-700 ${sizeClasses[size]}`}>
      {level}
    </span>
  )
}

export default TeacherLevelBadge
