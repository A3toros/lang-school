# Timezone Issue Analysis

## Problem
- **Today**: September 22nd
- **Backend returns**: `2025-09-21T17:00:00.000Z` (September 21st)
- **Expected**: `2025-09-22T17:00:00.000Z` (September 22nd)
- **Server timezone**: Singapore (+1 hour from local timezone)

## Root Cause Analysis

### 1. Frontend Date Calculation
- `getCurrentWeekStart()` in `src/utils/dateUtils.js` line 58:
  ```javascript
  const result = monday.toISOString().split('T')[0]
  ```
- This converts local date to UTC, causing timezone shift

### 2. Where +1 is Added
Need to find where the timestamp gets the +1 day adjustment.

### 3. Proposed Fix
Instead of changing the core `getCurrentWeekStart()` function, we should:

**Option A**: Fix the specific issue in the API call
- Modify how `weekStart` is passed to the backend
- Ensure it's sent as a proper date string without timezone conversion

**Option B**: Fix the backend to handle timezone properly
- Modify the database function to use consistent timezone
- Or modify the API to convert dates properly

**Option C**: Fix the frontend date handling
- Use safe date formatting in specific places where timezone matters
- Keep the core function unchanged

## Investigation Results

### Where +1 is Added
Found multiple places where dates are manipulated:

1. **Frontend date calculations** (adding days to week start):
   - `src/components/admin/ScheduleTable.jsx:468`: `lessonDate.setDate(weekStart.getDate() + schedule.day_of_week)`
   - `src/pages/TeacherPage.jsx:269`: `lessonDate.setDate(lessonDate.getDate() + scheduleItem.day_of_week)`
   - `src/utils/dateUtils.js:79`: `end.setDate(start.getDate() + 6)` (for week end)

2. **Backend timestamp conversions**:
   - `functions/utils/database.js:147`: `return monday.toISOString().split('T')[0]`
   - `functions/schedules.js:229`: `week_end: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]`

### The Real Issue
The problem is NOT a +1 being added. The issue is:

1. **Frontend sends**: `2025-09-22` (correct local date)
2. **Backend receives**: `2025-09-22` 
3. **Backend stores/returns**: `2025-09-21T17:00:00.000Z` (converted to UTC timestamp)

The backend is converting the date string to a JavaScript Date object, which gets timezone-shifted when returned as JSON.

### Proposed Fixes

**Option A**: Fix backend to return dates as strings
- Modify SQL queries to use `::text` casting
- This would return `"2025-09-22"` instead of `"2025-09-21T17:00:00.000Z"`

**Option B**: Fix frontend to handle timestamps properly
- Keep backend as-is
- Ensure frontend always uses safe date formatting when processing timestamps

**Option C**: Fix the specific API endpoint
- Only modify the teacher schedule endpoint to return dates as strings
- Leave other endpoints unchanged

## Recommendation
**Option A** is the cleanest - modify the backend to return dates as strings in the schedule queries. This prevents timezone conversion issues entirely.

## Current Status
- User rejected changes to `src/utils/dateUtils.js`
- Need to implement backend fix to return dates as strings
