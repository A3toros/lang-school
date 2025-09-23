# Teacher Cabinet Month/Week Filtering System

## Overview
The Teacher Cabinet (TeacherPage.jsx) allows filtering lesson statistics by month and week for the current teacher only. This system reuses the existing admin infrastructure but filters results by the current teacher's ID.

## Architecture

### Backend Components

#### 1. Reuse Existing API Endpoint: `/api/teachers/monthly-stats`
**File**: `functions/teachers.js`

The existing `getMonthlyLessonStats` function works perfectly for admin. We'll create a new endpoint that reuses this function and filters by teacher ID.

```javascript
// New function: getTeacherMonthlyStats
async function getTeacherMonthlyStats(event, user) {
  try {
    const { month, year } = event.queryStringParameters || {}
    const teacherId = event.path.match(/\/api\/teachers\/(\d+)\/monthly-stats/)?.[1]
    
    if (!teacherId || !month || !year) {
      return errorResponse(400, 'Teacher ID, month and year parameters are required')
    }

    console.log(`🔍 [GET_TEACHER_MONTHLY_STATS] Fetching stats for teacher ${teacherId}, ${year}-${month}`)

    // Reuse the existing getMonthlyLessonStats function
    const allStatsResponse = await getMonthlyLessonStats(event, user)
    
    if (!allStatsResponse.success) {
      return allStatsResponse
    }

    // Filter results by teacher ID
    const teacherStats = allStatsResponse.monthlyStats.filter(stat => 
      stat.teacher_id === parseInt(teacherId)
    )

    console.log(`🔍 [GET_TEACHER_MONTHLY_STATS] Filtered ${teacherStats.length} records for teacher ${teacherId}`)
    
    return successResponse({ 
      monthlyStats: teacherStats,
      teacherId: parseInt(teacherId),
      month: parseInt(month),
      year: parseInt(year)
    })
  } catch (error) {
    console.error('Get teacher monthly stats error:', error)
    return errorResponse(500, 'Failed to fetch teacher monthly statistics')
  }
}
```

**Route Handler**:
```javascript
} else if (path.match(/^\/api\/teachers\/\d+\/monthly-stats$/) && method === 'GET') {
  return await getTeacherMonthlyStats(event, user)
```

**Purpose**: Reuses the working admin function and filters by teacher ID.

### Frontend Components

#### 1. API Service Method
**File**: `src/utils/api.js`

```javascript
async getTeacherMonthlyStats(teacherId, month, year) {
  apiDebugger.info('TEACHERS', 'Fetching teacher monthly stats', { teacherId, month, year })
  
  try {
    const params = new URLSearchParams({ month, year }).toString()
    const url = `/teachers/${teacherId}/monthly-stats?${params}`
    
    const result = await this.fetchWithCache(url, { method: 'GET' }, { 
      resource: 'teachers', 
      cacheKey: `teacher-monthly-stats-${teacherId}-${year}-${month}` 
    })
    
    if (result.success) {
      apiDebugger.success('TEACHERS', 'Teacher monthly stats fetched', { 
        teacherId,
        count: result.monthlyStats?.length || 0,
        month: result.month,
        year: result.year
      })
    } else {
      apiDebugger.warning('TEACHERS', 'Failed to fetch teacher monthly stats', { error: result.error })
    }
    
    return result
  } catch (error) {
    apiDebugger.error('TEACHERS', 'Error fetching teacher monthly stats', { error: error.message })
    throw error
  }
}
```

**Purpose**: Cached API call to fetch monthly lesson statistics for a specific teacher.

#### 2. Main Component: `TeacherPage.jsx`

##### State Management
```javascript
// Month/Week filtering state
const [currentMonth, setCurrentMonth] = useState(new Date())
const [selectedWeek, setSelectedWeek] = useState(null)
const [weeksInMonth, setWeeksInMonth] = useState([])
const [showWeekDropdown, setShowWeekDropdown] = useState(false)
const [monthlyStats, setMonthlyStats] = useState({})
const [filtering, setFiltering] = useState(false)
```

##### Week Generation (Same as Teachers Overview)
```javascript
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
      end: new Date(weekEnd),
      label: `Week ${weekNumber}: ${currentWeekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
    })
    
    currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    weekNumber++
  }
  
  return weeks
}
```

##### Month Navigation Functions
```javascript
const previousMonth = () => {
  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))
}

const nextMonth = () => {
  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))
}
```

##### Data Fetching
```javascript
// Fetch monthly stats when month changes
useEffect(() => {
  if (!user?.teacherId) return
  
  const weeks = generateWeeksInMonth(currentMonth)
  setWeeksInMonth(weeks)
  setSelectedWeek(null)
  
  const fetchMonthlyStats = async () => {
    try {
      setFiltering(true)
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()
      
      console.log('🔍 [TEACHER_PAGE] Fetching monthly stats for teacher:', user.teacherId, year, month)
      
      const response = await apiService.getTeacherMonthlyStats(user.teacherId, month, year)
      if (response.success) {
        // Group stats by week_start_date (simpler than admin since only one teacher)
        const groupedStats = {}
        response.monthlyStats.forEach(stat => {
          groupedStats[stat.week_start_date] = {
            completed_lessons: Number(stat.completed_lessons),
            absent_lessons: Number(stat.absent_lessons),
            total_lessons: Number(stat.total_lessons)
          }
        })
        
        setMonthlyStats(groupedStats)
        console.log('🔍 [TEACHER_PAGE] Monthly stats loaded:', groupedStats)
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error)
    } finally {
      setFiltering(false)
    }
  }
  
  fetchMonthlyStats()
}, [currentMonth, user?.teacherId])
```

##### Lesson Count Calculation
```javascript
const getLessonCount = () => {
  if (selectedWeek) {
    // If a specific week is selected, return week-specific data
    const selectedWeekStart = selectedWeek.start.toISOString().split('T')[0]
    
    for (const [weekDate, weekData] of Object.entries(monthlyStats)) {
      // Convert backend date to match frontend format
      const backendDate = new Date(weekDate).toISOString().split('T')[0]
      if (backendDate === selectedWeekStart) {
        console.log(`🔍 [GET_LESSON_COUNT] Found matching week ${weekDate} (${backendDate}):`, weekData)
        return weekData.total_lessons || 0
      }
    }
    return 0
  }
  
  // If no week selected, return total for the current month
  let totalLessons = 0
  Object.values(monthlyStats).forEach(weekData => {
    totalLessons += weekData.total_lessons || 0
  })
  
  return totalLessons
}
```

## Data Flow

### 1. Initial Load
1. **Component mounts** → `TeacherPage.jsx`
2. **Generate weeks** for current month using `generateWeeksInMonth()`
3. **Fetch monthly stats** via `apiService.getTeacherMonthlyStats(teacherId, month, year)`
4. **Backend calls** existing `getMonthlyLessonStats()` and filters by teacher ID
5. **Group data** by week in frontend (simpler than admin since only one teacher)
6. **Display lesson count** for the month

### 2. Month Navigation
1. **User clicks** month arrow (← or →)
2. **Update** `currentMonth` state
3. **Trigger** `useEffect` with new month
4. **Regenerate weeks** for new month
5. **Fetch new monthly stats** for new month and current teacher
6. **Reset** `selectedWeek` to null
7. **Update display** with new month's data

### 3. Week Selection
1. **User clicks** week dropdown
2. **Show** available weeks for current month
3. **User selects** specific week
4. **Update** `selectedWeek` state
5. **Trigger re-render** of lesson count
6. **`getLessonCount()`** filters by selected week
7. **Display** week-specific lesson count

## UI Components

### Month/Week Navigation Section
```jsx
{/* Month/Week Navigation */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3 }}
  className="bg-white rounded-lg shadow p-6 mb-8"
>
  <div className="mb-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Lesson Statistics</h3>
    
    {/* Month Navigation and Week Selector - Left aligned */}
    <div className="flex items-center justify-start space-x-4">
      {/* Month Navigation */}
      <div className="flex items-center space-x-2">
        <button
          onClick={previousMonth}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold text-gray-800">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={nextMonth}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
        >
          →
        </button>
      </div>
      
      {/* Week Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowWeekDropdown(!showWeekDropdown)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {selectedWeek ? selectedWeek.label : 'All Weeks'}
        </button>
        
        {showWeekDropdown && (
          <div className="absolute mt-1 bg-white border rounded shadow-lg z-10 min-w-64 right-0">
            <button
              onClick={() => {
                setSelectedWeek(null)
                setShowWeekDropdown(false)
              }}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
            >
              All Weeks
            </button>
            {weeksInMonth.map((week, index) => (
              <button
                key={index}
                onClick={() => {
                  console.log('🔍 [WEEK_SELECT] Selected week:', week)
                  setSelectedWeek(week)
                  setShowWeekDropdown(false)
                }}
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
              >
                {week.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    
    {/* Week info display */}
    {selectedWeek && (
      <p className="text-sm text-gray-600 mt-2">
        Showing lessons for week: {selectedWeek.label}
        {filtering && <span className="ml-2 text-blue-600">(Loading...)</span>}
      </p>
    )}
    
    {/* Lesson Count Display */}
    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
      <div className="flex items-center">
        <div className="p-2 bg-blue-100 rounded-lg">
          <div className="w-6 h-6 text-blue-600">📚</div>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">Total Lessons</p>
          <p className="text-2xl font-semibold text-gray-900">{getLessonCount()}</p>
        </div>
      </div>
    </div>
  </div>
</motion.div>
```

## Key Differences from Admin

### 1. Data Structure
- **Admin**: Groups by `teacherId` then `weekStart` (2-level object)
- **Teacher**: Groups by `weekStart` only (1-level object since only one teacher)

### 2. API Calls
- **Admin**: Calls `/api/teachers/monthly-stats` for all teachers
- **Teacher**: Calls `/api/teachers/{teacherId}/monthly-stats` for specific teacher

### 3. Lesson Count Function
- **Admin**: `getLessonCount(teacherId)` - needs teacher ID parameter
- **Teacher**: `getLessonCount()` - no parameter needed (always current teacher)

### 4. Data Grouping
- **Admin**: Complex grouping by teacher and week
- **Teacher**: Simple grouping by week only

## Implementation Steps

1. **Add backend function** `getTeacherMonthlyStats` that reuses `getMonthlyLessonStats`
2. **Add route handler** for `/api/teachers/{teacherId}/monthly-stats`
3. **Add API service method** `getTeacherMonthlyStats(teacherId, month, year)`
4. **Add state variables** to `TeacherPage.jsx`
5. **Add helper functions** (week generation, month navigation, lesson count)
6. **Add useEffect** for data fetching
7. **Add UI components** for month/week navigation
8. **Test functionality** with different months and weeks

## Benefits

- ✅ **Reuses working admin code** - No new database queries needed
- ✅ **Consistent with admin** - Same UI patterns and behavior
- ✅ **Efficient** - Single API call per month, cached responses
- ✅ **Simple** - Less complex than admin since only one teacher
- ✅ **Maintainable** - Changes to admin automatically benefit teacher

## Error Handling

### Backend
- **Parameter validation**: Check for required `teacherId`, `month`, and `year`
- **Teacher validation**: Ensure teacher exists and user has access
- **Reuse admin error handling**: Inherits all error handling from `getMonthlyLessonStats`

### Frontend
- **API errors**: Try-catch around API calls
- **Data validation**: Check for successful responses
- **Fallback values**: Default to 0 for missing data
- **Loading states**: Show filtering indicator during requests

## Debugging

### Console Logs
- **Teacher stats fetch**: `🔍 [TEACHER_PAGE] Fetching monthly stats for teacher:`
- **Monthly stats loaded**: `🔍 [TEACHER_PAGE] Monthly stats loaded:`
- **Week selection**: `🔍 [WEEK_SELECT] Selected week:`
- **Lesson count lookup**: `🔍 [GET_LESSON_COUNT] Found matching week:`

### Common Issues
1. **Teacher ID mismatch**: Ensure `user.teacherId` is correct
2. **Date format mismatch**: Same as admin (frontend vs backend dates)
3. **Data grouping**: Simpler than admin (no teacher grouping needed)
4. **API endpoint**: Ensure route handler is correct

## Future Enhancements

### Potential Improvements
1. **Export functionality**: Download teacher's lesson data
2. **Performance**: Add loading skeletons
3. **Real-time updates**: WebSocket for live data
4. **Advanced filtering**: Filter by lesson type, student, etc.

### Database Optimizations
1. **Teacher-specific indexes**: Add indexes on `teacher_id` and `week_start_date`
2. **Caching**: Teacher-specific cache keys
3. **Materialized views**: For better performance with large datasets
