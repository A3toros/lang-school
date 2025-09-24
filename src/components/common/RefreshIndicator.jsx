import React from 'react'
import { motion } from 'framer-motion'

const RefreshIndicator = ({ 
  isRefreshing = false, 
  message = "Refreshing...", 
  size = "sm",
  className = "" 
}) => {
  if (!isRefreshing) return null

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`flex items-center space-x-2 ${className}`}
    >
      <div className={`animate-spin rounded-full border-2 border-primary-500 border-t-transparent ${sizeClasses[size]}`}></div>
      <span className={`text-neutral-600 ${textSizeClasses[size]}`}>{message}</span>
    </motion.div>
  )
}

export default RefreshIndicator
