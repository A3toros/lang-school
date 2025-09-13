import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import TeacherTabs from '../components/admin/TeacherTabs'
import ScheduleTable from '../components/admin/ScheduleTable'
import StudentManagement from '../components/admin/StudentManagement'
import TeacherManagement from '../components/admin/TeacherManagement'
import ContentManagement from '../components/admin/ContentManagement'
import FileSharing from '../components/admin/FileSharing'
import { getCurrentWeekStart } from '../utils/dateUtils'
import apiService from '../utils/api'
import draftManager from '../utils/draftManager'
import SaveWarningModal from '../components/common/SaveWarningModal'

const AdminPage = () => {
  const { user, logout } = useAuth()
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekStart())
  const [activeTab, setActiveTab] = useState('schedule')
  
  // Unsaved changes handling
  const [showSaveWarning, setShowSaveWarning] = useState(false)
  const [pendingTabChange, setPendingTabChange] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleTeacherSelect = (teacher) => {
    setSelectedTeacher(teacher)
  }

  const handleStudentSelect = (student) => {
    setSelectedStudent(student)
  }

  const handleWeekChange = (weekStart) => {
    setCurrentWeek(weekStart)
  }

  // Unsaved changes handling functions
  const handleTabChange = (tabId) => {
    if (draftManager.hasUnsavedChanges()) {
      setPendingTabChange(tabId)
      setShowSaveWarning(true)
    } else {
      setActiveTab(tabId)
    }
  }

  const saveChangesToDatabase = async () => {
    try {
      setIsSaving(true)
      const draft = draftManager.getDraftChanges()
      if (!draft) return

      // Process additions
      for (const addition of draft.additions) {
        await apiService.createSchedule({
          student_id: addition.studentId,
          teacher_id: addition.teacherId,
          day_of_week: addition.dayOfWeek,
          time_slot: addition.timeSlot,
          week_start_date: addition.weekStart
        })
      }

      // Process deletions
      for (const deletion of draft.deletions) {
        await apiService.deleteSchedule(deletion.scheduleId)
      }

      // Clear draft
      draftManager.clearDraftChanges()
      console.log('✅ [ADMIN_PAGE] Changes saved successfully')
    } catch (error) {
      console.error('❌ [ADMIN_PAGE] Failed to save changes:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const discardChanges = () => {
    draftManager.clearDraftChanges()
    console.log('🗑️ [ADMIN_PAGE] Changes discarded')
  }

  const handleSaveWarningResponse = (response) => {
    if (response === 'save') {
      saveChangesToDatabase().then(() => {
        setActiveTab(pendingTabChange)
        setPendingTabChange(null)
      })
    } else if (response === 'discard') {
      discardChanges()
      setActiveTab(pendingTabChange)
      setPendingTabChange(null)
    }
    setShowSaveWarning(false)
  }

  // Auto-select first teacher when switching to schedule tab

  // Handle when teachers are loaded from TeacherTabs
  const handleTeachersLoaded = (teachers) => {
    if (activeTab === 'schedule' && !selectedTeacher && teachers.length > 0) {
      const firstTeacher = teachers[0]
      setSelectedTeacher(firstTeacher)
      console.log('✅ [ADMIN_PAGE] Auto-selected first teacher:', firstTeacher.name)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-neutral-800">
                RioTalk Admin Page
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
      <main className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 mb-3 sm:mb-4 md:mb-6 overflow-x-auto">
          {[
            { id: 'schedule', label: 'Schedule Management', shortLabel: 'Schedule' },
            { id: 'teachers', label: 'Teachers', shortLabel: 'Teachers' },
            { id: 'students', label: 'Students', shortLabel: 'Students' },
            { id: 'content', label: 'Content Management', shortLabel: 'Content' },
            { id: 'files', label: 'File Sharing', shortLabel: 'Files' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded text-xs sm:text-sm md:text-base font-medium transition-colors duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
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
              onTeachersLoaded={handleTeachersLoaded}
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

        {activeTab === 'files' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <FileSharing />
          </motion.div>
        )}
      </main>

      {/* Save Warning Modal */}
      <SaveWarningModal
        isOpen={showSaveWarning}
        onClose={() => setShowSaveWarning(false)}
        onSave={() => handleSaveWarningResponse('save')}
        onDiscard={() => handleSaveWarningResponse('discard')}
        pendingAction={pendingTabChange ? `Switch to ${pendingTabChange} tab` : null}
        changesSummary={draftManager.getChangesSummary()}
      />
    </div>
  )
}

export default AdminPage
