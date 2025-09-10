import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiDebugger from '../../utils/debug'

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    const updateLogs = () => {
      setLogs(apiDebugger.getLogs())
    }

    // Update logs every second
    const interval = setInterval(updateLogs, 1000)
    updateLogs() // Initial load

    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true
    return log.level === filter
  })

  const getLevelColor = (level) => {
    const colors = {
      info: 'text-blue-600 bg-blue-50',
      success: 'text-green-600 bg-green-50',
      warning: 'text-yellow-600 bg-yellow-50',
      error: 'text-red-600 bg-red-50',
      debug: 'text-purple-600 bg-purple-50'
    }
    return colors[level] || 'text-gray-600 bg-gray-50'
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const exportLogs = () => {
    apiDebugger.exportLogs()
  }

  const clearLogs = () => {
    apiDebugger.clearLogs()
    setLogs([])
  }

  const toggleDebug = () => {
    if (apiDebugger.isEnabled) {
      apiDebugger.disable()
    } else {
      apiDebugger.enable()
    }
  }

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 w-96 h-96 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">API Debug Panel</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleDebug}
            className={`px-2 py-1 text-xs rounded ${
              apiDebugger.isEnabled 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}
          >
            {apiDebugger.isEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-3 border-b border-gray-200 flex items-center space-x-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="all">All</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
        
        <button
          onClick={exportLogs}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
        >
          Export
        </button>
        
        <button
          onClick={clearLogs}
          className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
        >
          Clear
        </button>
        
        <label className="flex items-center text-xs">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="mr-1"
          />
          Auto-scroll
        </label>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence>
          {filteredLogs.map((log, index) => (
            <motion.div
              key={`${log.timestamp}-${index}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`p-2 rounded text-xs ${getLevelColor(log.level)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{log.category}</span>
                <span className="text-gray-500">{formatTime(log.timestamp)}</span>
              </div>
              <div className="text-gray-700 mb-1">{log.message}</div>
              {log.data && (
                <details className="text-gray-600">
                  <summary className="cursor-pointer">Data</summary>
                  <pre className="mt-1 text-xs bg-gray-100 p-1 rounded overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredLogs.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            No logs found
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default DebugPanel
