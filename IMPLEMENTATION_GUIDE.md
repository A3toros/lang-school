# Schedule Enhancement Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing the enhanced schedule management system with improved data integrity, audit trails, and business logic enforcement.

## Prerequisites
- PostgreSQL database with existing Lang School schema
- Node.js backend with existing API structure
- React frontend with existing schedule components

## Step 1: Database Migration

### 1.1 Apply the SQL Migration
```bash
# Run the migration script
psql -d your_database -f migrations/2025-01-15_schedule_enhancement.sql
```

### 1.2 Verify Migration Success
```sql
-- Check that is_active column was added and populated
SELECT COUNT(*) as total_schedules, 
       COUNT(*) FILTER (WHERE is_active = TRUE) as active_schedules,
       COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_schedules
FROM student_schedules;

-- Check that new functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('schedule_lesson_date', 'create_occurrences_from_template', 'cancel_template_and_future_occurrences', 'mark_schedule_completed');

-- Check that triggers exist
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN ('trg_protect_past_schedules_delete', 'schedule_template_after_insert', 'trg_enforce_schedule_status_consistency');

-- Check that view exists
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'upcoming_schedule_view';
```

## Step 2: Backend Implementation

### 2.1 Deploy New API Functions
1. Copy `functions/schedule-enhanced.js` to your functions directory
2. Update your API routing to include the new endpoints
3. Test the new functions with sample data

### 2.2 Update Existing Functions
Replace direct SQL updates in existing functions with calls to the new database functions:

**Before (Old Approach):**
```javascript
// Direct SQL update
await client.query(`
  UPDATE student_schedules 
  SET attendance_status = 'completed', attendance_date = $1
  WHERE id = $2
`, [date, scheduleId])
```

**After (New Approach):**
```javascript
// Use database function
await client.query('SELECT mark_schedule_completed($1, $2)', [scheduleId, userId])
```

### 2.3 Add Background Jobs
Create scheduled jobs for template extension and data reconciliation:

```javascript
// functions/jobs/extendTemplates.js
exports.handler = async (event, context) => {
  try {
    const client = await getPool().connect()
    await client.query('SELECT extend_all_templates(12)')
    console.log('Template extension job completed')
    return { statusCode: 200, body: 'Success' }
  } catch (error) {
    console.error('Template extension job failed:', error)
    return { statusCode: 500, body: 'Failed' }
  }
}
```

## Step 3: Frontend Implementation

### 3.1 Update API Service
Add new methods to your API service:

```javascript
// src/utils/api.js
class ApiService {
  // ... existing methods ...

  async getUpcomingSchedule(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const response = await fetch(`/api/schedule/upcoming?${queryString}`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return response.json()
  }

  async markScheduleCompleted(scheduleId, reason = '') {
    const response = await fetch(`/api/schedules/${scheduleId}/complete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason })
    })
    return response.json()
  }

  async cancelOccurrence(scheduleId, reason = '') {
    const response = await fetch(`/api/schedules/${scheduleId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason })
    })
    return response.json()
  }

  async createTemplate(templateData) {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(templateData)
    })
    return response.json()
  }

  async cancelTemplate(templateId, note = '') {
    const response = await fetch(`/api/templates/${templateId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ note })
    })
    return response.json()
  }

  async extendTemplate(templateId, weeksAhead = 12) {
    const response = await fetch(`/api/templates/${templateId}/extend`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ weeks_ahead: weeksAhead })
    })
    return response.json()
  }

  async getStudentHistory(studentId, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const response = await fetch(`/api/student/${studentId}/history?${queryString}`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return response.json()
  }

  async getFinanceLessons(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const response = await fetch(`/api/finance/lessons?${queryString}`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return response.json()
  }
}
```

### 3.2 Update Schedule Components

**Upcoming Schedule Component:**
```jsx
// src/components/schedule/UpcomingSchedule.jsx
import React, { useState, useEffect } from 'react'
import apiService from '../../utils/api'

const UpcomingSchedule = ({ teacherId, studentId, weeks = 12 }) => {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingSchedule()
  }, [teacherId, studentId, weeks])

  const fetchUpcomingSchedule = async () => {
    try {
      setLoading(true)
      const response = await apiService.getUpcomingSchedule({
        teacherId,
        studentId,
        weeks
      })
      setSchedule(response.schedule || [])
    } catch (error) {
      console.error('Failed to fetch upcoming schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkCompleted = async (scheduleId) => {
    try {
      await apiService.markScheduleCompleted(scheduleId)
      // Refresh schedule
      fetchUpcomingSchedule()
    } catch (error) {
      console.error('Failed to mark completed:', error)
      alert('Failed to mark lesson as completed')
    }
  }

  const handleCancelOccurrence = async (scheduleId, reason) => {
    try {
      await apiService.cancelOccurrence(scheduleId, reason)
      // Refresh schedule
      fetchUpcomingSchedule()
    } catch (error) {
      console.error('Failed to cancel occurrence:', error)
      alert('Failed to cancel occurrence')
    }
  }

  if (loading) {
    return <div>Loading schedule...</div>
  }

  return (
    <div className="upcoming-schedule">
      <h2>Upcoming Schedule</h2>
      {schedule.map(item => (
        <ScheduleItem
          key={item.id}
          item={item}
          onMarkCompleted={handleMarkCompleted}
          onCancel={handleCancelOccurrence}
          canDelete={item.week_start_date >= getCurrentWeekStart()}
        />
      ))}
    </div>
  )
}

export default UpcomingSchedule
```

**Schedule Item Component:**
```jsx
// src/components/schedule/ScheduleItem.jsx
import React, { useState } from 'react'

const ScheduleItem = ({ item, onMarkCompleted, onCancel, canDelete }) => {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const handleMarkCompleted = () => {
    onMarkCompleted(item.id)
  }

  const handleCancel = () => {
    onCancel(item.id, cancelReason)
    setShowCancelModal(false)
    setCancelReason('')
  }

  const isPast = item.week_start_date < getCurrentWeekStart()
  const isCompleted = item.attendance_status === 'completed'
  const isInactive = !item.is_active

  return (
    <div className={`schedule-item ${isInactive ? 'inactive' : ''}`}>
      <div className="schedule-info">
        <h3>{item.student_name}</h3>
        <p>{item.day_name} at {item.time_slot}</p>
        <p>Date: {item.lesson_date}</p>
        <p>Status: {item.attendance_status}</p>
      </div>
      
      <div className="schedule-actions">
        {!isPast && !isCompleted && !isInactive && (
          <button
            onClick={handleMarkCompleted}
            className="btn-complete"
          >
            Mark Completed
          </button>
        )}
        
        {!isPast && !isInactive && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="btn-cancel"
          >
            Cancel
          </button>
        )}
        
        {isPast && (
          <span className="past-record">Past Record (Archived)</span>
        )}
      </div>

      {showCancelModal && (
        <CancelModal
          onConfirm={handleCancel}
          onCancel={() => setShowCancelModal(false)}
          reason={cancelReason}
          onReasonChange={setCancelReason}
        />
      )}
    </div>
  )
}

export default ScheduleItem
```

### 3.3 Template Management UI

**Template Creation Form:**
```jsx
// src/components/templates/CreateTemplateForm.jsx
import React, { useState } from 'react'
import apiService from '../../utils/api'

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
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await apiService.createTemplate(formData)
      onSuccess(response)
    } catch (error) {
      console.error('Failed to create template:', error)
      alert('Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="create-template-form">
      <h2>Create Recurring Lesson</h2>
      
      <div className="form-group">
        <label>Student</label>
        <select
          value={formData.student_id}
          onChange={(e) => setFormData({...formData, student_id: e.target.value})}
          required
        >
          <option value="">Select Student</option>
          {/* Populate with students */}
        </select>
      </div>

      <div className="form-group">
        <label>Teacher</label>
        <select
          value={formData.teacher_id}
          onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
          required
        >
          <option value="">Select Teacher</option>
          {/* Populate with teachers */}
        </select>
      </div>

      <div className="form-group">
        <label>Day of Week</label>
        <select
          value={formData.day_of_week}
          onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
          required
        >
          <option value={0}>Monday</option>
          <option value={1}>Tuesday</option>
          <option value={2}>Wednesday</option>
          <option value={3}>Thursday</option>
          <option value={4}>Friday</option>
          <option value={5}>Saturday</option>
          <option value={6}>Sunday</option>
        </select>
      </div>

      <div className="form-group">
        <label>Time Slot</label>
        <select
          value={formData.time_slot}
          onChange={(e) => setFormData({...formData, time_slot: e.target.value})}
          required
        >
          <option value="">Select Time</option>
          {/* Populate with time slots */}
        </select>
      </div>

      <div className="form-group">
        <label>Start Date</label>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({...formData, start_date: e.target.value})}
          required
        />
      </div>

      <div className="form-group">
        <label>End Date (Optional)</label>
        <input
          type="date"
          value={formData.end_date}
          onChange={(e) => setFormData({...formData, end_date: e.target.value})}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Recurring Lesson'}
      </button>
    </form>
  )
}

export default CreateTemplateForm
```

**Template Management Panel:**
```jsx
// src/components/templates/TemplateManagement.jsx
import React, { useState, useEffect } from 'react'
import apiService from '../../utils/api'

const TemplateManagement = () => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      // Implement template fetching
      // This would need a new API endpoint
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelTemplate = async (templateId, reason) => {
    try {
      await apiService.cancelTemplate(templateId, reason)
      fetchTemplates()
    } catch (error) {
      console.error('Failed to cancel template:', error)
      alert('Failed to cancel template')
    }
  }

  const handleExtendTemplate = async (templateId) => {
    try {
      await apiService.extendTemplate(templateId)
      fetchTemplates()
    } catch (error) {
      console.error('Failed to extend template:', error)
      alert('Failed to extend template')
    }
  }

  if (loading) {
    return <div>Loading templates...</div>
  }

  return (
    <div className="template-management">
      <h2>Template Management</h2>
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

export default TemplateManagement
```

## Step 4: Testing

### 4.1 Unit Tests
Create comprehensive tests for the new functions:

```javascript
// tests/schedule-enhanced.test.js
describe('Schedule Enhanced API', () => {
  test('markScheduleCompleted should be idempotent', async () => {
    // Test multiple calls don't create duplicate ledger entries
  })
  
  test('cancelTemplate should not affect past records', async () => {
    // Test past records remain untouched
  })
  
  test('createTemplate should generate occurrences', async () => {
    // Test template creation with trigger
  })
})
```

### 4.2 Integration Tests
Test the complete workflow:

```javascript
// tests/integration/schedule-workflow.test.js
describe('Schedule Workflow Integration', () => {
  test('Complete lesson workflow', async () => {
    // 1. Create template
    // 2. Verify occurrences generated
    // 3. Mark as completed
    // 4. Verify ledger entry created
    // 5. Cancel template
    // 6. Verify future occurrences cancelled
  })
})
```

## Step 5: Deployment

### 5.1 Database Migration
1. **Backup Database**: Create full backup before migration
2. **Apply Migration**: Run the SQL migration script
3. **Verify Data**: Run validation queries
4. **Test Functions**: Verify all new functions work

### 5.2 Backend Deployment
1. **Deploy New Functions**: Deploy updated API endpoints
2. **Update Routing**: Add new routes to your API gateway
3. **Test Endpoints**: Verify all new endpoints work correctly
4. **Monitor Logs**: Watch for any errors during deployment

### 5.3 Frontend Deployment
1. **Update Components**: Deploy updated React components
2. **Update API Service**: Deploy new API service methods
3. **User Training**: Provide documentation for new features
4. **Monitor Usage**: Track user adoption of new features

## Step 6: Monitoring & Maintenance

### 6.1 Background Jobs
Set up scheduled jobs for:
- Daily template extension
- Weekly data reconciliation
- Monthly audit reports

### 6.2 Monitoring
Monitor:
- Database function performance
- API response times
- Error rates
- User adoption metrics

### 6.3 Maintenance
Regular maintenance tasks:
- Review audit logs
- Clean up old history records
- Optimize database queries
- Update documentation

## Troubleshooting

### Common Issues

**1. Migration Fails**
- Check database permissions
- Verify existing schema compatibility
- Review error logs for specific issues

**2. Functions Don't Work**
- Verify function creation in database
- Check function permissions
- Test with sample data

**3. Frontend Errors**
- Check API endpoint URLs
- Verify authentication headers
- Review browser console for errors

**4. Data Inconsistency**
- Run reconciliation jobs
- Check audit logs
- Verify trigger functionality

### Support Resources
- Database logs: Check PostgreSQL logs for function errors
- API logs: Review serverless function logs
- Frontend logs: Check browser console and network tab
- Documentation: Refer to this guide and code comments

## Conclusion

This implementation guide provides a comprehensive approach to enhancing your schedule management system. The new system offers:

- **Improved Data Integrity**: Database functions ensure consistency
- **Better Audit Trail**: Complete tracking of all changes
- **Enhanced User Experience**: Better UI/UX for schedule management
- **Scalable Architecture**: Support for future growth
- **Maintainable Code**: Clean separation of concerns

Follow the steps in order, test thoroughly at each stage, and monitor the system after deployment to ensure everything works as expected.
