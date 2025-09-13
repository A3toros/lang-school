// Draft Manager for Schedule Changes
// Handles localStorage operations for unsaved schedule changes

const DRAFT_STORAGE_KEY = 'schedule_draft_changes'

export const draftManager = {
  // Get current draft changes from localStorage
  getDraftChanges() {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Error loading draft changes:', error)
      return null
    }
  },

  // Save draft changes to localStorage
  saveDraftChanges(draftData) {
    try {
      const draft = {
        ...draftData,
        hasUnsavedChanges: true,
        lastModified: new Date().toISOString()
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      return true
    } catch (error) {
      console.error('Error saving draft changes:', error)
      return false
    }
  },

  // Clear draft changes from localStorage
  clearDraftChanges() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      return true
    } catch (error) {
      console.error('Error clearing draft changes:', error)
      return false
    }
  },

  // Check if there are unsaved changes
  hasUnsavedChanges() {
    const draft = this.getDraftChanges()
    return draft && draft.hasUnsavedChanges
  },

  // Initialize draft structure for a teacher/week
  initializeDraft(teacherId, weekStart) {
    const draft = {
      teacherId,
      weekStart,
      additions: [],
      deletions: [],
      modifications: [],
      hasUnsavedChanges: false,
      lastModified: new Date().toISOString()
    }
    this.saveDraftChanges(draft)
    return draft
  },

  // Add a new lesson to draft
  addLesson(lessonData) {
    const draft = this.getDraftChanges() || this.initializeDraft(lessonData.teacherId, lessonData.weekStart)
    
    // Check if this slot already has a pending addition
    const existingAddition = draft.additions.find(
      addition => addition.dayOfWeek === lessonData.dayOfWeek && 
                 addition.timeSlot === lessonData.timeSlot
    )
    
    if (existingAddition) {
      // Update existing addition
      Object.assign(existingAddition, lessonData)
    } else {
      // Add new addition
      draft.additions.push({
        id: `temp_${Date.now()}_${Math.random()}`,
        ...lessonData,
        type: 'addition'
      })
    }
    
    this.saveDraftChanges(draft)
    return draft
  },

  // Mark a lesson for deletion
  deleteLesson(scheduleId, lessonData) {
    let draft = this.getDraftChanges()
    if (!draft) {
      // Create a new draft if none exists
      draft = this.initializeDraft(lessonData.teacherId, lessonData.weekStart)
    }

    // Remove from additions if it was a pending addition
    draft.additions = draft.additions.filter(
      addition => addition.dayOfWeek !== lessonData.dayOfWeek || 
                 addition.timeSlot !== lessonData.timeSlot
    )

    // Add to deletions
    draft.deletions.push({
      scheduleId,
      ...lessonData,
      type: 'deletion'
    })

    this.saveDraftChanges(draft)
    return draft
  },

  // Get all pending changes for a specific teacher/week
  getChangesForTeacherWeek(teacherId, weekStart) {
    const draft = this.getDraftChanges()
    if (!draft || draft.teacherId !== teacherId || draft.weekStart !== weekStart) {
      return null
    }
    return draft
  },

  // Apply draft changes to schedule data (for UI display)
  applyDraftToSchedule(originalSchedule, teacherId, weekStart) {
    const draft = this.getChangesForTeacherWeek(teacherId, weekStart)
    if (!draft) return originalSchedule

    let modifiedSchedule = [...originalSchedule]

    // Apply deletions
    draft.deletions.forEach(deletion => {
      modifiedSchedule = modifiedSchedule.filter(
        item => !(item.day_of_week === deletion.dayOfWeek && 
                 item.time_slot === deletion.timeSlot)
      )
    })

    // Apply additions
    draft.additions.forEach(addition => {
      const newScheduleItem = {
        id: addition.id,
        student_id: addition.studentId,
        student_name: addition.studentName,
        teacher_id: addition.teacherId,
        day_of_week: addition.dayOfWeek,
        time_slot: addition.timeSlot,
        week_start_date: addition.weekStart,
        attendance_status: 'scheduled',
        is_draft: true // Mark as draft item
      }
      modifiedSchedule.push(newScheduleItem)
    })

    return modifiedSchedule
  },

  // Get summary of pending changes
  getChangesSummary() {
    const draft = this.getDraftChanges()
    if (!draft) return null

    return {
      additions: draft.additions.length,
      deletions: draft.deletions.length,
      modifications: draft.modifications.length,
      total: draft.additions.length + draft.deletions.length + draft.modifications.length,
      lastModified: draft.lastModified
    }
  }
}

export default draftManager
