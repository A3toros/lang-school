import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SuccessNotification = ({ 
  isVisible, 
  onClose, 
  title, 
  message, 
  type = 'success', // 'success', 'error', 'warning', 'info'
  duration = 4000 
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-400',
          title: 'text-green-800',
          message: 'text-green-700',
          iconSymbol: '✓'
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-400',
          title: 'text-red-800',
          message: 'text-red-700',
          iconSymbol: '✕'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-400',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          iconSymbol: '⚠'
        }
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-400',
          title: 'text-blue-800',
          message: 'text-blue-700',
          iconSymbol: 'ℹ'
        }
      default:
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-400',
          title: 'text-green-800',
          message: 'text-green-700',
          iconSymbol: '✓'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`${styles.bg} ${styles.border} border rounded-lg shadow-lg p-6 max-w-md mx-4 pointer-events-auto`}
          >
            <div className="flex items-start">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.bg} flex items-center justify-center`}>
                <span className={`text-lg font-bold ${styles.icon}`}>
                  {styles.iconSymbol}
                </span>
              </div>
              <div className="ml-4 flex-1">
                <h3 className={`text-lg font-semibold ${styles.title}`}>
                  {title}
                </h3>
                {message && (
                  <p className={`mt-1 text-sm ${styles.message}`}>
                    {message}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className={`ml-4 flex-shrink-0 ${styles.title} hover:opacity-70 transition-opacity`}
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default SuccessNotification
