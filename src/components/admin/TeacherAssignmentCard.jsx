import React from 'react'
import { motion } from 'framer-motion'

const TeacherAssignmentCard = ({ 
  teacher, 
  onRemove, 
  onSetPrimary, 
  loading = false 
}) => {
  const handleRemove = () => {
    if (window.confirm(`Are you sure you want to remove ${teacher.name} from this student?`)) {
      onRemove(teacher.id)
    }
  }

  const handleSetPrimary = () => {
    if (window.confirm(`Are you sure you want to set ${teacher.name} as the primary teacher?`)) {
      onSetPrimary(teacher.id)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-200 ${
        teacher.is_primary 
          ? 'bg-blue-50 border-blue-200 shadow-sm' 
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {teacher.photo_url ? (
            <img 
              src={teacher.photo_url} 
              alt={teacher.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <span className="text-sm font-medium text-gray-600">
                {teacher.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{teacher.name}</span>
            {teacher.is_primary && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                Primary
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Assigned: {new Date(teacher.assigned_date).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {!teacher.is_primary && (
          <button
            onClick={handleSetPrimary}
            disabled={loading}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Set Primary
          </button>
        )}
        <button
          onClick={handleRemove}
          disabled={loading}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Remove
        </button>
      </div>
    </motion.div>
  )
}

export default TeacherAssignmentCard
