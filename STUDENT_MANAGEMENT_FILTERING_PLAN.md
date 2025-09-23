# Student Management Month/Week Filtering Implementation Plan

## 🎯 **GOAL**
Add month/week filtering to Student Management table using the existing `weekly_schedule` view, similar to Teachers Overview.

## 📊 **CURRENT STATE**
- **Student Management**: Uses `student_lessons` table (only completed lessons)
- **Teachers Overview**: Uses `lesson_statistics` view (all lesson states)
- **Problem**: Data inconsistency when teacher reports are deleted

## 🔧 **SOLUTION: Use `weekly_schedule` View**

### **Why This Approach**
1. ✅ **Consistent Data Source**: Same as Teachers Overview (`student_schedules` based)
2. ✅ **Automatic Updates**: View updates when `student_schedules` changes
3. ✅ **Correct Counting**: Only counts `completed` and `absent` lessons (same as Teachers Overview)
4. ✅ **Efficient**: Pre-joined data with student/teacher names
5. ✅ **Existing Infrastructure**: View already exists and works

### **Database View Structure**
```sql
CREATE VIEW weekly_schedule AS
SELECT 
    ss.id,
    ss.student_id,
    s.name as student_name,
    ss.teacher_id,
    t.name as teacher_name,
    ss.day_of_week,
    ss.time_slot,
    ss.week_start_date,
    ss.attendance_status,
    ss.lesson_type,
    ss.is_active
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true;
```

## 🚀 **IMPLEMENTATION PLAN**

### **Phase 1: Backend API Changes**

#### **1.1 New API Endpoint**
```javascript
// functions/students.js
async function getStudentMonthlyLessons(event, user) {
  const { month, year } = event.queryStringParameters || {}
  
  const queryText = `
    SELECT 
      ws.student_id,
      ws.student_name,
      ws.week_start_date,
      COUNT(CASE WHEN ws.attendance_status = 'completed' THEN 1 END) as completed_lessons,
      COUNT(CASE WHEN ws.attendance_status = 'absent' THEN 1 END) as absent_lessons,
      COUNT(CASE WHEN ws.attendance_status IN ('completed', 'absent') THEN 1 END) as total_lessons
    FROM weekly_schedule ws
    WHERE EXTRACT(YEAR FROM ws.week_start_date) = $1 
      AND EXTRACT(MONTH FROM ws.week_start_date) = $2
      AND ws.attendance_status IN ('completed', 'absent')
    GROUP BY ws.student_id, ws.student_name, ws.week_start_date
    ORDER BY ws.student_id, ws.week_start_date
  `
  
  const result = await query(queryText, [parseInt(year), parseInt(month)])
  return successResponse({ 
    monthlyLessons: result.rows,
    month: parseInt(month),
    year: parseInt(year)
  })
}
```

#### **1.2 Route Handler**
```javascript
// Add to functions/students.js exports
if (event.path === '/api/students/monthly-lessons' && event.httpMethod === 'GET') {
  return await getStudentMonthlyLessons(event, user)
}
```

### **Phase 2: Frontend API Service**

#### **2.1 New API Method**
```javascript
// src/utils/api.js
async getStudentMonthlyLessons(month, year) {
  const params = new URLSearchParams({ month, year }).toString()
  const url = `/students/monthly-lessons?${params}`
  
  return this.fetchWithCache(url, { method: 'GET' }, { 
    resource: 'students', 
    cacheKey: `monthly-lessons-${year}-${month}` 
  })
}
```

### **Phase 3: Frontend Component Changes**

#### **3.1 New State Variables**
```javascript
// src/components/admin/StudentManagement.jsx
const [currentMonth, setCurrentMonth] = useState(new Date())
const [selectedWeek, setSelectedWeek] = useState(null)
const [weeksInMonth, setWeeksInMonth] = useState([])
const [showWeekDropdown, setShowWeekDropdown] = useState(false)
const [monthlyLessons, setMonthlyLessons] = useState({})
const [filtering, setFiltering] = useState(false)
```

#### **3.2 Helper Functions**
```javascript
// Generate weeks for current month (same as TeachersTable)
const generateWeeksInMonth = (month) => {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  
  const weeks = []
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)
  
  // Find first Monday of the month
  let currentWeekStart = new Date(firstDay)
  const dayOfWeek = firstDay.getDay()
  const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7
  currentWeekStart.setDate(firstDay.getDate() + daysToMonday)
  
  let weekNumber = 1
  while (currentWeekStart <= lastDay) {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setDate(currentWeekStart.getDate() + 6)
    
    weeks.push({
      weekNumber,
      start: new Date(currentWeekStart),
      end: new Date(weekEnd)
    })
    
    currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    weekNumber++
  }
  
  return weeks
}

// Month navigation functions
const previousMonth = () => {
  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))
}

const nextMonth = () => {
  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))
}
```

#### **3.3 Month/Week Navigation UI**
```jsx
{/* Month Navigation */}
<div className="flex items-center justify-between mb-4">
  <button onClick={previousMonth} className="px-3 py-1 bg-gray-200 rounded">← Previous</button>
  <h3 className="text-lg font-semibold">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
  <button onClick={nextMonth} className="px-3 py-1 bg-gray-200 rounded">Next →</button>
</div>

{/* Week Dropdown */}
<div className="mb-4">
  <button 
    onClick={() => setShowWeekDropdown(!showWeekDropdown)}
    className="px-3 py-1 bg-blue-500 text-white rounded"
  >
    {selectedWeek ? `Week ${selectedWeek.weekNumber}` : 'All Weeks'}
  </button>
  {showWeekDropdown && (
    <div className="absolute mt-1 bg-white border rounded shadow-lg z-10">
      <button 
        onClick={() => {
          setSelectedWeek(null)
          setShowWeekDropdown(false)
        }}
        className="block w-full text-left px-3 py-1 hover:bg-gray-100"
      >
        All Weeks
      </button>
      {weeksInMonth.map(week => (
        <button 
          key={week.weekNumber} 
          onClick={() => {
            setSelectedWeek(week)
            setShowWeekDropdown(false)
          }}
          className="block w-full text-left px-3 py-1 hover:bg-gray-100"
        >
          Week {week.weekNumber}: {week.start.toLocaleDateString()} - {week.end.toLocaleDateString()}
        </button>
      ))}
    </div>
  )}
</div>
```

#### **3.4 Data Fetching**
```javascript
useEffect(() => {
  const weeks = generateWeeksInMonth(currentMonth)
  setWeeksInMonth(weeks)
  setSelectedWeek(null)
  
  const fetchMonthlyLessons = async () => {
    try {
      setFiltering(true)
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()
      
      console.log('🔍 [STUDENT_MANAGEMENT] Fetching monthly lessons for:', year, month)
      
      const response = await apiService.getStudentMonthlyLessons(month, year)
      if (response.success) {
        // Group lessons by student and week
        const groupedLessons = {}
        response.monthlyLessons.forEach(lesson => {
          const studentId = lesson.student_id
          const weekStart = lesson.week_start_date
          
          if (!groupedLessons[studentId]) {
            groupedLessons[studentId] = {}
          }
          
          groupedLessons[studentId][weekStart] = {
            completed_lessons: Number(lesson.completed_lessons),
            absent_lessons: Number(lesson.absent_lessons),
            total_lessons: Number(lesson.total_lessons)
          }
        })
        
        setMonthlyLessons(groupedLessons)
        console.log('🔍 [STUDENT_MANAGEMENT] Monthly lessons loaded:', groupedLessons)
      }
    } catch (error) {
      console.error('Error fetching monthly lessons:', error)
    } finally {
      setFiltering(false)
    }
  }
  
  fetchMonthlyLessons()
}, [currentMonth])
```

#### **3.5 Lesson Count Calculation**
```javascript
const getLessonCount = (studentId) => {
  // If a specific week is selected, return week-specific data
  if (selectedWeek) {
    const studentLessons = monthlyLessons[studentId]
    if (!studentLessons) {
      console.log(`🔍 [GET_LESSON_COUNT] No monthly lessons for student ${studentId}`)
      return 0
    }
    
    const selectedWeekStart = selectedWeek.start.toISOString().split('T')[0]
    console.log(`🔍 [GET_LESSON_COUNT] Looking for week ${selectedWeekStart} in student ${studentId} lessons:`, studentLessons)
    
    // Find matching week in monthly lessons
    for (const [weekDate, weekData] of Object.entries(studentLessons)) {
      // Convert backend date to match frontend format
      const backendDate = new Date(weekDate).toISOString().split('T')[0]
      if (backendDate === selectedWeekStart) {
        console.log(`🔍 [GET_LESSON_COUNT] Found matching week ${weekDate} (${backendDate}):`, weekData)
        return weekData.total_lessons || 0
      }
    }
    console.log(`🔍 [GET_LESSON_COUNT] No matching week found for ${selectedWeekStart}`)
    return 0
  }
  
  // If no week selected, return total for the current month
  const studentLessons = monthlyLessons[studentId]
  if (!studentLessons) return 0
  
  let totalLessons = 0
  Object.values(studentLessons).forEach(weekData => {
    totalLessons += weekData.total_lessons || 0
  })
  
  return totalLessons
}
```

## 📋 **IMPLEMENTATION STEPS**

### **Step 1: Backend API (15 minutes)**
1. Add `getStudentMonthlyLessons` function to `functions/students.js`
2. Add route handler for `/api/students/monthly-lessons`
3. Test API endpoint

### **Step 2: Frontend API Service (5 minutes)**
1. Add `getStudentMonthlyLessons` method to `src/utils/api.js`
2. Test API integration

### **Step 3: Frontend Component (30 minutes)**
1. Add new state variables to `StudentManagement.jsx`
2. Add month/week navigation UI
3. Add data fetching logic
4. Update lesson count calculation
5. Test filtering functionality

### **Step 4: Testing (10 minutes)**
1. Test month navigation
2. Test week filtering
3. Test lesson count accuracy
4. Verify data consistency with Teachers Overview

## ✅ **EXPECTED RESULTS**

### **Data Consistency**
- ✅ Student lesson counts match Teachers Overview
- ✅ Deleting teacher reports updates both tables correctly
- ✅ All lesson states (completed, absent) counted properly

### **User Experience**
- ✅ Month navigation arrows (← Previous, Next →)
- ✅ Week dropdown for current month
- ✅ "All Weeks" option to show monthly totals
- ✅ Same interface as Teachers Overview

### **Performance**
- ✅ Efficient queries using existing view
- ✅ Cached API responses
- ✅ No redundant database calls

## 🔄 **MIGRATION STRATEGY**

### **Phase 1: Add New Functionality**
- Keep existing `student_lessons` query as fallback
- Add new `weekly_schedule` based filtering
- Test both approaches side by side

### **Phase 2: Switch to New System**
- Replace lesson count calculation with new logic
- Remove old `student_lessons` dependency
- Verify data consistency

### **Phase 3: Cleanup**
- Remove unused code
- Update documentation
- Performance optimization

## 📊 **COMPARISON: Old vs New**

| Aspect | Old System | New System |
|--------|------------|------------|
| **Data Source** | `student_lessons` | `weekly_schedule` view |
| **Lesson States** | Only completed | Only completed + absent |
| **Data Consistency** | ❌ Inconsistent | ✅ Consistent with Teachers Overview |
| **Updates on Delete** | ❌ Broken | ✅ Works correctly |
| **Filtering** | ❌ None | ✅ Month/Week filtering |
| **Performance** | ⚠️ Direct table query | ✅ Optimized view |

---

**Created**: 2025-01-23  
**Status**: Ready for Implementation  
**Priority**: High  
**Estimated Time**: 1 hour total
