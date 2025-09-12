import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import TeacherTabs from '../components/admin/TeacherTabs'
import ScheduleTable from '../components/admin/ScheduleTable'
import StudentManagement from '../components/admin/StudentManagement'
import TeacherManagement from '../components/admin/TeacherManagement'
import ContentManagement from '../components/admin/ContentManagement'
import { getCurrentWeekStart } from '../utils/dateUtils'

const AdminPage = () => {
  const { user, logout } = useAuth()
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekStart())
  const [activeTab, setActiveTab] = useState('schedule')

  const handleTeacherSelect = (teacher) => {
    setSelectedTeacher(teacher)
  }

  const handleStudentSelect = (student) => {
    setSelectedStudent(student)
  }

  const handleWeekChange = (weekStart) => {
    setCurrentWeek(weekStart)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-neutral-800">
                Rio talk Admin Page
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-neutral-600">
                Welcome, {user?.teacher_name || user?.username}. Let's talk!
              </span>
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 overflow-x-auto">
          {[
            { id: 'schedule', label: 'Schedule Management' },
            { id: 'teachers', label: 'Teachers' },
            { id: 'students', label: 'Students' },
            { id: 'content', label: 'Content Management' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <TeacherTabs
              onTeacherSelect={handleTeacherSelect}
              selectedTeacher={selectedTeacher}
            />
            <ScheduleTable
              teacherId={selectedTeacher?.id}
              weekStart={currentWeek}
              onWeekChange={handleWeekChange}
            />
          </motion.div>
        )}

        {activeTab === 'teachers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <TeacherManagement
              onTeacherSelect={handleTeacherSelect}
              selectedTeacher={selectedTeacher}
            />
          </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <StudentManagement
              onStudentSelect={handleStudentSelect}
              selectedStudent={selectedStudent}
            />
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <ContentManagement />
          </motion.div>
        )}
      </main>
    </div>
  )
}

export default AdminPage
