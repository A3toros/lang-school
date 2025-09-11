# LESSONS_PER_WEEK FULL TRACE ANALYSIS

## CURRENT ERROR
```
Create schedule error: Error: Cannot schedule 1 lessons. Student limit is 1, already has 1
    at validateLessonsPerWeek (C:\projects\lang-school\functions\schedules.js:617:7)
    at checkSchedulingConflicts (C:\projects\lang-school\functions\schedules.js:583:3)
    at createSchedule (C:\projects\lang-school\functions\schedules.js:203:5)
```

## BACKEND FUNCTIONS USING lessons_per_week

### 1. functions/schedules.js
- **createSchedule()** - Main scheduling function
  - Line 184: `SELECT lessons_per_week, primary_teacher_id FROM students WHERE id = $1`
  - Line 189: `const lessonsPerWeek = studentQuery.rows[0].lessons_per_week`
  - Line 202: `await checkSchedulingConflicts(client, student_id, teacher_id, day_of_week, time_slot, week_start_date, 1)`
  - Line 205-207: `createMultipleLessons(client, student_id, teacher_id, day_of_week, time_slot, week_start_date, 1)`
  - Line 211-213: `createScheduleTemplate(client, student_id, teacher_id, day_of_week, time_slot, 1, week_start_date)`

- **checkSchedulingConflicts()** - Conflict detection
  - Line 582: `console.log('🔍 [CONFLICT_CHECK] Existing lessons this week:', existingCount, 'Requested:', lessonsPerWeek)`
  - Line 584-585: Comments about removed validation
  - **ISSUE**: Still calling validateLessonsPerWeek somewhere

- **validateLessonsPerWeek()** - **THE PROBLEM FUNCTION**
  - Line 602-617: Function that checks if student exceeds lessons_per_week limit
  - **STATUS**: Should be removed but still exists

- **createMultipleLessons()** - Creates multiple lessons based on lessons_per_week
  - Line 435: `async function createMultipleLessons(client, studentId, teacherId, dayOfWeek, timeSlot, weekStart, lessonsPerWeek)`
  - Line 439: `if (lessonsPerWeek === 1)` - Single lesson logic
  - Line 443-457: Multiple lesson logic for 2-3 lessons
  - Line 458-470: Multiple lesson logic for 4-7 lessons
  - Line 471-483: Multiple lesson logic for 8+ lessons

- **createScheduleTemplate()** - Creates schedule templates
  - Line 641: `INSERT INTO schedule_templates (student_id, teacher_id, day_of_week, time_slot, lessons_per_week, start_date, is_active)`
  - Line 645: `lessons_per_week = EXCLUDED.lessons_per_week`

- **createScheduleTemplate() API endpoint**
  - Line 1209: `const { student_id, teacher_id, day_of_week, time_slot, lessons_per_week = 1, start_date, end_date, is_active = true }`
  - Line 1214: `INSERT INTO schedule_templates (student_id, teacher_id, day_of_week, time_slot, lessons_per_week, start_date, end_date, is_active)`

### 2. functions/students.js
- **getStudents()** - Student listing
  - Line 164: `const validSortKeys = ['name', 'teacher_name', 'lessons_per_week', 'lesson_count', 'added_date', 'is_active']`
  - Line 172: `'lessons_per_week': 's.lessons_per_week'`
  - Line 291: `const { name, teacher_id, lessons_per_week } = JSON.parse(event.body)`
  - Line 308: `INSERT INTO students (name, teacher_id, lessons_per_week, added_date)`
  - Line 313: `const result = await query(queryText, [name, teacher_id, lessons_per_week || 1])`

- **updateStudent()** - Student updates
  - Line 325: `const { name, teacher_id, lessons_per_week, is_active } = JSON.parse(event.body)`
  - Line 349: `SET name = $1, teacher_id = NULL, lessons_per_week = $2, is_active = false`
  - Line 353: `const result = await query(queryText, [name, lessons_per_week, studentId])`
  - Line 368: `SET name = $1, teacher_id = $2, lessons_per_week = $3, is_active = true`
  - Line 372: `const result = await query(queryText, [name, teacher_id, lessons_per_week, studentId])`
  - Line 385: `SET name = $1, teacher_id = $2, lessons_per_week = $3, updated_at = CURRENT_TIMESTAMP`
  - Line 390: `const result = await query(queryText, [name, teacher_id, lessons_per_week, studentId])`

- **getStudentById()** - Student details
  - Line 819: `s.lessons_per_week`
  - Line 825: `GROUP BY s.id, s.name, t.name, s.added_date, s.lessons_per_week`

- **bulkUpdateStudents()** - Bulk operations
  - Line 974: `const allowedFields = ['name', 'teacher_id', 'lessons_per_week', 'is_active']`

### 3. functions/analytics.js
- **getStudentAnalytics()** - Student analytics
  - Line 154: `s.lessons_per_week`
  - Line 171: `GROUP BY s.id, s.name, t.name, s.lessons_per_week, s.added_date`

### 4. functions/utils/validation.js
- **validation rules**
  - Line 260: `lessons_per_week: [value => validateInteger(value, 'Lessons per week', 1, 7)]`

## FRONTEND COMPONENTS USING lessons_per_week

### 1. src/components/admin/ScheduleTable.jsx
- **Student display**
  - Line 269: `if (studentToUse.lessons_per_week > 1)`
  - Line 275: `lessonsPerWeek: studentToUse.lessons_per_week`
  - Line 481: `{student.lessons_per_week} lessons`

### 2. src/components/admin/StudentManagement.jsx
- **Student management**
  - Line 181: `lessons_per_week: student.lessons_per_week`
  - Line 212: `lessons_per_week: student.lessons_per_week`
  - Line 245: `lessons_per_week: 1`
  - Line 629: `onClick={() => handleSort('lessons_per_week')}`
  - Line 633: `{sortConfig.key === 'lessons_per_week' && (`
  - Line 714: `{student.lessons_per_week}`

### 3. src/components/admin/StudentModal.jsx
- **Student form**
  - Line 15: `lessons_per_week: 1`
  - Line 30: `lessons_per_week: student.lessons_per_week || 1`
  - Line 36: `lessons_per_week: 1`
  - Line 94: `[name]: name === 'lessons_per_week' ? parseInt(value) || 1 : value`
  - Line 155: `<label htmlFor="lessons_per_week"`
  - Line 160: `id="lessons_per_week"`
  - Line 161: `name="lessons_per_week"`
  - Line 162: `value={formData.lessons_per_week}`

### 4. src/components/admin/TeachersTable.jsx
- **Teacher display**
  - Line 358: `{student.lessons_per_week} lessons/week`

### 5. src/utils/testHelpers.js
- **Test data**
  - Line 31: `lessons_per_week: 2`
  - Line 41: `lessons_per_week: 1`

## DATABASE SCHEMA

### 1. students table
- Line 29: `lessons_per_week INTEGER DEFAULT 1 CHECK (lessons_per_week > 0)`
- Line 192: `INSERT INTO students (name, teacher_id, lessons_per_week, added_date) VALUES`
- Line 383: `s.lessons_per_week`
- Line 394: `GROUP BY s.id, s.name, t.name, s.lessons_per_week, s.added_date`
- Line 742: `s.lessons_per_week`
- Line 755: `GROUP BY s.id, s.name, t.name, s.lessons_per_week, s.added_date`
- Line 810: `lessons_per_week INTEGER DEFAULT 1`
- Line 856-858: Constraint changes to allow 0
- Line 861: `ALTER TABLE students ALTER COLUMN lessons_per_week SET DEFAULT 0`

### 2. schedule_templates table
- Line 810: `lessons_per_week INTEGER DEFAULT 1`

## THE ACTUAL PROBLEM

The error shows:
```
at validateLessonsPerWeek (C:\projects\lang-school\functions\schedules.js:617:7)
at checkSchedulingConflicts (C:\projects\lang-school\functions\schedules.js:583:3)
```

This means:
1. **Line 583** in `checkSchedulingConflicts` is calling `validateLessonsPerWeek`
2. **Line 617** is where the error is thrown in `validateLessonsPerWeek`

But I thought I removed the call from `checkSchedulingConflicts`. Let me check what's actually on line 583.

## CURRENT STATE OF checkSchedulingConflicts

Looking at the current code:
- Line 584-585: Comments about removed validation
- Line 587: `await validateNoDoubleBooking(client, teacherId, dayOfWeek, timeSlot, weekStart)`

**ISSUE**: The `validateLessonsPerWeek` function is still being called from somewhere, but I can't see where in the current code.

## SOLUTION PLAN

1. **Remove validateLessonsPerWeek function completely**
2. **Find and remove ALL calls to it**
3. **Simplify createMultipleLessons to always create 1 lesson**
4. **Remove lessons_per_week from scheduling logic entirely**
5. **Keep lessons_per_week in UI for display only**

## WHAT NEEDS TO BE CHANGED

### Backend Changes:
1. **functions/schedules.js**:
   - Remove `validateLessonsPerWeek` function
   - Remove all calls to it
   - Simplify `createMultipleLessons` to always create 1 lesson
   - Remove `lessons_per_week` from `createSchedule` logic

### Frontend Changes:
1. **Keep lessons_per_week in UI** for display purposes
2. **Remove lessons_per_week logic** from scheduling
3. **Always create 1 lesson** per click

### Database Changes:
1. **Keep lessons_per_week column** for display
2. **Remove constraints** that prevent scheduling
3. **Make it informational only**

## NEXT STEPS

1. Check current state of functions/schedules.js
2. Find where validateLessonsPerWeek is being called
3. Remove it completely
4. Test scheduling works
