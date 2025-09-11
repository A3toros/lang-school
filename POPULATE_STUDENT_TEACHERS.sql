-- =====================================================
-- POPULATE STUDENT_TEACHERS TABLE WITH EXISTING DATA
-- =====================================================
-- This script populates the student_teachers table with existing student-teacher assignments
-- Run this AFTER running MULTI_TEACHER_MIGRATION.sql

BEGIN;

-- Insert existing student-teacher assignments into student_teachers table
INSERT INTO student_teachers (student_id, teacher_id, is_primary, assigned_date, assigned_by, is_active)
SELECT 
    s.id as student_id,
    s.teacher_id,
    true as is_primary, -- All existing assignments are primary
    s.added_date as assigned_date,
    1 as assigned_by, -- Default to admin user (user_id = 1)
    s.is_active
FROM students s
WHERE s.teacher_id IS NOT NULL
AND s.is_active = true;

-- Update students table with primary_teacher_id and teacher_count
UPDATE students 
SET 
    primary_teacher_id = teacher_id,
    teacher_count = 1
WHERE teacher_id IS NOT NULL 
AND is_active = true;

-- Update student_schedules table with primary_teacher_id
UPDATE student_schedules 
SET primary_teacher_id = teacher_id
WHERE teacher_id IS NOT NULL;

COMMIT;

-- Verify the migration
SELECT 
    'Students with teachers' as description,
    COUNT(*) as count
FROM students s
WHERE s.teacher_id IS NOT NULL AND s.is_active = true

UNION ALL

SELECT 
    'Student-teacher assignments' as description,
    COUNT(*) as count
FROM student_teachers st
WHERE st.is_active = true

UNION ALL

SELECT 
    'Primary teacher assignments' as description,
    COUNT(*) as count
FROM student_teachers st
WHERE st.is_active = true AND st.is_primary = true;
