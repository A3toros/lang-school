import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import LoginForm from '../components/login/LoginForm'
import TeacherShowcase from '../components/login/TeacherShowcase'
import MissionSection from '../components/login/MissionSection'
import CoursesCarousel from '../components/login/CoursesCarousel'
import apiService from '../utils/api'

const LoginPage = () => {
  const { login } = useAuth()
  const [loginError, setLoginError] = useState('')
  const [missionContent, setMissionContent] = useState(null)
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      setLoading(true)
      const [missionResponse, coursesResponse, teachersResponse] = await Promise.all([
        apiService.getMissionContent(),
        apiService.getActiveCourses(),
        apiService.getRandomTeachers(3)
      ])

      if (missionResponse.success) {
        setMissionContent(missionResponse.mission)
      }
      if (coursesResponse.success) {
        setCourses(coursesResponse.courses)
      }
      if (teachersResponse.success) {
        setTeachers(teachersResponse.teachers)
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (username, password) => {
    setLoginError('')
    const result = await login(username, password)
    
    if (!result.success) {
      setLoginError(result.error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header with Login Form */}
      <div className="absolute top-0 right-0 p-6 z-10">
        <LoginForm onLogin={handleLogin} error={loginError} />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-neutral-800 mb-4">
            Welcome to <span className="text-primary-600">LangSchool</span>
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Master new languages with our experienced teachers and innovative teaching methods
          </p>
        </motion.div>

        {/* Teacher Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <TeacherShowcase teachers={teachers} />
        </motion.div>

        {/* Mission Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <MissionSection mission={missionContent} />
        </motion.div>

        {/* Courses Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <CoursesCarousel courses={courses} />
        </motion.div>
      </div>
    </div>
  )
}

export default LoginPage
