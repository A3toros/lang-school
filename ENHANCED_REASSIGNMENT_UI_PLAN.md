# Enhanced Reassignment UI Plan

## Overview
Transform the simple reassign dropdown into a comprehensive teacher management interface that shows currently assigned teachers with individual delete buttons and an "Add Teacher" dropdown.

---

## Current Reassign Button Analysis

### Current Implementation
```jsx
// Current simple dropdown
<select
  onChange={(e) => {
    e.stopPropagation()
    if (e.target.value) {
      handleReassignStudent(student.id, parseInt(e.target.value))
      e.target.value = ''
    }
  }}
  className="text-xs border border-gray-300 rounded px-2 py-1"
  onClick={(e) => e.stopPropagation()}
>
  <option value="">Reassign</option>
  {teachers
    .filter(teacher => teacher.id !== student.teacher_id)
    .map(teacher => (
      <option key={teacher.id} value={teacher.id}>
        {teacher.name}
      </option>
    ))}
</select>
```

### Current Issues
- Only shows "Reassign" option
- No visibility of current teachers
- No way to remove teachers
- No way to add multiple teachers
- Single action per click

---

## New Enhanced Reassignment UI

### 1. Teacher Management Modal

#### Modal Structure
```jsx
const TeacherReassignmentModal = ({ student, isOpen, onClose }) => {
  const [assignedTeachers, setAssignedTeachers] = useState([])
  const [availableTeachers, setAvailableTeachers] = useState([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          Manage Teachers for {student.name}
        </h2>
        
        {/* Current Teachers Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Currently Assigned Teachers</h3>
          <div className="space-y-2">
            {assignedTeachers.map(teacher => (
              <TeacherAssignmentCard 
                key={teacher.id}
                teacher={teacher}
                onRemove={handleRemoveTeacher}
                onSetPrimary={handleSetPrimary}
              />
            ))}
            {assignedTeachers.length === 0 && (
              <div className="text-gray-500 text-sm italic">
                No teachers assigned
              </div>
            )}
          </div>
        </div>

        {/* Add Teacher Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Add New Teacher</h3>
          <div className="flex gap-2">
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select a teacher to add...</option>
              {availableTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddTeacher}
              disabled={!selectedTeacherId || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add Teacher
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  )
}
```

### 2. Teacher Assignment Card Component

```jsx
const TeacherAssignmentCard = ({ teacher, onRemove, onSetPrimary }) => {
  return (
    <div className={`flex items-center justify-between p-3 border rounded-lg ${
      teacher.is_primary ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {teacher.photo_url ? (
            <img 
              src={teacher.photo_url} 
              alt={teacher.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {teacher.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{teacher.name}</span>
            {teacher.is_primary && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                Primary
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Assigned: {new Date(teacher.assigned_date).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {!teacher.is_primary && (
          <button
            onClick={() => onSetPrimary(teacher.id)}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Set Primary
          </button>
        )}
        <button
          onClick={() => onRemove(teacher.id)}
          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
```

### 3. Updated Student Management Table

```jsx
// Replace the current reassign dropdown with a button that opens the modal
<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
  <div className="flex space-x-2">
    <button
      onClick={(e) => {
        e.stopPropagation()
        setSelectedStudent(student)
        setShowTeacherModal(true)
      }}
      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
    >
      Manage Teachers
    </button>
    
    {student.is_active && (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleHardDelete(student)
        }}
        className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
      >
        Delete
      </button>
    )}
  </div>
</td>
```

---

## Backend API Changes

### 1. New API Endpoints

```javascript
// Get student's assigned teachers
GET /api/students/{id}/teachers
// Response: { teachers: [{ id, name, is_primary, assigned_date, photo_url }] }

// Add teacher to student
POST /api/students/{id}/teachers
// Body: { teacher_id: 5, is_primary: false }

// Remove teacher from student
DELETE /api/students/{id}/teachers/{teacher_id}

// Set primary teacher
PUT /api/students/{id}/teachers/{teacher_id}/primary

// Update all teacher assignments
PUT /api/students/{id}/teachers
// Body: { primary_teacher_id: 2, additional_teacher_ids: [1, 3, 4] }
```

### 2. Enhanced Backend Functions

```javascript
// Get student's teachers
async function getStudentTeachers(event, user) {
  try {
    const studentId = parseInt(event.path.split('/')[3])
    
    // Check permissions
    if (user.role === 'teacher') {
      const hasAccess = await hasStudentAccess(user.teacherId, studentId)
      if (!hasAccess) {
        return errorResponse(403, 'Forbidden')
      }
    }

    const queryText = `
      SELECT t.*, st.is_primary, st.assigned_date, st.assigned_by
      FROM teachers t
      JOIN student_teachers st ON t.id = st.teacher_id
      WHERE st.student_id = $1 AND st.is_active = true
      ORDER BY st.is_primary DESC, t.name
    `
    
    const result = await query(queryText, [studentId])
    return successResponse({ teachers: result.rows })
  } catch (error) {
    console.error('Get student teachers error:', error)
    return errorResponse(500, 'Failed to fetch teachers')
  }
}

// Add teacher to student
async function addStudentTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const studentId = parseInt(event.path.split('/')[3])
    const { teacher_id, is_primary } = JSON.parse(event.body)

    // Verify teacher exists
    const teacherCheck = await query(
      'SELECT id FROM teachers WHERE id = $1 AND is_active = true',
      [teacher_id]
    )

    if (teacherCheck.rows.length === 0) {
      return errorResponse(400, 'Invalid teacher_id')
    }

    // Check if already assigned
    const existingCheck = await query(
      'SELECT id FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_active = true',
      [studentId, teacher_id]
    )

    if (existingCheck.rows.length > 0) {
      return errorResponse(400, 'Teacher already assigned to this student')
    }

    // If setting as primary, unset current primary
    if (is_primary) {
      await query(
        'UPDATE student_teachers SET is_primary = false WHERE student_id = $1 AND is_primary = true',
        [studentId]
      )
    }

    // Add new teacher assignment
    await query(
      'INSERT INTO student_teachers (student_id, teacher_id, is_primary, assigned_by) VALUES ($1, $2, $3, $4)',
      [studentId, teacher_id, is_primary || false, user.userId]
    )

    // Update student's primary teacher if needed
    if (is_primary) {
      await query(
        'UPDATE students SET primary_teacher_id = $1, teacher_count = teacher_count + 1 WHERE id = $2',
        [teacher_id, studentId]
      )
    } else {
      await query(
        'UPDATE students SET teacher_count = teacher_count + 1 WHERE id = $1',
        [studentId]
      )
    }

    return successResponse({ message: 'Teacher added successfully' })
  } catch (error) {
    console.error('Add student teacher error:', error)
    return errorResponse(500, 'Failed to add teacher')
  }
}

// Remove teacher from student
async function removeStudentTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const studentId = parseInt(event.path.split('/')[3])
    const teacherId = parseInt(event.path.split('/')[5])

    // Check if teacher is assigned
    const assignmentCheck = await query(
      'SELECT is_primary FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_active = true',
      [studentId, teacherId]
    )

    if (assignmentCheck.rows.length === 0) {
      return errorResponse(404, 'Teacher not assigned to this student')
    }

    const isPrimary = assignmentCheck.rows[0].is_primary

    // Deactivate assignment
    await query(
      'UPDATE student_teachers SET is_active = false WHERE student_id = $1 AND teacher_id = $2',
      [studentId, teacherId]
    )

    // If removing primary teacher, set new primary or clear
    if (isPrimary) {
      const newPrimary = await query(
        'SELECT teacher_id FROM student_teachers WHERE student_id = $1 AND is_active = true AND is_primary = false LIMIT 1',
        [studentId]
      )

      if (newPrimary.rows.length > 0) {
        // Set new primary
        await query(
          'UPDATE student_teachers SET is_primary = true WHERE student_id = $1 AND teacher_id = $2',
          [studentId, newPrimary.rows[0].teacher_id]
        )
        await query(
          'UPDATE students SET primary_teacher_id = $1 WHERE id = $2',
          [newPrimary.rows[0].teacher_id, studentId]
        )
      } else {
        // No more teachers, clear primary
        await query(
          'UPDATE students SET primary_teacher_id = NULL WHERE id = $1',
          [studentId]
        )
      }
    }

    // Update teacher count
    await query(
      'UPDATE students SET teacher_count = teacher_count - 1 WHERE id = $1',
      [studentId]
    )

    return successResponse({ message: 'Teacher removed successfully' })
  } catch (error) {
    console.error('Remove student teacher error:', error)
    return errorResponse(500, 'Failed to remove teacher')
  }
}

// Set primary teacher
async function setPrimaryTeacher(event, user) {
  try {
    if (user.role !== 'admin') {
      return errorResponse(403, 'Forbidden')
    }

    const studentId = parseInt(event.path.split('/')[3])
    const teacherId = parseInt(event.path.split('/')[5])

    // Verify teacher is assigned to student
    const assignmentCheck = await query(
      'SELECT id FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_active = true',
      [studentId, teacherId]
    )

    if (assignmentCheck.rows.length === 0) {
      return errorResponse(404, 'Teacher not assigned to this student')
    }

    // Unset current primary
    await query(
      'UPDATE student_teachers SET is_primary = false WHERE student_id = $1 AND is_primary = true',
      [studentId]
    )

    // Set new primary
    await query(
      'UPDATE student_teachers SET is_primary = true WHERE student_id = $1 AND teacher_id = $2',
      [studentId, teacherId]
    )

    // Update student's primary teacher
    await query(
      'UPDATE students SET primary_teacher_id = $1 WHERE id = $2',
      [teacherId, studentId]
    )

    return successResponse({ message: 'Primary teacher updated successfully' })
  } catch (error) {
    console.error('Set primary teacher error:', error)
    return errorResponse(500, 'Failed to update primary teacher')
  }
}
```

---

## Frontend State Management

### 1. Enhanced Student Management State

```javascript
const StudentManagement = () => {
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [assignedTeachers, setAssignedTeachers] = useState([])
  const [availableTeachers, setAvailableTeachers] = useState([])

  // Fetch student's teachers
  const fetchStudentTeachers = async (studentId) => {
    try {
      const response = await apiService.getStudentTeachers(studentId)
      if (response.success) {
        setAssignedTeachers(response.teachers)
        
        // Calculate available teachers (not already assigned)
        const assignedIds = response.teachers.map(t => t.id)
        const available = teachers.filter(t => !assignedIds.includes(t.id))
        setAvailableTeachers(available)
      }
    } catch (error) {
      console.error('Error fetching student teachers:', error)
    }
  }

  // Add teacher to student
  const handleAddTeacher = async (teacherId) => {
    try {
      const response = await apiService.addStudentTeacher(selectedStudent.id, {
        teacher_id: teacherId,
        is_primary: assignedTeachers.length === 0 // First teacher is primary
      })
      
      if (response.success) {
        await fetchStudentTeachers(selectedStudent.id)
        await fetchStudents() // Refresh student list
        showSuccessNotification('Success!', 'Teacher added successfully', 'success')
      }
    } catch (error) {
      console.error('Error adding teacher:', error)
      showSuccessNotification('Error', 'Failed to add teacher', 'error')
    }
  }

  // Remove teacher from student
  const handleRemoveTeacher = async (teacherId) => {
    try {
      const response = await apiService.removeStudentTeacher(selectedStudent.id, teacherId)
      
      if (response.success) {
        await fetchStudentTeachers(selectedStudent.id)
        await fetchStudents() // Refresh student list
        showSuccessNotification('Success!', 'Teacher removed successfully', 'success')
      }
    } catch (error) {
      console.error('Error removing teacher:', error)
      showSuccessNotification('Error', 'Failed to remove teacher', 'error')
    }
  }

  // Set primary teacher
  const handleSetPrimary = async (teacherId) => {
    try {
      const response = await apiService.setPrimaryTeacher(selectedStudent.id, teacherId)
      
      if (response.success) {
        await fetchStudentTeachers(selectedStudent.id)
        await fetchStudents() // Refresh student list
        showSuccessNotification('Success!', 'Primary teacher updated successfully', 'success')
      }
    } catch (error) {
      console.error('Error setting primary teacher:', error)
      showSuccessNotification('Error', 'Failed to update primary teacher', 'error')
    }
  }

  // Open teacher management modal
  const openTeacherModal = async (student) => {
    setSelectedStudent(student)
    setShowTeacherModal(true)
    await fetchStudentTeachers(student.id)
  }

  return (
    <div>
      {/* Student table with new Manage Teachers button */}
      <table>
        {/* ... existing table structure ... */}
        <td>
          <button
            onClick={() => openTeacherModal(student)}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Manage Teachers
          </button>
        </td>
      </table>

      {/* Teacher Management Modal */}
      <TeacherReassignmentModal
        student={selectedStudent}
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        assignedTeachers={assignedTeachers}
        availableTeachers={availableTeachers}
        onAddTeacher={handleAddTeacher}
        onRemoveTeacher={handleRemoveTeacher}
        onSetPrimary={handleSetPrimary}
      />
    </div>
  )
}
```

---

## Enhanced Student Display

### 1. Updated Student Table Columns

```jsx
// Add teacher count column
<thead>
  <tr>
    <th>Name</th>
    <th>Primary Teacher</th>
    <th>Total Teachers</th>
    <th>Lessons/Week</th>
    <th>Lesson Count</th>
    <th>Added Date</th>
    <th>Actions</th>
  </tr>
</thead>

// Updated student row
<tbody>
  {students.map(student => (
    <tr key={student.id}>
      <td>{student.name}</td>
      <td>
        {student.primary_teacher_name || 'Unassigned'}
        {student.teacher_count > 1 && (
          <span className="ml-2 text-xs text-gray-500">
            (+{student.teacher_count - 1} more)
          </span>
        )}
      </td>
      <td>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {student.teacher_count || 0}
        </span>
      </td>
      <td>{student.lessons_per_week}</td>
      <td>{student.lesson_count || 0}</td>
      <td>{new Date(student.added_date).toLocaleDateString()}</td>
      <td>
        <button
          onClick={() => openTeacherModal(student)}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          Manage Teachers
        </button>
      </td>
    </tr>
  ))}
</tbody>
```

---

## Benefits of New Design

### 1. **Enhanced Visibility**
- See all currently assigned teachers
- Clear indication of primary teacher
- Teacher count display
- Assignment dates

### 2. **Granular Control**
- Add individual teachers
- Remove specific teachers
- Change primary teacher
- Bulk operations

### 3. **Better UX**
- Modal interface for complex operations
- Visual teacher cards with photos
- Clear action buttons
- Confirmation dialogs

### 4. **Data Integrity**
- Proper validation
- Audit trail
- Consistent state management
- Error handling

---

## Implementation Plan

### Phase 1: Backend API Implementation
1. **Create new API endpoints in `functions/students.js`:**
   - `GET /api/students/{id}/teachers` - Get assigned teachers
   - `POST /api/students/{id}/teachers` - Add teacher to student
   - `DELETE /api/students/{id}/teachers/{teacher_id}` - Remove teacher from student
   - `PUT /api/students/{id}/teachers/{teacher_id}/primary` - Set primary teacher

2. **Update database schema:**
   - Add `student_teachers` junction table
   - Add `primary_teacher_id` column to `students` table
   - Add `primary_teacher_id` column to `student_schedules` table

3. **Test API functionality:**
   - Test all CRUD operations
   - Test permission controls
   - Test data validation

### Phase 2: Frontend Components Implementation
1. **Create `TeacherManagementModal.jsx`:**
   - Modal structure with header and sections
   - Current Teachers Section with visual cards
   - Add Teacher Section with dropdown
   - Action buttons (Cancel, Save Changes)
   - Loading states and error handling

2. **Create `TeacherAssignmentCard.jsx`:**
   - Teacher photo and name display
   - Primary teacher badge
   - Assignment date
   - "Set Primary" button (for non-primary teachers)
   - "Remove" button with confirmation

3. **Update `StudentManagement.jsx`:**
   - Replace reassign dropdown with "Manage Teachers" button
   - Add modal state management
   - Add teacher fetching functions
   - Update student table columns

### Phase 3: Integration and State Management
1. **Connect frontend to new APIs:**
   - Add API service methods
   - Handle API responses and errors
   - Update local state after operations

2. **Add error handling:**
   - Validation errors
   - Network errors
   - Permission errors
   - User-friendly error messages

3. **Add loading states:**
   - Button loading indicators
   - Modal loading states
   - Skeleton loaders for teacher cards

### Phase 4: Testing and Polish
1. **Test all scenarios:**
   - Add single teacher
   - Add multiple teachers
   - Remove teachers
   - Set primary teacher
   - Error cases

2. **Add animations:**
   - Modal entrance/exit animations
   - Card hover effects
   - Button loading animations

3. **Improve UX:**
   - Confirmation dialogs
   - Success notifications
   - Keyboard shortcuts
   - Responsive design

### Phase 5: Database Migration
1. **Create migration script:**
   - Complete SQL script: `MULTI_TEACHER_MIGRATION.sql`
   - Add new tables and columns
   - Migrate existing data
   - Update constraints and indexes
   - Create helper functions
   - Update existing views

2. **Test migration:**
   - Backup existing data
   - Run migration script
   - Verify data integrity
   - Test rollback procedure

3. **Migration script includes:**
   - `student_teachers` junction table
   - `primary_teacher_id` and `teacher_count` columns
   - Data migration from old to new system
   - Performance indexes
   - Helper functions for common operations
   - Updated views for compatibility
   - Verification queries

### Phase 6: Deployment and Monitoring
1. **Deploy changes:**
   - Deploy backend API changes
   - Deploy frontend components
   - Run database migration

2. **Monitor and fix:**
   - Monitor for errors
   - Fix any issues
   - Gather user feedback
   - Optimize performance

---

## Detailed Component Specifications

### TeacherManagementModal.jsx
```jsx
// Props:
// - student: { id, name, primary_teacher_id, teacher_count }
// - isOpen: boolean
// - onClose: function
// - assignedTeachers: array of teacher objects
// - availableTeachers: array of teacher objects
// - onAddTeacher: function(teacherId)
// - onRemoveTeacher: function(teacherId)
// - onSetPrimary: function(teacherId)
// - loading: boolean

// Features:
// - Modal with backdrop
// - Header with student name
// - Current Teachers Section (visual cards)
// - Add Teacher Section (dropdown + button)
// - Action buttons (Cancel, Save Changes)
// - Loading states
// - Error handling
```

### TeacherAssignmentCard.jsx
```jsx
// Props:
// - teacher: { id, name, photo_url, is_primary, assigned_date }
// - onRemove: function(teacherId)
// - onSetPrimary: function(teacherId)
// - canSetPrimary: boolean (if not already primary)

// Features:
// - Teacher photo or initials
// - Teacher name and primary badge
// - Assignment date
// - Action buttons (Set Primary, Remove)
// - Hover effects
// - Confirmation dialogs
```

### Updated StudentManagement.jsx
```jsx
// New state:
// - showTeacherModal: boolean
// - selectedStudent: object
// - assignedTeachers: array
// - availableTeachers: array

// New functions:
// - openTeacherModal(student)
// - closeTeacherModal()
// - fetchStudentTeachers(studentId)
// - handleAddTeacher(teacherId)
// - handleRemoveTeacher(teacherId)
// - handleSetPrimary(teacherId)

// Updated table:
// - Replace reassign dropdown with "Manage Teachers" button
// - Add teacher count column
// - Show primary teacher name
```

---

## API Endpoint Specifications

### GET /api/students/{id}/teachers
```javascript
// Response:
{
  "success": true,
  "teachers": [
    {
      "id": 1,
      "name": "Sarah Johnson",
      "photo_url": "/pics/teachers/sarah.jpg",
      "is_primary": true,
      "assigned_date": "2024-01-15",
      "assigned_by": 1
    }
  ]
}
```

### POST /api/students/{id}/teachers
```javascript
// Request:
{
  "teacher_id": 5,
  "is_primary": false
}

// Response:
{
  "success": true,
  "message": "Teacher added successfully"
}
```

### DELETE /api/students/{id}/teachers/{teacher_id}
```javascript
// Response:
{
  "success": true,
  "message": "Teacher removed successfully"
}
```

### PUT /api/students/{id}/teachers/{teacher_id}/primary
```javascript
// Response:
{
  "success": true,
  "message": "Primary teacher updated successfully"
}
```

---

## Database Schema Changes

### New Tables
```sql
-- Junction table for many-to-many relationships
CREATE TABLE student_teachers (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_date DATE DEFAULT CURRENT_DATE,
    assigned_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, teacher_id)
);

-- Create partial unique index to ensure only one primary teacher per student
CREATE UNIQUE INDEX idx_student_teachers_unique_primary 
ON student_teachers (student_id) 
WHERE is_primary = true;
```

### Modified Tables
```sql
-- Add primary teacher reference
ALTER TABLE students ADD COLUMN primary_teacher_id INTEGER REFERENCES teachers(id);
ALTER TABLE students ADD COLUMN teacher_count INTEGER DEFAULT 0;

-- Add primary teacher reference to schedules
ALTER TABLE student_schedules ADD COLUMN primary_teacher_id INTEGER REFERENCES teachers(id);
```

---

## Success Criteria

### Functional Requirements
- ✅ Students can be assigned to multiple teachers
- ✅ One primary teacher per student
- ✅ Teachers can be added/removed individually
- ✅ Primary teacher can be changed
- ✅ All changes are saved atomically
- ✅ Data integrity is maintained

### Non-Functional Requirements
- ✅ Modal opens/closes smoothly
- ✅ Teacher cards display correctly
- ✅ Dropdown shows available teachers
- ✅ Actions provide immediate feedback
- ✅ Error handling is user-friendly
- ✅ Performance is acceptable

This enhanced reassignment system provides much better visibility and control over teacher assignments while maintaining data integrity and providing a smooth user experience.
