import React from 'react'
import { motion } from 'framer-motion'

const MonthlyStatsCard = ({ 
  title, 
  value, 
  icon, 
  color = 'primary',
  subtitle = null,
  trend = null 
}) => {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    error: 'bg-error-100 text-error-600',
    info: 'bg-info-100 text-info-600',
    warning: 'bg-warning-100 text-warning-600'
  }

  const getTrendIcon = (trendValue) => {
    if (trendValue > 0) {
      return (
        <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
        </svg>
      )
    } else if (trendValue < 0) {
      return (
        <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
        </svg>
      )
    }
    return null
  }

  const getTrendColor = (trendValue) => {
    if (trendValue > 0) return 'text-success'
    if (trendValue < 0) return 'text-error'
    return 'text-neutral-500'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
          <div className="flex items-center space-x-2">
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
            {trend !== null && (
              <div className={`flex items-center space-x-1 ${getTrendColor(trend)}`}>
                {getTrendIcon(trend)}
                <span className="text-xs font-medium">
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default MonthlyStatsCard
