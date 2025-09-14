import React from 'react'
import { motion } from 'framer-motion'

const TeacherAssignmentCard = ({ 
  teacher, 
  loading = false 
}) => {

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center justify-between p-3 border rounded-lg transition-all duration-200 bg-gray-50 border-gray-200 hover:bg-gray-100"
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
          </div>
          <div className="text-sm text-gray-500">
            Assigned: {new Date(teacher.assigned_date).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500">Connected</span>
      </div>
    </motion.div>
  )
}

export default TeacherAssignmentCard
