# Lesson Statistics View Fix

## Problem Analysis

The issue with "all lessons are 0 in lesson overview" is caused by the `lesson_statistics` view having a restrictive date filter that only shows current/future lessons:

```sql
-- PROBLEMATIC VIEW (current)
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
WHERE ss.week_start_date >= get_current_week_start()  -- ❌ THIS IS THE PROBLEM
GROUP BY ss.teacher_id, t.name, ss.week_start_date;
```

## Root Cause

1. **Date Filter Issue**: The view only shows lessons from `get_current_week_start()` onwards
2. **Historical Data Missing**: Monthly stats need to query historical data (past months/weeks)
3. **Current Date vs Query Date**: The system is querying September 2025 data, but if the current date is different, those lessons won't appear

## Evidence from Logs

From the terminal logs, we can see:
- **Schedules exist**: Teacher 17 has 4 scheduled lessons for week 2025-09-22
- **Monthly stats query returned 9 records**: `🔍 [GET_MONTHLY_STATS] Fetched 9 records for 2025-9`
- **But UI shows 0 lessons**: The data exists but the view filter is excluding it

## Solution

### 1. Remove Date Restriction

Change the view to include all active lessons, not just current/future ones:

```sql
-- FIXED VIEW
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
WHERE ss.is_active = true  -- ✅ Only filter by active status
GROUP BY ss.teacher_id, t.name, ss.week_start_date;
```

### 2. Update Related Views

Also fix the `teacher_monthly_stats` view to be consistent:

```sql
CREATE VIEW teacher_monthly_stats AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    DATE_TRUNC('month', ss.week_start_date)::DATE as month_start,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true  -- ✅ Only filter by active status
GROUP BY ss.teacher_id, t.name, DATE_TRUNC('month', ss.week_start_date)::DATE;
```

## Implementation Steps

1. **Run the SQL script**: `fix_lesson_statistics_view.sql`
2. **Test the view**: Verify it returns data for September 2025
3. **Check the UI**: Monthly stats should now show correct lesson counts
4. **Verify performance**: Ensure the view still performs well without date filter

## Why This Fixes the Issue

### Before Fix
- View only shows lessons from current week onwards
- September 2025 lessons are filtered out (if current date is different)
- Monthly stats query returns empty results
- UI shows 0 lessons

### After Fix
- View shows all active lessons regardless of date
- September 2025 lessons are included
- Monthly stats query returns correct data
- UI shows actual lesson counts

## Performance Considerations

### Potential Impact
- **Larger dataset**: View now includes all historical data
- **Query performance**: May be slower for very large datasets
- **Memory usage**: More data loaded into memory

### Mitigation Strategies
1. **Indexes**: Ensure proper indexes on `week_start_date` and `teacher_id`
2. **Query optimization**: The monthly stats query already filters by month/year
3. **Caching**: Frontend already caches monthly stats responses
4. **Pagination**: Consider adding pagination for very large datasets

## Testing

### Test Queries
```sql
-- Test 1: Check if view returns September 2025 data
SELECT COUNT(*) FROM lesson_statistics 
WHERE EXTRACT(YEAR FROM week_start_date) = 2025 
  AND EXTRACT(MONTH FROM week_start_date) = 9;

-- Test 2: Check specific teacher's data
SELECT * FROM lesson_statistics 
WHERE teacher_id = 17 
  AND EXTRACT(YEAR FROM week_start_date) = 2025 
  AND EXTRACT(MONTH FROM week_start_date) = 9;

-- Test 3: Check monthly stats view
SELECT * FROM teacher_monthly_stats 
WHERE EXTRACT(YEAR FROM month_start) = 2025 
  AND EXTRACT(MONTH FROM month_start) = 9;
```

### Expected Results
- Test 1: Should return > 0 (showing lessons exist)
- Test 2: Should return teacher 17's September lessons
- Test 3: Should return aggregated monthly data

## Rollback Plan

If the fix causes performance issues, we can:

1. **Add date parameter**: Make the view accept a date parameter
2. **Create separate views**: One for current data, one for historical
3. **Use materialized views**: Pre-compute statistics for better performance
4. **Add date range filters**: Let the application decide date ranges

## Related Files

- `fix_lesson_statistics_view.sql` - SQL script to fix the views
- `functions/teachers.js` - Monthly stats API endpoint
- `src/components/admin/TeachersTable.jsx` - Frontend component
- `TEACHERS_OVERVIEW_FILTERING_SYSTEM.md` - System documentation

## Conclusion

The root cause is the restrictive date filter in the `lesson_statistics` view. Removing this filter and only filtering by `is_active = true` will allow the monthly stats to show historical data correctly, fixing the "0 lessons" issue in the UI.
