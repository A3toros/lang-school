import React from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const Header = ({ title, showUserInfo = true }) => {
  const { user, logout } = useAuth()

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white shadow-sm border-b border-neutral-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-neutral-800">
              {title || 'LangSchool'}
            </h1>
          </div>

          {showUserInfo && user && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-800">
                  {user.teacher_name || user.username}
                </p>
                <p className="text-xs text-neutral-600 capitalize">
                  {user.role}
                </p>
              </div>
              <motion.button
                onClick={logout}
                className="btn-secondary text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Logout
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  )
}

export default Header
