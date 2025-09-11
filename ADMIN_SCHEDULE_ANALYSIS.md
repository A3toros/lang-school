# Admin Schedule Display Analysis

## Overview
This document analyzes how the admin schedule displays week navigation, month headers, and date information, then outlines how to implement the same functionality for the teacher dashboard.

## Admin Schedule Features Analysis

### 1. Week Navigation System
**Location**: `src/components/admin/ScheduleTable.jsx` (lines 624-653)

#### Navigation Functions:
```javascript
const handlePreviousWeek = async () => {
  if (onWeekChange && weekStart && !isTransitioning) {
    setIsTransitioning(true)
    const previousWeek = subtractDays(weekStart, 7)
    onWeekChange(previousWeek)
    setTimeout(() => setIsTransitioning(false), 300)
  }
}

const handleNextWeek = async () => {
  if (onWeekChange && weekStart && !isTransitioning) {
    setIsTransitioning(true)
    const nextWeek = addDays(weekStart, 7)
    onWeekChange(nextWeek)
    setTimeout(() => setIsTransitioning(false), 300)
  }
}

const handleCurrentWeek = async () => {
  if (onWeekChange && !isTransitioning) {
    setIsTransitioning(true)
    const today = new Date()
    const currentWeekStart = today.toISOString().split('T')[0]
    onWeekChange(currentWeekStart)
    setTimeout(() => setIsTransitioning(false), 300)
  }
}
```

#### Navigation UI (lines 696-765):
- **Previous Week Button**: Left arrow with hover/tap animations
- **Current Week Button**: Shows week number (e.g., "Week 1", "Week 2") with current week highlighting
- **Next Week Button**: Right arrow with hover/tap animations
- **Transition States**: Prevents multiple clicks during transitions

### 2. Month and Date Display System
**Location**: `src/components/admin/ScheduleTable.jsx` (lines 352-377)

#### Date Calculation Logic:
```javascript
// Get week dates and month information
const weekDates = weekStart ? getWeekDates(weekStart) : []
const currentMonth = getCurrentMonth()

// Determine the target month and year for week numbering
const monthCounts = {}
weekDates.forEach(date => {
  const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
  monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
})

const targetMonthKey = Object.keys(monthCounts).reduce((a, b) => 
  monthCounts[a] > monthCounts[b] ? a : b, Object.keys(monthCounts)[0]
)

const [targetYear, targetMonth] = targetMonthKey ? targetMonthKey.split('-').map(Number) : [currentMonth.year, currentMonth.month]

// Get week information with complex month boundary logic
const weekInfo = weekStart ? getWeekInfoForMonth(weekStart, targetMonth, targetYear) : null
const navigationInfo = weekStart ? getWeekNavigationInfo(weekStart, targetMonth, targetYear) : null

// Get the month name for the week
const weekMonth = weekDates.length > 0 ? 
  weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
  currentMonth.name + ' ' + currentMonth.year
```

### 3. Table Header Structure
**Location**: `src/components/admin/ScheduleTable.jsx` (lines 807-861)

#### Two-Row Header System:

**Row 1 - Month Header** (lines 808-822):
```jsx
<tr>
  <th className="px-4 py-2 text-left text-sm font-semibold text-neutral-800 w-24"></th>
  <th colSpan="7" className="px-4 py-2 text-center text-lg font-bold text-neutral-800">
    <motion.span
      key={weekMonth}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {weekMonth}  // e.g., "September 2025"
    </motion.span>
  </th>
</tr>
```

**Row 2 - Day Names and Dates** (lines 823-861):
```jsx
<tr>
  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 w-24">Time</th>
  {days.map((day, index) => {
    const dayInfo = weekInfo?.days?.[index]
    const isCurrentMonth = dayInfo?.isCurrentMonth ?? true
    const isEditable = dayInfo?.isEditable ?? true
    
    return (
      <motion.th key={`${day}-${weekStart}`}>
        <div className="flex flex-col">
          <div className={`font-semibold ${!isCurrentMonth ? 'opacity-50' : ''}`}>
            {day}  // e.g., "Monday"
          </div>
          {weekDates.length > index && (
            <motion.div className={`text-xs mt-1 ${isCurrentMonth ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {formatDate(weekDates[index], 'short')}  // e.g., "Sep 8"
            </motion.div>
          )}
        </div>
      </motion.th>
    )
  })}
</tr>
```

### 4. Animation System
**Location**: `src/components/admin/ScheduleTable.jsx` (lines 605-622)

#### Animation Variants:
```javascript
const tableVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const weekTransitionVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
}

const dayVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 }
}
```

### 5. Required Imports
```javascript
import { getWeekDates, formatDate, getCurrentMonth, addDays, subtractDays, getWeekInfoForMonth, getWeekNavigationInfo } from '../../utils/dateUtils'
```

## Implementation Plan for Teacher Dashboard

### Phase 1: Add Required Imports
- Import all necessary date utility functions
- Import motion components for animations

### Phase 2: Add State Management
- Add `isTransitioning` state for navigation
- Add week navigation functions

### Phase 3: Add Date Calculation Logic
- Implement month detection logic
- Add week info calculation
- Add navigation info calculation

### Phase 4: Update Table Header
- Add month header row
- Update day header row with dates
- Add proper styling and animations

### Phase 5: Add Week Navigation UI
- Add previous/next week buttons
- Add current week button with week number
- Add transition animations

### Phase 6: Update Table Structure
- Wrap table in AnimatePresence
- Add proper key for week transitions
- Update table variants

## Key Differences from Current Teacher Implementation

1. **No Week Navigation**: Teacher currently has no week navigation buttons
2. **No Month Header**: Teacher table only shows day names, no month/year
3. **No Date Display**: Teacher table doesn't show actual dates under day names
4. **No Week Numbering**: Teacher doesn't show "Week 1", "Week 2", etc.
5. **No Month Boundary Logic**: Teacher doesn't handle weeks spanning multiple months
6. **No Transition Animations**: Teacher has no smooth transitions between weeks

## Expected Result
After implementation, the teacher dashboard will have:
- Week navigation buttons (Previous, Current Week, Next)
- Month and year header above the table
- Actual dates displayed under day names
- Week numbering (Week 1, Week 2, etc.)
- Smooth transitions between weeks
- Proper month boundary handling
- Same visual consistency as admin dashboard
