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
        const response = await apiService.getTeachers()
        setTeachers(response.teachers || [])
      } catch (err) {
        setError('Failed to load teachers')
        console.error('Error fetching teachers:', err)
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
      <div className="text-center py-8">
        <p className="text-error text-sm">{error}</p>
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

      {teachers.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <p>No teachers found</p>
        </div>
      )}
    </div>
  )
}

export default TeacherTabs
