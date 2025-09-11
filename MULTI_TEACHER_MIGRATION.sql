-- =====================================================
-- MULTI-TEACHER ASSIGNMENT MIGRATION SCRIPT
-- =====================================================
-- This script transforms the single-teacher system into a multi-teacher system
-- Run this script in your PostgreSQL database

BEGIN;

-- =====================================================
-- 1. CREATE NEW TABLES
-- =====================================================

-- Junction table for many-to-many student-teacher relationships
CREATE TABLE student_teachers (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_date DATE DEFAULT CURRENT_DATE,
    assigned_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique active assignments
    UNIQUE(student_id, teacher_id)
);

-- Create partial unique index to ensure only one primary teacher per student
CREATE UNIQUE INDEX idx_student_teachers_unique_primary 
ON student_teachers (student_id) 
WHERE is_primary = true;

-- =====================================================
-- 2. ADD NEW COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add primary teacher reference to students table
ALTER TABLE students ADD COLUMN primary_teacher_id INTEGER REFERENCES teachers(id);
ALTER TABLE students ADD COLUMN teacher_count INTEGER DEFAULT 0;

-- Add primary teacher reference to student_schedules table
ALTER TABLE student_schedules ADD COLUMN primary_teacher_id INTEGER REFERENCES teachers(id);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for student_teachers table
CREATE INDEX idx_student_teachers_student ON student_teachers(student_id);
CREATE INDEX idx_student_teachers_teacher ON student_teachers(teacher_id);
CREATE INDEX idx_student_teachers_active ON student_teachers(is_active);
CREATE INDEX idx_student_teachers_primary ON student_teachers(is_primary);
CREATE INDEX idx_student_teachers_student_active ON student_teachers(student_id, is_active);
CREATE INDEX idx_student_teachers_teacher_active ON student_teachers(teacher_id, is_active);

-- Indexes for new columns
CREATE INDEX idx_students_primary_teacher ON students(primary_teacher_id);
CREATE INDEX idx_students_teacher_count ON students(teacher_count);
CREATE INDEX idx_student_schedules_primary_teacher ON student_schedules(primary_teacher_id);

-- =====================================================
-- 4. MIGRATE EXISTING DATA
-- =====================================================

-- Migrate existing student-teacher relationships to new table
INSERT INTO student_teachers (student_id, teacher_id, is_primary, assigned_date, assigned_by)
SELECT 
    s.id as student_id,
    s.teacher_id,
    true as is_primary,
    s.created_at as assigned_date,
    NULL as assigned_by  -- We don't know who originally assigned
FROM students s 
WHERE s.teacher_id IS NOT NULL;

-- Update students table with primary teacher and count
UPDATE students 
SET 
    primary_teacher_id = teacher_id,
    teacher_count = 1
WHERE teacher_id IS NOT NULL;

-- Update student_schedules with primary teacher reference
UPDATE student_schedules ss 
SET primary_teacher_id = s.primary_teacher_id
FROM students s 
WHERE ss.student_id = s.id AND s.primary_teacher_id IS NOT NULL;

-- =====================================================
-- 5. CREATE UPDATED TRIGGERS
-- =====================================================

-- Create trigger for student_teachers updated_at
CREATE TRIGGER update_student_teachers_updated_at 
    BEFORE UPDATE ON student_teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get student's teachers
CREATE OR REPLACE FUNCTION get_student_teachers(student_id_param INTEGER)
RETURNS TABLE (
    teacher_id INTEGER,
    teacher_name VARCHAR,
    photo_url VARCHAR,
    is_primary BOOLEAN,
    assigned_date DATE,
    assigned_by INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.photo_url,
        st.is_primary,
        st.assigned_date,
        st.assigned_by
    FROM teachers t
    JOIN student_teachers st ON t.id = st.teacher_id
    WHERE st.student_id = student_id_param 
    AND st.is_active = true
    ORDER BY st.is_primary DESC, t.name;
END;
$$ LANGUAGE plpgsql;

-- Function to add teacher to student
CREATE OR REPLACE FUNCTION add_student_teacher(
    student_id_param INTEGER,
    teacher_id_param INTEGER,
    is_primary_param BOOLEAN DEFAULT false,
    assigned_by_param INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    teacher_exists BOOLEAN;
    already_assigned BOOLEAN;
BEGIN
    -- Check if teacher exists and is active
    SELECT EXISTS(
        SELECT 1 FROM teachers 
        WHERE id = teacher_id_param AND is_active = true
    ) INTO teacher_exists;
    
    IF NOT teacher_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Check if already assigned
    SELECT EXISTS(
        SELECT 1 FROM student_teachers 
        WHERE student_id = student_id_param 
        AND teacher_id = teacher_id_param 
        AND is_active = true
    ) INTO already_assigned;
    
    IF already_assigned THEN
        RETURN FALSE;
    END IF;
    
    -- If setting as primary, unset current primary
    IF is_primary_param THEN
        UPDATE student_teachers 
        SET is_primary = false 
        WHERE student_id = student_id_param AND is_primary = true;
    END IF;
    
    -- Add new assignment
    INSERT INTO student_teachers (student_id, teacher_id, is_primary, assigned_by)
    VALUES (student_id_param, teacher_id_param, is_primary_param, assigned_by_param);
    
    -- Update student's primary teacher if needed
    IF is_primary_param THEN
        UPDATE students 
        SET primary_teacher_id = teacher_id_param 
        WHERE id = student_id_param;
    END IF;
    
    -- Update teacher count
    UPDATE students 
    SET teacher_count = teacher_count + 1 
    WHERE id = student_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to remove teacher from student
CREATE OR REPLACE FUNCTION remove_student_teacher(
    student_id_param INTEGER,
    teacher_id_param INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    assignment_exists BOOLEAN;
    is_primary_teacher BOOLEAN;
    new_primary_id INTEGER;
BEGIN
    -- Check if assignment exists
    SELECT EXISTS(
        SELECT 1 FROM student_teachers 
        WHERE student_id = student_id_param 
        AND teacher_id = teacher_id_param 
        AND is_active = true
    ) INTO assignment_exists;
    
    IF NOT assignment_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Check if it's the primary teacher
    SELECT is_primary INTO is_primary_teacher
    FROM student_teachers 
    WHERE student_id = student_id_param 
    AND teacher_id = teacher_id_param 
    AND is_active = true;
    
    -- Deactivate assignment
    UPDATE student_teachers 
    SET is_active = false 
    WHERE student_id = student_id_param AND teacher_id = teacher_id_param;
    
    -- If removing primary teacher, set new primary or clear
    IF is_primary_teacher THEN
        -- Find new primary teacher
        SELECT teacher_id INTO new_primary_id
        FROM student_teachers 
        WHERE student_id = student_id_param 
        AND is_active = true 
        AND is_primary = false 
        LIMIT 1;
        
        IF new_primary_id IS NOT NULL THEN
            -- Set new primary
            UPDATE student_teachers 
            SET is_primary = true 
            WHERE student_id = student_id_param AND teacher_id = new_primary_id;
            
            UPDATE students 
            SET primary_teacher_id = new_primary_id 
            WHERE id = student_id_param;
        ELSE
            -- No more teachers, clear primary
            UPDATE students 
            SET primary_teacher_id = NULL 
            WHERE id = student_id_param;
        END IF;
    END IF;
    
    -- Update teacher count
    UPDATE students 
    SET teacher_count = teacher_count - 1 
    WHERE id = student_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to set primary teacher
CREATE OR REPLACE FUNCTION set_primary_teacher(
    student_id_param INTEGER,
    teacher_id_param INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    assignment_exists BOOLEAN;
BEGIN
    -- Check if teacher is assigned to student
    SELECT EXISTS(
        SELECT 1 FROM student_teachers 
        WHERE student_id = student_id_param 
        AND teacher_id = teacher_id_param 
        AND is_active = true
    ) INTO assignment_exists;
    
    IF NOT assignment_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Unset current primary
    UPDATE student_teachers 
    SET is_primary = false 
    WHERE student_id = student_id_param AND is_primary = true;
    
    -- Set new primary
    UPDATE student_teachers 
    SET is_primary = true 
    WHERE student_id = student_id_param AND teacher_id = teacher_id_param;
    
    -- Update student's primary teacher
    UPDATE students 
    SET primary_teacher_id = teacher_id_param 
    WHERE id = student_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. UPDATE EXISTING VIEWS
-- =====================================================

-- Update weekly_schedule view to include primary teacher
DROP VIEW IF EXISTS weekly_schedule;
CREATE VIEW weekly_schedule AS
SELECT 
    ss.id,
    s.name as student_name,
    t.name as teacher_name,
    pt.name as primary_teacher_name,
    ss.day_of_week,
    ss.time_slot,
    ss.week_start_date,
    ss.is_recurring,
    ss.end_date,
    ss.original_teacher_id,
    ss.attendance_status,
    ss.attendance_date,
    ss.created_at,
    ss.updated_at,
    CASE ss.day_of_week
        WHEN 0 THEN 'Monday'
        WHEN 1 THEN 'Tuesday'
        WHEN 2 THEN 'Wednesday'
        WHEN 3 THEN 'Thursday'
        WHEN 4 THEN 'Friday'
        WHEN 5 THEN 'Saturday'
        WHEN 6 THEN 'Sunday'
    END as day_name
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
LEFT JOIN teachers pt ON ss.primary_teacher_id = pt.id
WHERE s.is_active = true;

-- Update lesson_statistics view to include teacher count
DROP VIEW IF EXISTS lesson_statistics;
CREATE VIEW lesson_statistics AS
SELECT 
    s.id as student_id,
    s.name as student_name,
    pt.name as primary_teacher_name,
    s.teacher_count,
    COUNT(ss.id) as total_lessons_scheduled,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as warned_absences,
    COUNT(CASE WHEN ss.attendance_status = 'scheduled' THEN 1 END) as pending_lessons,
    COUNT(sl.id) as total_lessons_taken_ever,
    s.lessons_per_week,
    s.added_date,
    ROUND(
      (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
       NULLIF(
         (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)
          + COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END)), 0)) * 100, 2
    ) as attendance_percentage
FROM students s
LEFT JOIN teachers pt ON s.primary_teacher_id = pt.id
LEFT JOIN student_schedules ss ON s.id = ss.student_id
LEFT JOIN student_lessons sl ON s.id = sl.student_id
WHERE s.is_active = true
GROUP BY s.id, s.name, pt.name, s.teacher_count, s.lessons_per_week, s.added_date;

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Verify migration success
SELECT 
    'Migration Verification' as status,
    (SELECT COUNT(*) FROM students WHERE teacher_id IS NOT NULL) as students_with_old_teacher_id,
    (SELECT COUNT(*) FROM students WHERE primary_teacher_id IS NOT NULL) as students_with_primary_teacher,
    (SELECT COUNT(*) FROM student_teachers WHERE is_active = true) as active_teacher_assignments,
    (SELECT COUNT(*) FROM student_teachers WHERE is_primary = true) as primary_teacher_assignments;

-- =====================================================
-- 9. CLEANUP (OPTIONAL - RUN AFTER VERIFICATION)
-- =====================================================

-- Uncomment these lines ONLY after verifying everything works correctly
-- and you're sure you want to remove the old teacher_id column

-- ALTER TABLE students DROP COLUMN teacher_id;

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The database now supports multi-teacher assignments
-- All existing data has been preserved and migrated
-- New functionality is available through the API endpoints
