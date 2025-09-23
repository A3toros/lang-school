import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/common/Header'
import TeacherShowcase from '../components/login/TeacherShowcase'
import MissionSection from '../components/login/MissionSection'
import CoursesCarousel from '../components/login/CoursesCarousel'
import apiService from '../utils/api'
import { loginPageContent } from '../data/staticContent'
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
  const [missionContent, setMissionContent] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch showcase settings first to get the correct display count
      const showcaseResponse = await apiService.getShowcaseSettingsPublic()
      const displayCount = showcaseResponse.success ? showcaseResponse.settings.display_count : 3
      
      // Fetch teachers, mission content, and courses in parallel
      const [teachersResponse, missionResponse, coursesResponse] = await Promise.all([
        apiService.getRandomTeachers(displayCount),
        apiService.getMissionContent(),
        apiService.getCourses()
      ])
      
      // Handle teachers
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

      // Handle mission content
      if (missionResponse.success) {
        setMissionContent(missionResponse.mission)
      } else {
        // Fallback mission content
        setMissionContent({
          title: 'Our Mission',
          content: 'At Rio talk, we believe that language learning should be engaging, practical, and accessible to everyone. Our mission is to break down language barriers and connect people across cultures through innovative teaching methods, experienced instructors, and a supportive learning environment.',
          banner_image: '/pics/banners/mission-banner.jpg'
        })
      }

      // Handle courses
      if (coursesResponse.success) {
        setCourses(coursesResponse.courses)
      } else {
        // Fallback courses data
        setCourses([
          {
            id: 1,
            name: 'English for Beginners',
            description: 'Start your English learning journey with our comprehensive beginner course.',
            background_image: '/pics/courses/english-beginner.jpg',
            detailed_description: 'Our English for Beginners course is designed to take you from zero to conversational level in just 6 months.'
          },
          {
            id: 2,
            name: 'Business English Mastery',
            description: 'Advanced business communication skills for professionals.',
            background_image: '/pics/courses/business-english.jpg',
            detailed_description: 'Master the art of professional communication with our Business English course.'
          },
          {
            id: 3,
            name: 'Spanish Conversation Club',
            description: 'Improve your speaking skills through interactive conversations.',
            background_image: '/pics/courses/spanish-conversation.jpg',
            detailed_description: 'Join our dynamic Spanish Conversation Club for engaging discussions.'
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      
      // Set fallback data on complete failure
      setTeachers([
        {
          id: 1,
          name: 'Sarah Johnson',
          description: 'Experienced English teacher with 10+ years of experience.',
          photo_url: '/pics/teachers/sarah.jpg'
        }
      ])
      setMissionContent({
        title: 'Our Mission',
        content: 'At Rio talk, we believe that language learning should be engaging, practical, and accessible to everyone.',
        banner_image: '/pics/banners/mission-banner.jpg'
      })
      setCourses([
        {
          id: 1,
          name: 'English for Beginners',
          description: 'Start your English learning journey.',
          background_image: '/pics/courses/english-beginner.jpg',
          detailed_description: 'Learn English from zero to conversational level.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

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
      <div className="w-full px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 mx-auto"
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
          className="mb-16 mx-auto"
        >
          <TeacherShowcase 
            teachers={teachers} 
            title={loginPageContent.teacherShowcaseTitle}
            subtitle={loginPageContent.teacherShowcaseSubtitle}
          />
        </motion.div>

        {/* Mission Section */}
        {missionContent && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-16 mx-auto"
          >
            <MissionSection mission={missionContent} />
          </motion.div>
        )}

        {/* Courses Carousel */}
        {courses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mx-auto"
          >
            <CoursesCarousel 
              courses={courses} 
              title={loginPageContent.coursesTitle}
              subtitle={loginPageContent.coursesSubtitle}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default LoginPage
