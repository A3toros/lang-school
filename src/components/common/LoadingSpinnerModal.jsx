import React from 'react'
import { motion } from 'framer-motion'

const LoadingSpinnerModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  loadingText = "Saving...",
  confirmButtonColor = "bg-primary-500 hover:bg-primary-600",
  disabled = false
}) => {
  if (!isOpen) return null

  const handleConfirm = async () => {
    if (loading || disabled) return
    if (onConfirm) {
      await onConfirm()
    }
  }

  const handleCancel = () => {
    if (loading) return
    if (onCancel) {
      onCancel()
    } else if (onClose) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          {!loading && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {children}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || disabled}
            className={`flex-1 px-4 py-2 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ${confirmButtonColor}`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {loadingText}
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default LoadingSpinnerModal
