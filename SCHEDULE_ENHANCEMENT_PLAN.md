# Schedule Management Enhancement Plan

## Overview
This document outlines the comprehensive plan to enhance the current schedule management system with improved data integrity, audit trails, and business logic enforcement through database functions and triggers.

## Current System Analysis

### Existing Issues Identified
1. **Direct SQL Updates**: Current system allows direct manipulation of schedule data
2. **Inconsistent State Management**: Multiple ways to mark attendance without proper validation
3. **Missing Audit Trail**: Limited tracking of schedule changes
4. **Data Integrity Risks**: Potential for orphaned or inconsistent records
5. **No Soft Delete**: Hard deletes can lose historical data
6. **Template Management**: Inefficient recurring lesson generation

## Database Schema Enhancements

### 1. New SQL Implementation
The provided SQL adds critical enhancements:

#### Schema Changes
- `is_active` column for soft deletes
- Cancellation fields for templates
- Enhanced constraints and triggers
- Protective functions for data integrity

#### Key Functions Added
- `create_occurrences_from_template()` - Idempotent template materialization
- `cancel_template_and_future_occurrences()` - Safe template cancellation
- `mark_schedule_completed()` - Atomic completion with ledger sync
- `extend_all_templates()` - Bulk template extension

#### Safety Mechanisms
- Past record protection triggers
- Status consistency enforcement
- Idempotent operations
- Comprehensive audit logging

## Implementation Plan

### Phase 1: Database Migration (Week 1)

#### 1.1 Apply SQL Enhancements
```sql
-- Apply the provided SQL script
-- This includes all schema changes, functions, and triggers
```

#### 1.2 Data Migration
- Update existing records to set `is_active = TRUE`
- Migrate existing templates to new structure
- Validate data integrity after migration

#### 1.3 Testing
- Test all new functions with sample data
- Verify trigger behavior
- Validate constraint enforcement

### Phase 2: Backend API Updates (Week 2-3)

#### 2.1 New API Endpoints

**Template Management**
```javascript
// POST /api/templates
async function createTemplate(event, user) {
  // Insert into schedule_templates
  // Trigger automatically creates occurrences
  // Return template and generated occurrences
}

// POST /api/templates/:id/cancel
async function cancelTemplate(event, user) {
  // Call cancel_template_and_future_occurrences()
  // Log cancellation reason
  // Return affected occurrences
}

// POST /api/templates/:id/extend
async function extendTemplate(event, user) {
  // Call create_occurrences_from_template()
  // Return newly created occurrences
}
```

**Schedule Management**
```javascript
// POST /api/schedules/:id/complete
async function markCompleted(event, user) {
  // Call mark_schedule_completed()
  // Handle idempotency
  // Return success/error status
}

// POST /api/schedules/:id/cancel
async function cancelOccurrence(event, user) {
  // Soft cancel single occurrence
  // Set is_active = false, lesson_type = 'cancelled'
  // Log in schedule_history
}

// GET /api/schedule/upcoming
async function getUpcomingSchedule(event, user) {
  // Query upcoming_schedule_view
  // Filter by teacher/student as needed
  // Return only active occurrences
}
```

**Reporting & History**
```javascript
// GET /api/student/:id/history
async function getStudentHistory(event, user) {
  // Query student_schedules + schedule_history
  // Include lesson_reports
  // Return chronological history
}

// GET /api/finance/lessons
async function getFinanceLessons(event, user) {
  // Query student_lessons (canonical ledger)
  // Join with teacher/student context
  // Return billable hours data
}
```

#### 2.2 Update Existing Functions

**Replace Direct SQL Updates**
```javascript
// OLD: Direct attendance marking
// UPDATE student_schedules SET attendance_status = 'completed'...

// NEW: Use database functions
async function markAttendance(event, user) {
  const { schedule_id, status } = JSON.parse(event.body)
  
  if (status === 'completed') {
    await client.query('SELECT mark_schedule_completed($1, $2)', [schedule_id, user.userId])
  } else {
    // Use safe update for absent/warned
    await client.query(`
      UPDATE student_schedules 
      SET attendance_status = $1, attendance_date = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND is_active = TRUE
    `, [status, new Date().toISOString().split('T')[0], schedule_id])
  }
}
```

**Enhanced Schedule Creation**
```javascript
async function createSchedule(event, user) {
  // Create template first
  const templateResult = await client.query(`
    INSERT INTO schedule_templates (student_id, teacher_id, day_of_week, time_slot, start_date, end_date)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [student_id, teacher_id, day_of_week, time_slot, week_start_date, end_date])
  
  // Trigger automatically creates occurrences
  // Return template and generated occurrences
}
```

### Phase 3: Frontend Updates (Week 3-4)

#### 3.1 Calendar/Schedule View Updates

**Upcoming Schedule Component**
```jsx
// Update to use upcoming_schedule_view
const fetchUpcomingSchedule = async () => {
  const response = await apiService.getUpcomingSchedule({
    teacherId: user.teacherId,
    weeks: 12
  })
  setSchedule(response.data)
}

// Show only active occurrences
const renderSchedule = () => {
  return schedule
    .filter(item => item.is_active)
    .map(item => (
      <ScheduleItem 
        key={item.id}
        item={item}
        onComplete={handleComplete}
        onCancel={handleCancel}
        canDelete={item.week_start_date >= getCurrentWeekStart()}
      />
    ))
}
```

**History View Component**
```jsx
// Separate component for historical data
const StudentHistory = ({ studentId }) => {
  const [history, setHistory] = useState([])
  
  useEffect(() => {
    fetchStudentHistory(studentId)
  }, [studentId])
  
  const fetchStudentHistory = async (id) => {
    const response = await apiService.getStudentHistory(id)
    setHistory(response.data)
  }
  
  return (
    <div>
      {history.map(item => (
        <HistoryItem 
          key={item.id}
          item={item}
          isPast={item.week_start_date < getCurrentWeekStart()}
        />
      ))}
    </div>
  )
}
```

#### 3.2 Template Management UI

**Create Template Form**
```jsx
const CreateTemplateForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    student_id: '',
    teacher_id: '',
    day_of_week: 0,
    time_slot: '',
    start_date: '',
    end_date: '',
    lessons_per_week: 1
  })
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await apiService.createTemplate(formData)
      onSuccess(response.data)
      // Refresh calendar to show new occurrences
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit">Create Recurring Lesson</button>
    </form>
  )
}
```

**Template Management Panel**
```jsx
const TemplateManagement = () => {
  const [templates, setTemplates] = useState([])
  
  const handleCancelTemplate = async (templateId, reason) => {
    try {
      await apiService.cancelTemplate(templateId, { note: reason })
      // Refresh templates list
      fetchTemplates()
    } catch (error) {
      console.error('Failed to cancel template:', error)
    }
  }
  
  const handleExtendTemplate = async (templateId) => {
    try {
      await apiService.extendTemplate(templateId)
      // Refresh calendar
      fetchUpcomingSchedule()
    } catch (error) {
      console.error('Failed to extend template:', error)
    }
  }
  
  return (
    <div>
      {templates.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onCancel={handleCancelTemplate}
          onExtend={handleExtendTemplate}
        />
      ))}
    </div>
  )
}
```

#### 3.3 Enhanced Attendance Marking

**Mark Completed Button**
```jsx
const MarkCompletedButton = ({ scheduleItem, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  
  const handleMarkCompleted = async () => {
    if (loading || !scheduleItem.is_active || scheduleItem.attendance_status === 'completed') {
      return
    }
    
    setLoading(true)
    try {
      await apiService.markScheduleCompleted(scheduleItem.id)
      onSuccess(scheduleItem.id)
    } catch (error) {
      console.error('Failed to mark completed:', error)
      alert('Failed to mark lesson as completed')
    } finally {
      setLoading(false)
    }
  }
  
  const isDisabled = !scheduleItem.is_active || scheduleItem.attendance_status === 'completed'
  
  return (
    <button
      onClick={handleMarkCompleted}
      disabled={isDisabled || loading}
      className={`px-4 py-2 rounded ${
        isDisabled 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-green-500 text-white hover:bg-green-600'
      }`}
    >
      {loading ? 'Marking...' : 'Mark Completed'}
    </button>
  )
}
```

**Cancel Occurrence Button**
```jsx
const CancelOccurrenceButton = ({ scheduleItem, onSuccess }) => {
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')
  
  const handleCancel = async () => {
    try {
      await apiService.cancelOccurrence(scheduleItem.id, { reason })
      onSuccess(scheduleItem.id)
      setShowConfirm(false)
      setReason('')
    } catch (error) {
      console.error('Failed to cancel occurrence:', error)
    }
  }
  
  const isPast = scheduleItem.week_start_date < getCurrentWeekStart()
  
  if (isPast) {
    return (
      <button disabled className="px-4 py-2 bg-gray-300 text-gray-500 cursor-not-allowed rounded">
        Past Record (Archived)
      </button>
    )
  }
  
  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded"
      >
        Cancel Occurrence
      </button>
      
      {showConfirm && (
        <CancelConfirmModal
          onConfirm={handleCancel}
          onCancel={() => setShowConfirm(false)}
          reason={reason}
          onReasonChange={setReason}
        />
      )}
    </>
  )
}
```

### Phase 4: Background Jobs & Automation (Week 4)

#### 4.1 Template Extension Job
```javascript
// functions/jobs/extendTemplates.js
exports.handler = async (event, context) => {
  try {
    const client = await getPool().connect()
    
    // Extend all active templates by 12 weeks
    await client.query('SELECT extend_all_templates(12)')
    
    console.log('Template extension job completed successfully')
    return { statusCode: 200, body: 'Success' }
  } catch (error) {
    console.error('Template extension job failed:', error)
    return { statusCode: 500, body: 'Failed' }
  }
}
```

#### 4.2 Data Reconciliation Job
```javascript
// functions/jobs/reconcileLedger.js
exports.handler = async (event, context) => {
  try {
    const client = await getPool().connect()
    
    // Find completed schedules without ledger entries
    const missingEntries = await client.query(`
      SELECT ss.id, ss.student_id, ss.week_start_date, ss.day_of_week, ss.time_slot
      FROM student_schedules ss
      LEFT JOIN student_lessons sl ON (
        ss.student_id = sl.student_id AND
        sl.lesson_date = schedule_lesson_date(ss.week_start_date, ss.day_of_week) AND
        sl.time_slot = ss.time_slot
      )
      WHERE ss.attendance_status = 'completed'
        AND sl.id IS NULL
    `)
    
    // Create missing ledger entries
    for (const entry of missingEntries.rows) {
      const lessonDate = await client.query(
        'SELECT schedule_lesson_date($1, $2) as lesson_date',
        [entry.week_start_date, entry.day_of_week]
      )
      
      await client.query(`
        INSERT INTO student_lessons (student_id, lesson_date, time_slot)
        VALUES ($1, $2, $3)
        ON CONFLICT (student_id, lesson_date, time_slot) DO NOTHING
      `, [entry.student_id, lessonDate.rows[0].lesson_date, entry.time_slot])
    }
    
    console.log(`Reconciled ${missingEntries.rows.length} missing ledger entries`)
    return { statusCode: 200, body: 'Success' }
  } catch (error) {
    console.error('Ledger reconciliation failed:', error)
    return { statusCode: 500, body: 'Failed' }
  }
}
```

### Phase 5: Testing & Validation (Week 5)

#### 5.1 Unit Tests
```javascript
// tests/schedule-functions.test.js
describe('Schedule Functions', () => {
  test('mark_schedule_completed should be idempotent', async () => {
    // Test multiple calls don't create duplicate ledger entries
  })
  
  test('cancel_template_and_future_occurrences should not affect past records', async () => {
    // Test past records remain untouched
  })
  
  test('create_occurrences_from_template should avoid duplicates', async () => {
    // Test idempotent creation
  })
})
```

#### 5.2 Integration Tests
```javascript
// tests/api/schedule.test.js
describe('Schedule API', () => {
  test('POST /api/schedules/:id/complete should update both tables atomically', async () => {
    // Test atomic completion
  })
  
  test('POST /api/templates should create template and occurrences', async () => {
    // Test template creation with trigger
  })
})
```

#### 5.3 End-to-End Tests
```javascript
// tests/e2e/schedule-workflow.test.js
describe('Schedule Workflow', () => {
  test('Complete lesson workflow from creation to completion', async () => {
    // 1. Create template
    // 2. Verify occurrences generated
    // 3. Mark as completed
    // 4. Verify ledger entry created
    // 5. Cancel template
    // 6. Verify future occurrences cancelled
  })
})
```

## Migration Strategy

### 1. Database Migration
1. **Backup Current Data**: Full database backup before migration
2. **Apply Schema Changes**: Run the provided SQL script
3. **Data Validation**: Verify all existing data migrated correctly
4. **Test Functions**: Validate all new functions work correctly

### 2. Backend Migration
1. **Deploy New Functions**: Deploy updated API endpoints
2. **Maintain Backward Compatibility**: Keep old endpoints temporarily
3. **Gradual Migration**: Update frontend to use new endpoints
4. **Remove Old Code**: Clean up deprecated functions

### 3. Frontend Migration
1. **Update Components**: Modify existing components to use new APIs
2. **Add New Features**: Implement template management UI
3. **User Training**: Provide documentation for new features
4. **Feedback Collection**: Gather user feedback and iterate

## Risk Mitigation

### 1. Data Integrity
- **Comprehensive Testing**: Extensive testing before deployment
- **Rollback Plan**: Ability to revert database changes
- **Data Validation**: Continuous monitoring of data consistency

### 2. User Experience
- **Gradual Rollout**: Phased deployment to minimize disruption
- **User Training**: Clear documentation and training materials
- **Support**: Dedicated support during transition period

### 3. Performance
- **Load Testing**: Test with realistic data volumes
- **Monitoring**: Continuous performance monitoring
- **Optimization**: Regular query optimization

## Success Metrics

### 1. Data Quality
- Zero data integrity violations
- 100% audit trail coverage
- Consistent state across all tables

### 2. User Experience
- Reduced user errors in schedule management
- Faster schedule creation and management
- Improved data visibility and reporting

### 3. System Performance
- Sub-second response times for all operations
- Reliable background job execution
- Scalable to increased data volumes

## Conclusion

This enhancement plan provides a comprehensive approach to improving the schedule management system with:

1. **Robust Data Integrity**: Database functions and triggers ensure consistency
2. **Comprehensive Audit Trail**: Complete tracking of all changes
3. **Improved User Experience**: Better UI/UX for schedule management
4. **Scalable Architecture**: Support for future growth and features
5. **Maintainable Code**: Clean separation of concerns and proper error handling

The phased approach ensures minimal disruption while providing maximum benefit to users and administrators.
