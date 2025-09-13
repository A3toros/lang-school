import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'
import TeachersTable from './TeachersTable'

const TeacherTabs = ({ selectedTeacher, onTeacherSelect, onTeachersLoaded }) => {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('management')

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true)
        setError('')
        console.log('🔍 [TEACHER_TABS] Fetching teachers...')
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
        
        const response = await Promise.race([
          apiService.getTeachers(),
          timeoutPromise
        ])
        
        console.log('📋 [TEACHER_TABS] Teachers response:', response)
        console.log('📋 [TEACHER_TABS] Response type:', typeof response)
        console.log('📋 [TEACHER_TABS] Response success:', response.success)
        console.log('📋 [TEACHER_TABS] Response teachers:', response.teachers)
        
        if (response.success) {
          const teachers = response.teachers || []
          setTeachers(teachers)
          console.log('✅ [TEACHER_TABS] Teachers loaded successfully:', teachers.length)
          
          // Notify parent component that teachers are loaded
          if (onTeachersLoaded) {
            onTeachersLoaded(teachers)
          }
          
          // If no teachers found, show a helpful message
          if (teachers.length === 0) {
            console.log('⚠️ [TEACHER_TABS] No teachers found in database')
          }
        } else {
          throw new Error(response.error || 'Failed to load teachers')
        }
      } catch (err) {
        console.error('❌ [TEACHER_TABS] Error fetching teachers:', err)
        
        // Check if it's a backend connectivity issue
        if (err.message.includes('Backend server not available') || 
            err.message.includes('fetch') || 
            err.message.includes('NetworkError') ||
            err.message.includes('Failed to fetch')) {
          setError('Backend server is not available. Please check if the development server is running and environment variables are configured.')
        } else if (err.message.includes('Request timeout')) {
          setError('Request timed out. The server may be slow or unresponsive.')
        } else {
          setError(`Failed to load teachers: ${err.message}`)
        }
        
        setTeachers([])
      } finally {
        setLoading(false)
      }
    }

    fetchTeachers()
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('management')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'management'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Teacher Management
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Lesson Overview
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'management' && (
          <div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div>
                  <div className="text-center py-8">
                    <div className="text-error text-sm mb-4 max-w-md mx-auto">
                      {error}
                    </div>
                    <div className="text-xs text-neutral-500 mb-4 max-w-md mx-auto">
                      <strong>Development Setup:</strong><br/>
                      1. Create a <code>.env</code> file with required environment variables<br/>
                      2. Run <code>npm run netlify:dev</code> to start the backend server<br/>
                      3. Ensure database connection is configured
                    </div>
                    <div className="flex gap-2 justify-center">
                      <button 
                        onClick={() => window.location.reload()} 
                        className="text-primary-600 hover:text-primary-700 text-sm underline"
                      >
                        Retry
                      </button>
                      <button 
                        onClick={() => {
                          setError('')
                          setLoading(true)
                          // Retry the fetch
                          window.location.reload()
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm underline"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {teachers.map((teacher, index) => (
          <motion.button
            key={teacher.id}
            onClick={() => onTeacherSelect(teacher)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedTeacher?.id === teacher.id
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-neutral-100 text-neutral-700 hover:bg-primary-100 hover:text-primary-700'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                <span className="text-xs font-semibold text-neutral-600">
                  {teacher.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <span className="whitespace-nowrap">{teacher.name}</span>
              {teacher.student_count > 0 && (
                <span className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">
                  {teacher.student_count}
                </span>
              )}
            </div>
          </motion.button>
        ))}
      </div>

            {teachers.length === 0 && !loading && (
              <div className="text-center py-8 text-neutral-500">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2">No teachers found</p>
                <p className="text-sm text-neutral-400 mb-4">
                  There are no teachers in the database yet.
                </p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="text-primary-600 hover:text-primary-700 text-sm underline"
                >
                  Refresh
                </button>
              </div>
                )}
                </div>
              )}
          </div>
        )}

        {activeTab === 'overview' && (
          <div>
            <TeachersTable />
          </div>
        )}
      </div>
    </div>
  )
}

export default TeacherTabs
