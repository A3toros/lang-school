import React, { useState } from 'react'
import { motion } from 'framer-motion'

const LoginForm = ({ onLogin, error = '' }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!username.trim() || !password.trim()) {
      return
    }

    setLoading(true)
    try {
      await onLogin(username.trim(), password)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Login</h2>
        <p className="text-neutral-600">Access your dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
          >
            {error}
          </motion.div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            required
            disabled={loading}
          />
        </div>

        <motion.button
          type="submit"
          disabled={loading || !username.trim() || !password.trim()}
          className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Logging in...
            </div>
          ) : (
            'Login'
          )}
        </motion.button>
      </form>

      <div className="mt-6 text-center">
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-700">
            <strong>Note:</strong> Authentication is disabled in development mode. 
            The app will show fallback data without backend APIs.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default LoginForm