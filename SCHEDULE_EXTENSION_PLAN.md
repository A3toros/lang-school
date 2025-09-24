# Schedule Extension Plan - COMPUTE OPTIMIZED

## Current System Analysis

### How We Currently Create 12 Weeks
1. **Template System**: Uses `schedule_templates` table to store recurring patterns
2. **Auto-Generation**: `create_occurrences_from_template()` function creates 12 weeks automatically
3. **Template Tracking**: Each schedule has a `template_id` linking it to its template

### The Problem
- **Different Creation Times**: Some lessons added earlier, some later
- **Inconsistent End Dates**: Different time slots have different "last week" dates
- **Manual Extension Needed**: Need to add 1 more week after the last existing week for each time slot

## Solution: MINIMAL COMPUTE Extension

### 1. **Ultra-Efficient Database Function: `extend_schedules_by_one_week()`**

```sql
CREATE OR REPLACE FUNCTION extend_schedules_by_one_week()
RETURNS INT AS $$
DECLARE
  inserted_count INT := 0;
BEGIN
  -- Single query: Find last week per template and insert next week
  WITH last_weeks AS (
    SELECT DISTINCT
      ss.template_id,
      ss.student_id,
      ss.teacher_id,
      ss.day_of_week,
      ss.time_slot,
      MAX(ss.week_start_date) as last_week_date
    FROM student_schedules ss
    JOIN schedule_templates tpl ON ss.template_id = tpl.id
    WHERE tpl.is_active = TRUE
      AND ss.is_active = TRUE
      AND ss.week_start_date >= get_current_week_start()
    GROUP BY ss.template_id, ss.student_id, ss.teacher_id, ss.day_of_week, ss.time_slot
  )
  INSERT INTO student_schedules (
    student_id, teacher_id, day_of_week, time_slot, week_start_date,
    is_recurring, template_id, lesson_type, attendance_status, is_active,
    created_at, updated_at
  )
  SELECT 
    lw.student_id, lw.teacher_id, lw.day_of_week, lw.time_slot,
    lw.last_week_date + INTERVAL '7 days' as new_week_date,
    TRUE, lw.template_id, 'scheduled', 'scheduled', TRUE,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM last_weeks lw
  WHERE NOT EXISTS (
    SELECT 1 FROM student_schedules ss2
    WHERE ss2.student_id = lw.student_id 
      AND ss2.teacher_id = lw.teacher_id 
      AND ss2.day_of_week = lw.day_of_week 
      AND ss2.time_slot = lw.time_slot 
      AND ss2.week_start_date = lw.last_week_date + INTERVAL '7 days'
  );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;
```

### 2. **Minimal Backend API: `extendSchedules`**

```javascript
// functions/schedules.js
async function extendSchedules(event, user) {
  try {
    const client = await getClient()
    
    // Single database call - returns count only
    const result = await client.query('SELECT extend_schedules_by_one_week() as count')
    const count = result.rows[0].count
    
    console.log(`✅ [EXTEND_SCHEDULES] Extended ${count} schedule templates`)
    
    return successResponse({ 
      success: true, 
      count,
      message: `Successfully extended ${count} schedule templates by one week`
    })
    
  } catch (error) {
    console.error('❌ [EXTEND_SCHEDULES] Error:', error)
    return errorResponse(500, 'Failed to extend schedules')
  }
}
```

### 3. **Minimal Frontend API Service**

```javascript
// src/utils/api.js
async extendSchedules() {
  return this.makeRequest('/api/schedules/extend', {
    method: 'POST'
  })
}
```

### 4. **Simple Admin UI Button**

```jsx
// src/components/admin/ScheduleTable.jsx
const [isExtending, setIsExtending] = useState(false)

const handleExtendSchedules = async () => {
  try {
    setIsExtending(true)
    const response = await apiService.extendSchedules()
    
    if (response.success) {
      showNotificationMessage(
        'Success!', 
        `Extended ${response.count} schedules by one week`, 
        'success'
      )
      
      // Component-level refresh - only fetch schedule data
      await fetchSchedule()
    } else {
      showNotificationMessage('Error', 'Failed to extend schedules', 'error')
    }
  } catch (error) {
    console.error('Error extending schedules:', error)
    showNotificationMessage('Error', 'Failed to extend schedules', 'error')
  } finally {
    setIsExtending(false)
  }
}

// In the JSX - Simple button:
<button
  onClick={handleExtendSchedules}
  disabled={isExtending}
  className="btn btn-primary"
>
  {isExtending ? 'Extending...' : 'Extend +1 Week'}
</button>
```

## COMPUTE OPTIMIZATION Benefits

### 1. **Single Database Query**
- **No loops** - uses CTE (Common Table Expression) for efficiency
- **Bulk INSERT** - all extensions in one operation
- **Minimal data transfer** - returns only count, not details

### 2. **Smart Detection**
- Finds the **last week** for each unique time slot combination
- Only extends schedules that are **active** and **current/future**
- Avoids duplicates with `NOT EXISTS` check

### 3. **Template-Based Tracking**
- Uses existing `template_id` system to track which schedules belong together
- Groups by `(student_id, teacher_id, day_of_week, time_slot)` to find the pattern
- Extends each pattern independently

### 4. **Minimal API Response**
- Returns only count, not full details
- Reduces network payload
- Faster response times

### 5. **Component-Level Refresh**
- Only refreshes schedule data, not entire page
- Preserves UI state and scroll position

## Example Scenario

**Before Extension:**
- Student A, Teacher 1, Monday 9:00: Weeks 1-10 (last week: 2025-12-01)
- Student B, Teacher 1, Monday 9:00: Weeks 3-12 (last week: 2025-12-15)
- Student C, Teacher 2, Tuesday 10:00: Weeks 1-8 (last week: 2025-11-17)

**After Extension:**
- Student A, Teacher 1, Monday 9:00: Weeks 1-11 (new week: 2025-12-08)
- Student B, Teacher 1, Monday 9:00: Weeks 3-13 (new week: 2025-12-22)
- Student C, Teacher 2, Tuesday 10:00: Weeks 1-9 (new week: 2025-11-24)

## Benefits

1. **Intelligent**: Only extends what needs extending
2. **Safe**: No duplicates, preserves existing data
3. **Flexible**: Works with any schedule pattern
4. **Controlled**: Admin can trigger when needed
5. **Transparent**: Shows exactly what was extended

## COMPUTE EFFICIENCY Summary

### Database Level:
- **1 query** instead of N queries (where N = number of templates)
- **CTE + Bulk INSERT** instead of loops
- **Returns only count** instead of full details

### Backend Level:
- **Single database call** 
- **Minimal response payload**
- **No data processing** - just pass through count

### Frontend Level:
- **Simple button** with loading state
- **Component-level refresh** only
- **Minimal UI updates**

## Smart Reminder System

### **Database Function: `get_schedules_needing_extension()`**

```sql
CREATE OR REPLACE FUNCTION get_schedules_needing_extension(p_weeks_threshold INT DEFAULT 2)
RETURNS TABLE(
  student_id INT,
  teacher_id INT,
  student_name TEXT,
  teacher_name TEXT,
  day_of_week INT,
  time_slot TEXT,
  last_week_date TEXT,  -- Return as TEXT to avoid timezone conversion
  weeks_remaining INT
) AS $$
BEGIN
  RETURN QUERY
  WITH last_weeks AS (
    SELECT DISTINCT
      ss.template_id,
      ss.student_id,
      ss.teacher_id,
      s.name as student_name,
      t.name as teacher_name,
      ss.day_of_week,
      ss.time_slot,
      MAX(ss.week_start_date)::TEXT as last_week_date,  -- Cast to TEXT
      -- Calculate weeks remaining until last week (using DATE arithmetic)
      (MAX(ss.week_start_date) - get_current_week_start()) / 7 as weeks_remaining
    FROM student_schedules ss
    JOIN schedule_templates tpl ON ss.template_id = tpl.id
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE tpl.is_active = TRUE
      AND ss.is_active = TRUE
      AND ss.week_start_date >= get_current_week_start()
    GROUP BY ss.template_id, ss.student_id, ss.teacher_id, s.name, t.name, ss.day_of_week, ss.time_slot
  )
  SELECT 
    lw.student_id,
    lw.teacher_id,
    lw.student_name,
    lw.teacher_name,
    lw.day_of_week,
    lw.time_slot,
    lw.last_week_date,
    lw.weeks_remaining::INT
  FROM last_weeks lw
  WHERE lw.weeks_remaining <= p_weeks_threshold
  ORDER BY lw.weeks_remaining ASC, lw.last_week_date ASC;
END;
$$ LANGUAGE plpgsql;
```

### **Backend API: `getSchedulesNeedingExtension`**

```javascript
// functions/schedules.js
async function getSchedulesNeedingExtension(event, user) {
  try {
    const client = await getClient()
    const { weeks_threshold = 2 } = event.queryStringParameters || {}
    
    const result = await client.query(
      'SELECT * FROM get_schedules_needing_extension($1)',
      [weeks_threshold]
    )
    
    const schedules = result.rows.map(row => ({
      studentId: row.student_id,
      teacherId: row.teacher_id,
      studentName: row.student_name,
      teacherName: row.teacher_name,
      dayOfWeek: row.day_of_week,
      timeSlot: row.time_slot,
      lastWeekDate: row.last_week_date,
      weeksRemaining: row.weeks_remaining
    }))
    
    return successResponse({ 
      success: true, 
      schedules,
      count: schedules.length,
      threshold: weeks_threshold
    })
    
  } catch (error) {
    console.error('❌ [GET_SCHEDULES_NEEDING_EXTENSION] Error:', error)
    return errorResponse(500, 'Failed to get schedules needing extension')
  }
}
```

### **Frontend API Service**

```javascript
// src/utils/api.js
async getSchedulesNeedingExtension(weeksThreshold = 2) {
  return this.makeRequest(`/api/schedules/needing-extension?weeks_threshold=${weeksThreshold}`)
}
```

### **Admin UI Reminder Component**

```jsx
// src/components/admin/ScheduleExtensionReminder.jsx
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'

const ScheduleExtensionReminder = ({ onExtendSchedules }) => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchSchedulesNeedingExtension()
  }, [])

  const fetchSchedulesNeedingExtension = async () => {
    try {
      setLoading(true)
      const response = await apiService.getSchedulesNeedingExtension(2)
      
      if (response.success) {
        setSchedules(response.schedules)
      }
    } catch (error) {
      console.error('Error fetching schedules needing extension:', error)
    } finally {
      setLoading(false)
    }

  }

  if (loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-4 h-4 bg-yellow-300 rounded-full"></div>
          <div className="h-4 bg-yellow-300 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  if (schedules.length === 0) {
    return null // No reminder needed
  }

  const criticalCount = schedules.filter(s => s.weeksRemaining <= 1).length
  const warningCount = schedules.filter(s => s.weeksRemaining === 2).length

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-4 ${
        criticalCount > 0 
          ? 'bg-red-50 border-red-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            criticalCount > 0 ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <div>
            <h3 className={`font-medium ${
              criticalCount > 0 ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {criticalCount > 0 ? '⚠️ Critical' : '⚠️ Warning'}: {schedules.length} schedules need extension
            </h3>
            <p className={`text-sm ${
              criticalCount > 0 ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {criticalCount > 0 && `${criticalCount} have 1 week or less`}
              {criticalCount > 0 && warningCount > 0 && ', '}
              {warningCount > 0 && `${warningCount} have 2 weeks remaining`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          <button
            onClick={onExtendSchedules}
            className="btn btn-primary text-sm"
          >
            Extend All +1 Week
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 border-t pt-4"
          >
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {schedules.map((schedule, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{schedule.studentName}</span>
                    <span className="text-gray-500"> with {schedule.teacherName}</span>
                    <span className="text-gray-400"> - {schedule.timeSlot}</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    schedule.weeksRemaining <= 1 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {schedule.weeksRemaining} week{schedule.weeksRemaining !== 1 ? 's' : ''} left
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ScheduleExtensionReminder
```

### **Daily Check System**

#### **Database Function: `get_daily_extension_check_status()` (ADMIN-ONLY, TIMESTAMP-SAFE)**

```sql
CREATE OR REPLACE FUNCTION get_daily_extension_check_status(p_user_id INT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN AS $$
DECLARE
  check_exists BOOLEAN;
  user_role_check user_role;
BEGIN
  -- First verify user is admin
  SELECT role INTO user_role_check 
  FROM users 
  WHERE id = p_user_id AND is_active = true;
  
  -- If user is not admin, return true (pretend already checked)
  IF user_role_check != 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if we've already checked today for this admin user
  SELECT EXISTS(
    SELECT 1 FROM daily_extension_checks 
    WHERE user_id = p_user_id 
      AND check_date = p_date
  ) INTO check_exists;
  
  RETURN check_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to mark daily check as completed (ADMIN-ONLY, TIMESTAMP-SAFE)
CREATE OR REPLACE FUNCTION mark_daily_extension_check_completed(p_user_id INT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  user_role_check user_role;
BEGIN
  -- First verify user is admin
  SELECT role INTO user_role_check 
  FROM users 
  WHERE id = p_user_id AND is_active = true;
  
  -- If user is not admin, do nothing
  IF user_role_check != 'admin' THEN
    RETURN;
  END IF;
  
  -- Only mark check for admin users
  INSERT INTO daily_extension_checks (user_id, check_date, created_at)
  VALUES (p_user_id, p_date, CURRENT_TIMESTAMP)
  ON CONFLICT (user_id, check_date) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
```

#### **Database Table: `daily_extension_checks`**

```sql
CREATE TABLE IF NOT EXISTS daily_extension_checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, check_date)
);
```

#### **Backend API: `checkDailyExtensionStatus` (ADMIN-ONLY, TIMESTAMP-SAFE)**

```javascript
// functions/schedules.js
async function checkDailyExtensionStatus(event, user) {
  try {
    // Verify user is admin
    if (user.role !== 'admin') {
      return successResponse({ 
        success: true, 
        alreadyChecked: true,
        message: 'Daily check not applicable for non-admin users'
      })
    }
    
    const client = await getClient()
    
    // Use database function to get current date (avoid timezone issues)
    const todayResult = await client.query('SELECT CURRENT_DATE as today')
    const today = todayResult.rows[0].today
    
    // Check if we've already checked today (database function also checks admin role)
    const checkResult = await client.query(
      'SELECT get_daily_extension_check_status($1, $2) as already_checked',
      [user.id, today]
    )
    
    const alreadyChecked = checkResult.rows[0].already_checked
    
    if (alreadyChecked) {
      return successResponse({ 
        success: true, 
        alreadyChecked: true,
        message: 'Daily check already completed today'
      })
    }
    
    // Get schedules needing extension
    const schedulesResult = await client.query(
      'SELECT * FROM get_schedules_needing_extension(2)'
    )
    
    const schedules = schedulesResult.rows.map(row => ({
      studentId: row.student_id,
      teacherId: row.teacher_id,
      studentName: row.student_name,
      teacherName: row.teacher_name,
      dayOfWeek: row.day_of_week,
      timeSlot: row.time_slot,
      lastWeekDate: row.last_week_date, // Already a TEXT string from database
      weeksRemaining: row.weeks_remaining
    }))
    
    // Mark today's check as completed (database function also checks admin role)
    await client.query(
      'SELECT mark_daily_extension_check_completed($1, $2)',
      [user.id, today]
    )
    
    return successResponse({ 
      success: true, 
      alreadyChecked: false,
      schedules,
      count: schedules.length,
      message: schedules.length > 0 
        ? `Found ${schedules.length} schedules needing extension` 
        : 'All schedules are up to date'
    })
    
  } catch (error) {
    console.error('❌ [CHECK_DAILY_EXTENSION_STATUS] Error:', error)
    return errorResponse(500, 'Failed to check daily extension status')
  }
}
```

#### **Frontend API Service**

```javascript
// src/utils/api.js
async checkDailyExtensionStatus() {
  return this.makeRequest('/api/schedules/daily-extension-check', {
    method: 'POST'
  })
}
```

#### **Enhanced Reminder Component with Daily Check**

```jsx
// src/components/admin/ScheduleExtensionReminder.jsx
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiService from '../../utils/api'

const ScheduleExtensionReminder = ({ onExtendSchedules }) => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [alreadyCheckedToday, setAlreadyCheckedToday] = useState(false)

  useEffect(() => {
    checkDailyExtensionStatus()
  }, [])

  const checkDailyExtensionStatus = async () => {
    try {
      setLoading(true)
      const response = await apiService.checkDailyExtensionStatus()
      
      if (response.success) {
        setAlreadyCheckedToday(response.alreadyChecked)
        
        if (!response.alreadyChecked && response.schedules) {
          setSchedules(response.schedules)
        } else if (response.alreadyChecked) {
          // If already checked today, don't show reminder
          setSchedules([])
        }
      }
    } catch (error) {
      console.error('Error checking daily extension status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExtendAndRefresh = async () => {
    await onExtendSchedules()
    // After extending, refresh the reminder
    await checkDailyExtensionStatus()
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-4 h-4 bg-blue-300 rounded-full"></div>
          <div className="h-4 bg-blue-300 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  // Don't show anything if already checked today and no schedules need extension
  if (alreadyCheckedToday && schedules.length === 0) {
    return null
  }

  // Show info if already checked today
  if (alreadyCheckedToday) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div>
            <h3 className="font-medium text-green-800">
              ✅ Daily check completed
            </h3>
            <p className="text-sm text-green-600">
              Schedule extension check already performed today
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div>
            <h3 className="font-medium text-green-800">
              ✅ All schedules up to date
            </h3>
            <p className="text-sm text-green-600">
              No schedules need extension at this time
            </p>
          </div>
        </div>
      </div>
    )
  }

  const criticalCount = schedules.filter(s => s.weeksRemaining <= 1).length
  const warningCount = schedules.filter(s => s.weeksRemaining === 2).length

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-4 ${
        criticalCount > 0 
          ? 'bg-red-50 border-red-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            criticalCount > 0 ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <div>
            <h3 className={`font-medium ${
              criticalCount > 0 ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {criticalCount > 0 ? '⚠️ Critical' : '⚠️ Warning'}: {schedules.length} schedules need extension
            </h3>
            <p className={`text-sm ${
              criticalCount > 0 ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {criticalCount > 0 && `${criticalCount} have 1 week or less`}
              {criticalCount > 0 && warningCount > 0 && ', '}
              {warningCount > 0 && `${warningCount} have 2 weeks remaining`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          <button
            onClick={handleExtendAndRefresh}
            className="btn btn-primary text-sm"
          >
            Extend All +1 Week
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 border-t pt-4"
          >
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {schedules.map((schedule, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{schedule.studentName}</span>
                    <span className="text-gray-500"> with {schedule.teacherName}</span>
                    <span className="text-gray-400"> - {schedule.timeSlot}</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    schedule.weeksRemaining <= 1 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {schedule.weeksRemaining} week{schedule.weeksRemaining !== 1 ? 's' : ''} left
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ScheduleExtensionReminder
```

### **Integration in ScheduleTable**

```jsx
// src/components/admin/ScheduleTable.jsx
import ScheduleExtensionReminder from './ScheduleExtensionReminder'

// In the JSX, add at the top:
<ScheduleExtensionReminder onExtendSchedules={handleExtendSchedules} />
```

## Daily Check System Benefits

### **Efficiency:**
- **Once per day**: Only checks on first login
- **No spam**: Subsequent logins don't trigger checks
- **User-specific**: Each admin has their own daily check
- **Automatic**: No manual intervention needed

### **User Experience:**
- **First login**: Shows reminder if schedules need extension
- **Subsequent logins**: Shows "Daily check completed" or nothing
- **Next day**: Resets and checks again on first login

### **Database Tracking:**
- **`daily_extension_checks` table**: Tracks which users checked on which dates
- **Unique constraint**: Prevents duplicate checks per user per day
- **Automatic cleanup**: Old records can be purged periodically

### **ADMIN-ONLY + TIMESTAMP-SAFE Implementation:**
- **Admin role check**: Both backend API and database functions verify user is admin
- **Database dates**: Uses `CURRENT_DATE` from database (not JavaScript)
- **TEXT casting**: Returns dates as TEXT to avoid timezone conversion
- **DATE arithmetic**: Uses PostgreSQL DATE operations instead of JavaScript
- **No timezone issues**: All date operations happen in database timezone
- **Security**: Non-admin users get "already checked" response (no access)

## Implementation Steps

1. ✅ Create ultra-efficient database function
2. ✅ Add minimal backend API endpoint  
3. ✅ Add simple frontend API service
4. ✅ Add basic admin UI button
5. ✅ Add smart reminder system
6. ✅ Add daily check system
7. ✅ Create daily_extension_checks table
8. ✅ Test with existing schedules
9. ✅ Verify compute efficiency

