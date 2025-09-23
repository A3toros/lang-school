# Teachers Overview Month/Week Filtering System

## Overview
The Teachers Overview table in the admin dashboard allows filtering lesson statistics by month and week. This system uses a backend view (`lesson_statistics`) to pre-aggregate data and provides efficient frontend filtering.

## Architecture

### Backend Components

#### 1. Database View: `lesson_statistics`
```sql
CREATE VIEW lesson_statistics AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    ss.week_start_date,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.week_start_date >= get_current_week_start()
GROUP BY ss.teacher_id, t.name, ss.week_start_date;
```

**Purpose**: Pre-aggregates lesson statistics by teacher and week for efficient querying.

#### 2. API Endpoint: `/api/teachers/monthly-stats`
**File**: `functions/teachers.js`

```javascript
async function getMonthlyLessonStats(event, user) {
  const { month, year } = event.queryStringParameters || {}
  
  const queryText = `
    SELECT 
      ls.teacher_id,
      t.name as teacher_name,
      ls.week_start_date,
      SUM(ls.completed_lessons) as completed_lessons,
      SUM(ls.absent_lessons) as absent_lessons
    FROM lesson_statistics ls
    JOIN teachers t ON ls.teacher_id = t.id
    WHERE EXTRACT(YEAR FROM ls.week_start_date) = $1 
      AND EXTRACT(MONTH FROM ls.week_start_date) = $2
    GROUP BY ls.teacher_id, t.name, ls.week_start_date
    ORDER BY ls.teacher_id, ls.week_start_date
  `
  
  const result = await query(queryText, [parseInt(year), parseInt(month)])
  return successResponse({ 
    monthlyStats: result.rows,
    month: parseInt(month),
    year: parseInt(year)
  })
}
```

**Purpose**: Fetches all lesson statistics for a specific month, grouped by teacher and week.

### Frontend Components

#### 1. API Service Method
**File**: `src/utils/api.js`

```javascript
async getMonthlyLessonStats(month, year) {
  const params = new URLSearchParams({ month, year }).toString()
  const url = `/teachers/monthly-stats?${params}`
  
  return this.fetchWithCache(url, { method: 'GET' }, { 
    resource: 'teachers', 
    cacheKey: `monthly-stats-${year}-${month}` 
  })
}
```

**Purpose**: Cached API call to fetch monthly lesson statistics.

#### 2. Main Component: `TeachersTable.jsx`

##### State Management
```javascript
const [currentMonth, setCurrentMonth] = useState(new Date())
const [selectedWeek, setSelectedWeek] = useState(null)
const [weeksInMonth, setWeeksInMonth] = useState([])
const [showWeekDropdown, setShowWeekDropdown] = useState(false)
const [monthlyStats, setMonthlyStats] = useState({})
```

##### Week Generation
```javascript
const generateWeeksInMonth = (month) => {
  const weeks = []
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  
  // Find first Monday of the month
  const firstMonday = new Date(firstDay)
  const dayOfWeek = firstDay.getDay()
  const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  firstMonday.setDate(firstDay.getDate() + daysToMonday)
  
  // Generate weeks
  let currentWeek = new Date(firstMonday)
  while (currentWeek <= lastDay) {
    const weekEnd = new Date(currentWeek)
    weekEnd.setDate(currentWeek.getDate() + 6)
    
    weeks.push({
      start: new Date(currentWeek),
      end: new Date(weekEnd),
      label: `${currentWeek.getDate()}-${weekEnd.getDate()} ${month.toLocaleString('default', { month: 'short' })}`
    })
    
    currentWeek.setDate(currentWeek.getDate() + 7)
  }
  
  return weeks
}
```

##### Data Fetching
```javascript
useEffect(() => {
  const weeks = generateWeeksInMonth(currentMonth)
  setWeeksInMonth(weeks)
  setSelectedWeek(null) // Reset selected week when month changes
  
  const fetchMonthlyStats = async () => {
    try {
      setFiltering(true)
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()
      
      const response = await apiService.getMonthlyLessonStats(month, year)
      if (response.success) {
        // Group stats by teacher and week
        const groupedStats = {}
        response.monthlyStats.forEach(stat => {
          const teacherId = stat.teacher_id
          const weekStart = stat.week_start_date
          
          if (!groupedStats[teacherId]) {
            groupedStats[teacherId] = {}
          }
          
          groupedStats[teacherId][weekStart] = {
            completed_lessons: Number(stat.completed_lessons),
            absent_lessons: Number(stat.absent_lessons),
            total_lessons: Number(stat.completed_lessons) + Number(stat.absent_lessons)
          }
        })
        
        setMonthlyStats(groupedStats)
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error)
    } finally {
      setFiltering(false)
    }
  }
  
  fetchMonthlyStats()
}, [currentMonth])
```

##### Lesson Count Calculation
```javascript
const getLessonCount = (teacherId) => {
  // If a specific week is selected, return week-specific data
  if (selectedWeek) {
    const teacherStats = monthlyStats[teacherId]
    if (!teacherStats) return 0
    
    const selectedWeekStart = selectedWeek.start.toISOString().split('T')[0]
    
    // Find matching week in monthly stats
    for (const [weekDate, weekData] of Object.entries(teacherStats)) {
      const backendDate = new Date(weekDate).toISOString().split('T')[0]
      if (backendDate === selectedWeekStart) {
        return weekData.total_lessons || 0
      }
    }
    return 0
  }
  
  // If no week selected, return total for the current month
  const teacherStats = monthlyStats[teacherId]
  if (!teacherStats) return 0
  
  let totalLessons = 0
  Object.values(teacherStats).forEach(weekData => {
    totalLessons += weekData.total_lessons || 0
  })
  
  return totalLessons
}
```

## Data Flow

### 1. Initial Load
1. **Component mounts** → `TeachersTable.jsx`
2. **Generate weeks** for current month using `generateWeeksInMonth()`
3. **Fetch monthly stats** via `apiService.getMonthlyLessonStats()`
4. **Backend query** `lesson_statistics` view for the month
5. **Group data** by teacher and week in frontend
6. **Display table** with total lessons for the month

### 2. Month Navigation
1. **User clicks** month arrow (← or →)
2. **Update** `currentMonth` state
3. **Trigger** `useEffect` with new month
4. **Regenerate weeks** for new month
5. **Fetch new monthly stats** for new month
6. **Reset** `selectedWeek` to null
7. **Update display** with new month's data

### 3. Week Selection
1. **User clicks** week dropdown
2. **Show** available weeks for current month
3. **User selects** specific week
4. **Update** `selectedWeek` state
5. **Trigger re-render** of lesson counts
6. **`getLessonCount()`** filters by selected week
7. **Display** week-specific lesson counts

### 4. Week Filtering Logic
1. **Extract date** from selected week: `selectedWeek.start.toISOString().split('T')[0]`
2. **Loop through** monthly stats for the teacher
3. **Convert backend dates** to match format: `new Date(weekDate).toISOString().split('T')[0]`
4. **Match dates** and return `total_lessons` for that week
5. **If no match** found, return 0

## Key Features

### Date Handling
- **Frontend**: Uses JavaScript `Date` objects for week generation
- **Backend**: Stores dates as PostgreSQL `DATE` with timezone
- **Matching**: Converts both to `YYYY-MM-DD` format for comparison

### Caching
- **API calls** are cached using `fetchWithCache`
- **Cache key**: `monthly-stats-${year}-${month}`
- **Resource**: `teachers` namespace

### Performance
- **Pre-aggregated data** from database view
- **Single API call** per month (not per teacher)
- **Frontend filtering** for week selection
- **Cached responses** for repeated requests

## UI Components

### Month Navigation
```jsx
<div className="flex items-center space-x-2">
  <button onClick={() => navigateMonth(-1)}>←</button>
  <span>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
  <button onClick={() => navigateMonth(1)}>→</button>
</div>
```

### Week Dropdown
```jsx
<div className="relative">
  <button onClick={() => setShowWeekDropdown(!showWeekDropdown)}>
    {selectedWeek ? selectedWeek.label : 'All Weeks'}
  </button>
  {showWeekDropdown && (
    <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10">
      {weeksInMonth.map((week, index) => (
        <button
          key={index}
          onClick={() => {
            setSelectedWeek(week)
            setShowWeekDropdown(false)
          }}
        >
          {week.label}
        </button>
      ))}
    </div>
  )}
</div>
```

### Clear Filter
```jsx
{selectedWeek && (
  <button onClick={() => {
    setSelectedWeek(null)
    setShowWeekDropdown(false)
  }}>
    Clear Filter
  </button>
)}
```

## Error Handling

### Backend
- **Parameter validation**: Check for required `month` and `year`
- **Database errors**: Try-catch around query execution
- **Response format**: Consistent success/error response structure

### Frontend
- **API errors**: Try-catch around API calls
- **Data validation**: Check for successful responses
- **Fallback values**: Default to 0 for missing data
- **Loading states**: Show filtering indicator during requests

## Debugging

### Console Logs
- **Week selection**: `🔍 [WEEK_SELECT] Selected week:`
- **Lesson count lookup**: `🔍 [GET_LESSON_COUNT] Looking for week:`
- **Date matching**: `🔍 [GET_LESSON_COUNT] Found matching week:`
- **Monthly stats**: `🔍 [TEACHERS_TABLE] Monthly stats loaded:`

### Common Issues
1. **Date format mismatch**: Frontend `2025-09-21` vs Backend `2025-09-21T17:00:00.000Z`
2. **Timezone differences**: JavaScript Date vs PostgreSQL DATE
3. **Week generation**: First Monday calculation
4. **Data grouping**: Teacher ID as string vs number

## Future Enhancements

### Potential Improvements
1. **Real-time updates**: WebSocket for live data updates
2. **Advanced filtering**: Filter by teacher, lesson type, etc.
3. **Export functionality**: Download filtered data as CSV
4. **Performance**: Virtual scrolling for large datasets
5. **Caching**: Service Worker for offline support

### Database Optimizations
1. **Indexes**: Add indexes on `week_start_date` and `teacher_id`
2. **Materialized views**: For better performance with large datasets
3. **Partitioning**: Partition `student_schedules` by date ranges

## Student Management Month/Week Filtering Plan

### Overview
Implement similar month/week filtering for Student Management table using the `weekly_schedule` view, following the same pattern as Teachers Overview.

### Architecture

#### 1. Database View: `weekly_schedule`
```sql
-- Assumed existing view structure:
CREATE VIEW weekly_schedule AS
SELECT 
    ss.student_id,
    s.name as student_name,
    ss.teacher_id,
    t.name as teacher_name,
    ss.week_start_date,
    ss.day_of_week,
    ss.time_slot,
    ss.attendance_status,
    ss.attendance_date
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.week_start_date >= get_current_week_start();
```

#### 2. New API Endpoint: `/api/students/monthly-lessons`
**File**: `functions/students.js`

```javascript
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

#### 3. Frontend API Service Method
**File**: `src/utils/api.js`

```javascript
async getStudentMonthlyLessons(month, year) {
  const params = new URLSearchParams({ month, year }).toString()
  const url = `/students/monthly-lessons?${params}`
  
  return this.fetchWithCache(url, { method: 'GET' }, { 
    resource: 'students', 
    cacheKey: `monthly-lessons-${year}-${month}` 
  })
}
```

#### 4. Updated Student Management Component
**File**: `src/components/admin/StudentManagement.jsx`

##### New State Variables
```javascript
const [currentMonth, setCurrentMonth] = useState(new Date())
const [selectedWeek, setSelectedWeek] = useState(null)
const [weeksInMonth, setWeeksInMonth] = useState([])
const [showWeekDropdown, setShowWeekDropdown] = useState(false)
const [monthlyLessons, setMonthlyLessons] = useState({})
```

##### Week Generation (Reuse from Teachers Overview)
```javascript
const generateWeeksInMonth = (month) => {
  // Same implementation as Teachers Overview
  // Generate weeks for the month
}
```

##### Data Fetching
```javascript
useEffect(() => {
  const weeks = generateWeeksInMonth(currentMonth)
  setWeeksInMonth(weeks)
  setSelectedWeek(null)
  
  const fetchMonthlyLessons = async () => {
    try {
      setLoading(true)
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()
      
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
      }
    } catch (error) {
      console.error('Error fetching monthly lessons:', error)
    } finally {
      setLoading(false)
    }
  }
  
  fetchMonthlyLessons()
}, [currentMonth])
```

##### Lesson Count Calculation
```javascript
const getLessonCount = (studentId) => {
  // If a specific week is selected, return week-specific data
  if (selectedWeek) {
    const studentLessons = monthlyLessons[studentId]
    if (!studentLessons) return 0
    
    const selectedWeekStart = selectedWeek.start.toISOString().split('T')[0]
    
    // Find matching week in monthly lessons
    for (const [weekDate, weekData] of Object.entries(studentLessons)) {
      const backendDate = new Date(weekDate).toISOString().split('T')[0]
      if (backendDate === selectedWeekStart) {
        return weekData.total_lessons || 0
      }
    }
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

### Implementation Steps

1. **Create `weekly_schedule` view** (if not exists)
2. **Add new API endpoint** `/api/students/monthly-lessons`
3. **Update API service** with `getStudentMonthlyLessons` method
4. **Modify StudentManagement component**:
   - Add month/week filtering UI
   - Add state management for filtering
   - Update lesson count calculation
   - Add week generation logic
5. **Remove old `student_lessons` query** from `getStudents`
6. **Test consistency** with Teachers Overview

### Benefits

- ✅ **Consistency**: Same data source as Teachers Overview
- ✅ **Accuracy**: Updates correctly when reports are deleted
- ✅ **Performance**: Pre-aggregated data from view
- ✅ **Filtering**: Month/week filtering like Teachers Overview
- ✅ **Maintainability**: Single data source for both admin tables

### Data Flow

1. **Component loads** → Generate weeks for current month
2. **Fetch monthly lessons** → Query `weekly_schedule` view
3. **Group by student/week** → Frontend data organization
4. **Display table** → Show total lessons for month
5. **Week selection** → Filter to specific week data
6. **Month navigation** → Fetch new month's data
