import { motion, AnimatePresence } from 'framer-motion'

const SaveWarningModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDiscard, 
  pendingAction,
  changesSummary 
}) => {
  if (!isOpen) return null

  const handleSave = () => {
    onSave()
    onClose()
  }

  const handleDiscard = () => {
    onDiscard()
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 shadow-xl"
        >
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
          </div>

          <div className="mb-4">
            <p className="text-gray-600 mb-3">
              You have unsaved changes to the schedule. What would you like to do?
            </p>
            
            {changesSummary && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Pending Changes:</p>
                <div className="flex space-x-4 text-sm text-gray-600">
                  {changesSummary.additions > 0 && (
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      {changesSummary.additions} additions
                    </span>
                  )}
                  {changesSummary.deletions > 0 && (
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                      {changesSummary.deletions} deletions
                    </span>
                  )}
                  {changesSummary.modifications > 0 && (
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                      {changesSummary.modifications} modifications
                    </span>
                  )}
                </div>
              </div>
            )}

            {pendingAction && (
              <p className="text-sm text-gray-500">
                <strong>Next action:</strong> {pendingAction}
              </p>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleDiscard}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
            >
              Save & Continue
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default SaveWarningModal
