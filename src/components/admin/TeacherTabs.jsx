import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import apiService from '../../utils/api'

const TeacherTabs = ({ selectedTeacher, onTeacherSelect }) => {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        
        if (response.success) {
          const teachers = response.teachers || []
          setTeachers(teachers)
          console.log('✅ [TEACHER_TABS] Teachers loaded successfully:', teachers.length)
          
          // If no teachers found, show a helpful message
          if (teachers.length === 0) {
            console.log('⚠️ [TEACHER_TABS] No teachers found in database')
          }
        } else {
          throw new Error(response.error || 'Failed to load teachers')
        }
      } catch (err) {
        console.error('❌ [TEACHER_TABS] Error fetching teachers:', err)
        setError(`Failed to load teachers: ${err.message}`)
        setTeachers([])
      } finally {
        setLoading(false)
      }
    }

    fetchTeachers()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Teachers</h3>
        <div className="text-center py-8">
          <div className="text-error text-sm mb-2">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="text-primary-600 hover:text-primary-700 text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Teachers</h3>
      
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
  )
}

export default TeacherTabs
