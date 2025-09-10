import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/common/Header'
import TeacherShowcase from '../components/login/TeacherShowcase'
import MissionSection from '../components/login/MissionSection'
import CoursesCarousel from '../components/login/CoursesCarousel'
import apiService from '../utils/api'
import { missionContent, courses, loginPageContent } from '../data/staticContent'
// Simple debug logger to avoid import issues
const apiDebugger = {
  info: (category, message, data) => console.log(`[${category}] ${message}`, data || ''),
  warning: (category, message, data) => console.warn(`[${category}] ${message}`, data || ''),
  error: (category, message, data) => console.error(`[${category}] ${message}`, data || ''),
  success: (category, message, data) => console.log(`✅ [${category}] ${message}`, data || ''),
  debug: (category, message, data) => console.log(`🐛 [${category}] ${message}`, data || ''),
  enable: () => console.log('Debug enabled')
}

const LoginPage = () => {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [loginError, setLoginError] = useState('')
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeachers()
  }, [])

  // Navigate to appropriate dashboard when user is logged in
  useEffect(() => {
    if (user) {
      apiDebugger.info('LOGIN_PAGE', 'User logged in, navigating to dashboard', { 
        role: user.role,
        userId: user.id 
      })
      
      if (user.role === 'admin') {
        apiDebugger.success('LOGIN_PAGE', 'Navigating to admin dashboard')
        navigate('/admin')
      } else if (user.role === 'teacher') {
        apiDebugger.success('LOGIN_PAGE', 'Navigating to teacher dashboard')
        navigate('/teacher')
      }
    }
  }, [user, navigate])

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      
      // Only fetch teachers from API - mission and courses are now static
      const teachersResponse = await apiService.getRandomTeachers(3)
      
      if (teachersResponse.success) {
        setTeachers(teachersResponse.teachers)
      } else {
        // Fallback teachers data when API is unavailable
        setTeachers([
          {
            id: 1,
            name: 'Sarah Johnson',
            description: 'Experienced English teacher with 10+ years of experience. Specializes in business English and conversation practice.',
            photo_url: '/pics/teachers/sarah.jpg'
          },
          {
            id: 2,
            name: 'Michael Chen',
            description: 'Native Mandarin speaker teaching Chinese language and culture. Patient and encouraging teaching style.',
            photo_url: '/pics/teachers/michael.jpg'
          },
          {
            id: 3,
            name: 'Elena Rodriguez',
            description: 'Spanish teacher from Madrid with expertise in grammar and pronunciation. Loves teaching through music and culture.',
            photo_url: '/pics/teachers/elena.jpg'
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
      
      // Set fallback teachers data on complete failure
      setTeachers([
        {
          id: 1,
          name: 'Sarah Johnson',
          description: 'Experienced English teacher with 10+ years of experience.',
          photo_url: '/pics/teachers/sarah.jpg'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (username, password) => {
    apiDebugger.info('LOGIN_PAGE', 'handleLogin called', { 
      username, 
      hasPassword: !!password,
      loginFunction: typeof login
    })
    
    setLoginError('')
    
    if (!login || typeof login !== 'function') {
      apiDebugger.error('LOGIN_PAGE', 'Login function not available from useAuth', { 
        login: login,
        type: typeof login
      })
      setLoginError('Login function not available')
      return
    }
    
    try {
      apiDebugger.info('LOGIN_PAGE', 'Calling login function from AuthContext', { username })
      const result = await login(username, password)
      
      apiDebugger.info('LOGIN_PAGE', 'Login result received', { 
        result: result,
        success: result?.success,
        error: result?.error
      })
      
      if (!result.success) {
        apiDebugger.warning('LOGIN_PAGE', 'Login failed', { 
          error: result.error,
          username
        })
        setLoginError(result.error)
      } else {
        apiDebugger.success('LOGIN_PAGE', 'Login successful, waiting for user state update', { 
          username,
          result: result
        })
        // Don't set error, let the useEffect handle navigation
      }
    } catch (error) {
      apiDebugger.error('LOGIN_PAGE', 'Login function threw error', { 
        error: error.message,
        stack: error.stack,
        username
      })
      setLoginError(error.message || 'Login failed')
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
      {/* Header with integrated login */}
      <Header onLogin={handleLogin} loginError={loginError} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-neutral-800 mb-4">
            {loginPageContent.title}
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            {loginPageContent.subtitle}
          </p>
        </motion.div>

        {/* Teacher Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <TeacherShowcase 
            teachers={teachers} 
            title={loginPageContent.teacherShowcaseTitle}
            subtitle={loginPageContent.teacherShowcaseSubtitle}
          />
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
          <CoursesCarousel 
            courses={courses} 
            title={loginPageContent.coursesTitle}
            subtitle={loginPageContent.coursesSubtitle}
          />
        </motion.div>
      </div>
    </div>
  )
}

export default LoginPage
