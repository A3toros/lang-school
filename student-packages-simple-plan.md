# Student Lesson Packages - Simple Implementation Plan

## Overview
Add a "Packages" tab between Active and Inactive tabs in Student Management to track student lesson packages.

## Database - Simple Table Only

### 1. Single Table: `student_packages`
```sql
CREATE TABLE student_packages (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    number_of_lessons INTEGER NOT NULL CHECK (number_of_lessons > 0),
    date_added DATE NOT NULL, -- Store as DATE, not TIMESTAMP
    week_start_date DATE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Use Existing weekly_schedule View
- Track lessons using `weekly_schedule` view
- Filter by `attendance_status = 'completed'` or `'absent'`
- Count lessons after package creation date
- Use existing `get_current_week_start()` and `get_week_start()` functions

## Frontend Implementation

### 1. StudentManagement Component
- Add "Packages" tab between Active and Inactive
- Table with columns: Student Name, Package (remaining), Date Added
- Search by name (left side)
- Add Package button (right side)

### 2. Add Package Modal
- Student name input with autocomplete (like admin schedule)
- Number of lessons input
- Save button with LoadingSpinnerModal
- Success/Error notifications

### 3. Package Tracking Logic
- Use weekly_schedule view to count lessons
- Filter by attendance_status and date
- Update remaining lessons in real-time
- Show notification when package reaches 0

### 4. Notification System
- Check for packages with 0 remaining lessons
- Show notification in main dashboard
- Prompt to delete package
- Use localStorage (like schedule extension logic)
- Write to localStorage that we checked this day
- Delete previous record next day

## Key Features

### 1. Simple Table Structure
- **Student Name** - from students table
- **Package** - remaining lessons (decreases as lessons taken)
- **Date Added** - when package was created

### 2. Package Tracking
- Use existing weekly_schedule view
- Count completed/absent lessons after package creation
- Real-time updates

### 3. Notifications
- Check daily for exhausted packages
- Show dashboard notification
- Prompt to delete package
- localStorage tracking (like schedule extension)

### 4. Add Package Flow
- Student search with autocomplete
- Number of lessons input
- Save with loading spinner
- Success/error notifications

## Implementation Steps

1. **Database**: Create simple student_packages table
2. **Backend**: Add API endpoints for CRUD operations
3. **Frontend**: Add Packages tab to StudentManagement
4. **Package Table**: Create table with required columns
5. **Add Modal**: Implement student search and package creation
6. **Tracking**: Use weekly_schedule view for lesson counting
7. **Notifications**: Add dashboard notifications for exhausted packages
8. **Delete**: Add delete functionality with confirmation

## Technical Notes

- Store dates as DATE (not TIMESTAMP)
- Use existing date utility functions
- Reuse student search logic from admin schedule
- Use LoadingSpinnerModal and SuccessNotification components
- Implement localStorage tracking like schedule extension
- Use weekly_schedule view for attendance tracking
