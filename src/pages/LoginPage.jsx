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
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false)

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      setLoading(true)
      
      // Use fallback data for development when APIs are not available
      const [missionResponse, coursesResponse, teachersResponse] = await Promise.allSettled([
        apiService.getMissionContent(),
        apiService.getActiveCourses(),
        apiService.getRandomTeachers(3)
      ])

      // Handle mission content
      if (missionResponse.status === 'fulfilled' && missionResponse.value.success) {
        setMissionContent(missionResponse.value.mission)
      } else {
        // Fallback mission content
        setMissionContent({
          title: 'Our Mission',
          content: 'At LangSchool, we believe that language learning should be engaging, practical, and accessible to everyone. Our mission is to break down language barriers and connect people across cultures through innovative teaching methods, experienced instructors, and a supportive learning environment.',
          banner_image: '/pics/banners/mission-banner.jpg'
        })
        setIsDevelopmentMode(true)
      }

      // Handle courses
      if (coursesResponse.status === 'fulfilled' && coursesResponse.value.success) {
        setCourses(coursesResponse.value.courses)
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
            detailed_description: 'Join our dynamic Spanish Conversation Club where you will practice speaking through engaging discussions.'
          }
        ])
      }

      // Handle teachers
      if (teachersResponse.status === 'fulfilled' && teachersResponse.value.success) {
        setTeachers(teachersResponse.value.teachers)
      } else {
        // Fallback teachers data
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
      console.error('Error fetching content:', error)
      
      // Set fallback data on complete failure
      setMissionContent({
        title: 'Our Mission',
        content: 'At LangSchool, we believe that language learning should be engaging, practical, and accessible to everyone.',
        banner_image: '/pics/banners/mission-banner.jpg'
      })
      setIsDevelopmentMode(true)
      
      setCourses([
        {
          id: 1,
          name: 'English for Beginners',
          description: 'Start your English learning journey with our comprehensive beginner course.',
          background_image: '/pics/courses/english-beginner.jpg',
          detailed_description: 'Our English for Beginners course is designed to take you from zero to conversational level in just 6 months.'
        }
      ])
      
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
      {/* Development Mode Indicator */}
      {isDevelopmentMode && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.726-1.36 3.491 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">
                <strong>Development Mode:</strong> Running with fallback data. Backend APIs are not available.
              </p>
            </div>
          </div>
        </div>
      )}

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
