# Multi-Teacher Assignment Implementation Plan

## Overview
Transform the current one-to-one student-teacher relationship into a many-to-many relationship, allowing students to be assigned to multiple teachers while maintaining data integrity and proper access controls.

---

## Current System Analysis

### Current Constraints
1. **Database**: `students.teacher_id` is a single foreign key
2. **Schedules**: `student_schedules.teacher_id` links to single teacher
3. **Permissions**: All teacher access checks assume single teacher assignment
4. **UI**: All components designed for one-to-one relationship
5. **Business Logic**: Reassignment replaces teacher (doesn't add)

### Key Dependencies
- **Schedules**: `student_schedules` table has `teacher_id` column
- **Reports**: `lesson_reports` table has `teacher_id` column  
- **Attendance**: `student_lessons` table tracks attendance per teacher
- **Templates**: `schedule_templates` table has `teacher_id` column

---

## Phase 1: Database Schema Changes

### 1.1 Create Student-Teacher Junction Table
```sql
-- New junction table for many-to-many relationship
CREATE TABLE student_teachers (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- Primary teacher for main assignment
    assigned_date DATE DEFAULT CURRENT_DATE,
    assigned_by INTEGER REFERENCES users(id), -- Who assigned this relationship
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique active assignments
    UNIQUE(student_id, teacher_id),
    -- Ensure only one primary teacher per student
    UNIQUE(student_id) WHERE is_primary = true
);

-- Indexes for performance
CREATE INDEX idx_student_teachers_student ON student_teachers(student_id);
CREATE INDEX idx_student_teachers_teacher ON student_teachers(teacher_id);
CREATE INDEX idx_student_teachers_active ON student_teachers(is_active);
CREATE INDEX idx_student_teachers_primary ON student_teachers(is_primary);
```

### 1.2 Add Primary Teacher Column to Students
```sql
-- Add primary_teacher_id to students table (replaces teacher_id)
ALTER TABLE students ADD COLUMN primary_teacher_id INTEGER REFERENCES teachers(id);
ALTER TABLE students ADD COLUMN teacher_count INTEGER DEFAULT 0;

-- Migrate existing data
UPDATE students SET primary_teacher_id = teacher_id WHERE teacher_id IS NOT NULL;
UPDATE students SET teacher_count = 1 WHERE primary_teacher_id IS NOT NULL;

-- Populate junction table with existing data
INSERT INTO student_teachers (student_id, teacher_id, is_primary, assigned_date)
SELECT id, teacher_id, true, created_at
FROM students 
WHERE teacher_id IS NOT NULL;

-- Drop old teacher_id column (after migration)
-- ALTER TABLE students DROP COLUMN teacher_id;
```

### 1.3 Update Related Tables
```sql
-- Add primary teacher reference to schedules
ALTER TABLE student_schedules ADD COLUMN primary_teacher_id INTEGER REFERENCES teachers(id);

-- Update existing schedules
UPDATE student_schedules ss 
SET primary_teacher_id = s.primary_teacher_id
FROM students s 
WHERE ss.student_id = s.id;

-- Add indexes
CREATE INDEX idx_student_schedules_primary_teacher ON student_schedules(primary_teacher_id);
```

---

## Phase 2: Backend API Changes

### 2.1 New API Endpoints

#### Student-Teacher Management
```javascript
// Add teacher to student
POST /api/students/{id}/teachers
{
  "teacher_id": 5,
  "is_primary": false
}

// Remove teacher from student  
DELETE /api/students/{id}/teachers/{teacher_id}

// Set primary teacher
PUT /api/students/{id}/teachers/{teacher_id}/primary

// Get student's teachers
GET /api/students/{id}/teachers

// Get teacher's students (all assignments)
GET /api/teachers/{id}/students
```

#### Enhanced Student Management
```javascript
// Create student with multiple teachers
POST /api/students
{
  "name": "John Doe",
  "primary_teacher_id": 1,
  "additional_teacher_ids": [2, 3],
  "lessons_per_week": 3
}

// Update student teachers
PUT /api/students/{id}/teachers
{
  "primary_teacher_id": 2,
  "additional_teacher_ids": [1, 3, 4]
}
```

### 2.2 Permission System Updates

#### New Permission Helper Functions
```javascript
// Check if teacher has access to student
async function hasStudentAccess(teacherId, studentId) {
  const result = await query(
    'SELECT id FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_active = true',
    [studentId, teacherId]
  )
  return result.rows.length > 0
}

// Check if teacher is primary for student
async function isPrimaryTeacher(teacherId, studentId) {
  const result = await query(
    'SELECT id FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND is_primary = true AND is_active = true',
    [studentId, teacherId]
  )
  return result.rows.length > 0
}

// Get all teachers for student
async function getStudentTeachers(studentId) {
  const result = await query(`
    SELECT t.*, st.is_primary, st.assigned_date
    FROM teachers t
    JOIN student_teachers st ON t.id = st.teacher_id
    WHERE st.student_id = $1 AND st.is_active = true
    ORDER BY st.is_primary DESC, t.name
  `, [studentId])
  return result.rows
}
```

#### Updated Permission Checks
```javascript
// Replace all existing permission checks
// OLD: if (studentCheck.rows[0].teacher_id !== user.teacherId)
// NEW: if (!(await hasStudentAccess(user.teacherId, studentId)))

// For primary-only operations
// NEW: if (!(await isPrimaryTeacher(user.teacherId, studentId)))
```

### 2.3 Schedule Management Updates

#### Enhanced Schedule Creation
```javascript
// Create schedule with teacher assignment
async function createSchedule(event, user) {
  const { student_id, teacher_id, day_of_week, time_slot, week_start_date } = JSON.parse(event.body)
  
  // Verify teacher has access to student
  if (!(await hasStudentAccess(teacher_id, student_id))) {
    return errorResponse(403, 'Teacher does not have access to this student')
  }
  
  // Check for conflicts
  const conflicts = await checkSchedulingConflicts(teacher_id, day_of_week, time_slot, week_start_date)
  if (conflicts.length > 0) {
    return errorResponse(400, 'Scheduling conflict detected')
  }
  
  // Create schedule
  const result = await query(`
    INSERT INTO student_schedules (student_id, teacher_id, primary_teacher_id, day_of_week, time_slot, week_start_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [student_id, teacher_id, await getPrimaryTeacher(student_id), day_of_week, time_slot, week_start_date])
  
  return successResponse({ schedule: result.rows[0] })
}
```

#### Teacher Schedule Queries
```javascript
// Get teacher's schedule (all students assigned to them)
async function getTeacherSchedule(event, user) {
  const teacherId = parseInt(event.path.split('/')[3])
  const weekStart = week_start || getCurrentWeekStart()
  
  const queryText = `
    SELECT ss.*, s.name as student_name, s.id as student_id,
           st.is_primary as is_primary_student
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    JOIN student_teachers st ON s.id = st.student_id AND st.teacher_id = $1
    WHERE ss.teacher_id = $1 AND ss.week_start_date = $2 AND s.is_active = true
    ORDER BY st.is_primary DESC, ss.day_of_week, ss.time_slot
  `
  
  const result = await query(queryText, [teacherId, weekStart])
  return successResponse({ schedules: result.rows })
}
```

---

## Phase 3: Frontend UI Changes

### 3.1 Student Management Updates

#### Enhanced Student Table
```jsx
// Add teacher assignment column
const StudentManagement = () => {
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  
  const renderTeacherAssignments = (student) => {
    return (
      <div className="flex flex-wrap gap-1">
        {student.teachers?.map(teacher => (
          <span key={teacher.id} className={`px-2 py-1 text-xs rounded ${
            teacher.is_primary 
              ? 'bg-blue-100 text-blue-800 font-medium' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {teacher.name} {teacher.is_primary && '(Primary)'}
          </span>
        ))}
        <button 
          onClick={() => openTeacherAssignmentModal(student)}
          className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
        >
          + Add Teacher
        </button>
      </div>
    )
  }
  
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Teachers</th>
          <th>Lessons/Week</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {students.map(student => (
          <tr key={student.id}>
            <td>{student.name}</td>
            <td>{renderTeacherAssignments(student)}</td>
            <td>{student.lessons_per_week}</td>
            <td>{/* Actions */}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

#### Teacher Assignment Modal
```jsx
const TeacherAssignmentModal = ({ student, isOpen, onClose }) => {
  const [availableTeachers, setAvailableTeachers] = useState([])
  const [selectedTeachers, setSelectedTeachers] = useState([])
  const [primaryTeacherId, setPrimaryTeacherId] = useState(null)
  
  const handleAddTeacher = (teacherId) => {
    if (!selectedTeachers.find(t => t.id === teacherId)) {
      const teacher = availableTeachers.find(t => t.id === teacherId)
      setSelectedTeachers([...selectedTeachers, teacher])
    }
  }
  
  const handleRemoveTeacher = (teacherId) => {
    setSelectedTeachers(selectedTeachers.filter(t => t.id !== teacherId))
    if (primaryTeacherId === teacherId) {
      setPrimaryTeacherId(null)
    }
  }
  
  const handleSave = async () => {
    await apiService.updateStudentTeachers(student.id, {
      primary_teacher_id: primaryTeacherId,
      additional_teacher_ids: selectedTeachers
        .filter(t => t.id !== primaryTeacherId)
        .map(t => t.id)
    })
    onClose()
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Manage Teachers for {student.name}</h2>
      
      <div className="space-y-4">
        <div>
          <label>Primary Teacher</label>
          <select 
            value={primaryTeacherId || ''} 
            onChange={(e) => setPrimaryTeacherId(parseInt(e.target.value))}
          >
            <option value="">Select Primary Teacher</option>
            {selectedTeachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label>Additional Teachers</label>
          <div className="flex flex-wrap gap-2">
            {selectedTeachers
              .filter(t => t.id !== primaryTeacherId)
              .map(teacher => (
                <span key={teacher.id} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                  {teacher.name}
                  <button onClick={() => handleRemoveTeacher(teacher.id)}>×</button>
                </span>
              ))}
          </div>
          <select onChange={(e) => handleAddTeacher(parseInt(e.target.value))}>
            <option value="">Add Teacher</option>
            {availableTeachers
              .filter(t => !selectedTeachers.find(st => st.id === t.id))
              .map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSave}>Save</button>
      </div>
    </Modal>
  )
}
```

### 3.2 Schedule Management Updates

#### Enhanced Schedule Table
```jsx
const ScheduleTable = () => {
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [availableStudents, setAvailableStudents] = useState([])
  
  // Get students assigned to selected teacher
  const fetchAvailableStudents = async (teacherId) => {
    const response = await apiService.getTeacherStudents(teacherId)
    setAvailableStudents(response.students)
  }
  
  const renderStudentInput = (dayIndex, timeSlot, existingSchedule) => {
    if (editingCell === `${dayIndex}-${timeSlot}`) {
      return (
        <div className="relative">
          <input
            type="text"
            value={studentInput}
            onChange={handleStudentInputChange}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm border rounded"
            placeholder="Type student name..."
            autoFocus
          />
          {showSuggestions && filteredStudents.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  onClick={() => handleStudentSelect(student)}
                  className={`px-3 py-2 text-sm hover:bg-gray-100 ${
                    student.teachers?.some(t => t.teacher_id === selectedTeacher) 
                      ? 'bg-blue-50' 
                      : ''
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{student.name}</span>
                    <span className="text-xs text-gray-500">
                      {student.teachers?.some(t => t.teacher_id === selectedTeacher) 
                        ? 'Assigned' 
                        : 'Not Assigned'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    
    return (
      <div 
        className="cursor-pointer hover:bg-gray-50 p-1"
        onDoubleClick={() => handleCellDoubleClick(dayIndex, timeSlot)}
      >
        {existingSchedule ? (
          <div className="text-sm">
            <div className="font-medium">{existingSchedule.student_name}</div>
            {existingSchedule.is_primary_student && (
              <div className="text-xs text-blue-600">Primary</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400">Double-click to add</div>
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label>Teacher:</label>
        <select 
          value={selectedTeacher || ''} 
          onChange={(e) => {
            const teacherId = parseInt(e.target.value)
            setSelectedTeacher(teacherId)
            fetchAvailableStudents(teacherId)
          }}
        >
          <option value="">Select Teacher</option>
          {teachers.map(teacher => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Schedule grid with enhanced student display */}
      <div className="grid grid-cols-8 gap-1">
        {/* Headers */}
        <div className="font-medium">Time</div>
        {DAYS.map(day => (
          <div key={day} className="font-medium text-center">{day}</div>
        ))}
        
        {/* Time slots */}
        {TIME_SLOTS.map(timeSlot => (
          <React.Fragment key={timeSlot}>
            <div className="font-medium">{timeSlot}</div>
            {DAYS.map((day, dayIndex) => (
              <div key={`${day}-${timeSlot}`} className="border p-1 min-h-[60px]">
                {renderStudentInput(dayIndex, timeSlot, getExistingSchedule(dayIndex, timeSlot))}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
```

### 3.3 Teacher Dashboard Updates

#### Enhanced Teacher View
```jsx
const TeacherDashboard = () => {
  const [students, setStudents] = useState([])
  const [primaryStudents, setPrimaryStudents] = useState([])
  const [additionalStudents, setAdditionalStudents] = useState([])
  
  useEffect(() => {
    fetchTeacherStudents()
  }, [])
  
  const fetchTeacherStudents = async () => {
    const response = await apiService.getTeacherStudents(user.teacherId)
    const primary = response.students.filter(s => s.is_primary)
    const additional = response.students.filter(s => !s.is_primary)
    
    setPrimaryStudents(primary)
    setAdditionalStudents(additional)
  }
  
  return (
    <div className="space-y-6">
      <h1>Teacher Dashboard</h1>
      
      {/* Primary Students */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Primary Students ({primaryStudents.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {primaryStudents.map(student => (
            <StudentCard key={student.id} student={student} isPrimary={true} />
          ))}
        </div>
      </div>
      
      {/* Additional Students */}
      {additionalStudents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Additional Students ({additionalStudents.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {additionalStudents.map(student => (
              <StudentCard key={student.id} student={student} isPrimary={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Phase 4: Migration Strategy

### 4.1 Data Migration Steps

#### Step 1: Create New Tables
```sql
-- Run Phase 1.1 SQL commands
-- Create student_teachers table
-- Add primary_teacher_id to students
-- Add primary_teacher_id to student_schedules
```

#### Step 2: Migrate Existing Data
```sql
-- Migrate existing student-teacher relationships
INSERT INTO student_teachers (student_id, teacher_id, is_primary, assigned_date)
SELECT id, teacher_id, true, created_at
FROM students 
WHERE teacher_id IS NOT NULL;

-- Update students table
UPDATE students SET primary_teacher_id = teacher_id WHERE teacher_id IS NOT NULL;
UPDATE students SET teacher_count = 1 WHERE primary_teacher_id IS NOT NULL;

-- Update schedules
UPDATE student_schedules ss 
SET primary_teacher_id = s.primary_teacher_id
FROM students s 
WHERE ss.student_id = s.id;
```

#### Step 3: Update Application Code
```javascript
// Deploy new backend with multi-teacher support
// Update all permission checks
// Add new API endpoints
```

#### Step 4: Update Frontend
```javascript
// Deploy new frontend with multi-teacher UI
// Update all components
// Add teacher assignment modals
```

#### Step 5: Remove Old Columns
```sql
-- After confirming everything works
ALTER TABLE students DROP COLUMN teacher_id;
```

### 4.2 Rollback Strategy
```sql
-- If rollback needed, restore teacher_id
ALTER TABLE students ADD COLUMN teacher_id INTEGER REFERENCES teachers(id);
UPDATE students SET teacher_id = primary_teacher_id WHERE primary_teacher_id IS NOT NULL;
```

---

## Phase 5: Testing Strategy

### 5.1 Unit Tests
- Test new permission functions
- Test teacher assignment logic
- Test schedule creation with multiple teachers

### 5.2 Integration Tests
- Test complete student-teacher assignment flow
- Test schedule management with multiple teachers
- Test permission boundaries

### 5.3 User Acceptance Tests
- Test teacher assignment UI
- Test schedule management UI
- Test teacher dashboard with multiple students

---

## Phase 6: Performance Considerations

### 6.1 Database Indexes
```sql
-- Ensure proper indexing for multi-teacher queries
CREATE INDEX idx_student_teachers_student_active ON student_teachers(student_id, is_active);
CREATE INDEX idx_student_teachers_teacher_active ON student_teachers(teacher_id, is_active);
CREATE INDEX idx_student_schedules_teacher_week ON student_schedules(teacher_id, week_start_date);
```

### 6.2 Query Optimization
- Use JOINs efficiently for multi-teacher queries
- Cache teacher assignments where appropriate
- Optimize permission checks

### 6.3 UI Performance
- Lazy load teacher assignments
- Virtualize large student lists
- Debounce search inputs

---

## Success Criteria

### Functional Requirements
- ✅ Students can be assigned to multiple teachers
- ✅ One primary teacher per student
- ✅ Teachers can see all their students (primary + additional)
- ✅ Schedules work with multiple teachers
- ✅ Permission system respects multi-teacher assignments
- ✅ Data integrity maintained

### Non-Functional Requirements
- ✅ Performance remains acceptable
- ✅ UI is intuitive and user-friendly
- ✅ Migration is reversible
- ✅ No data loss during migration
- ✅ Backward compatibility where possible

---

## Implementation Timeline

### Week 1: Database Schema
- Create new tables
- Migrate existing data
- Add indexes

### Week 2: Backend API
- Update permission system
- Add new endpoints
- Update existing functions

### Week 3: Frontend UI
- Update student management
- Add teacher assignment modals
- Update schedule management

### Week 4: Testing & Deployment
- Comprehensive testing
- Performance optimization
- Production deployment

---

## Risk Mitigation

### Data Loss Prevention
- Full database backup before migration
- Incremental migration with validation
- Rollback plan ready

### Performance Risks
- Load testing with multi-teacher scenarios
- Database query optimization
- Caching strategies

### User Experience Risks
- Gradual rollout with feature flags
- User training materials
- Support documentation

---

This plan provides a comprehensive roadmap for implementing multi-teacher assignment while maintaining system integrity and user experience.
