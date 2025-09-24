-- =============================================
-- FINAL SCHEMA MIGRATION
-- Language School Management System
-- Date: 2025-01-15
-- Description: Consolidated migration with all schema changes
-- =============================================

BEGIN;

-- =============================================
-- 1. ENABLE EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. CREATE ENUM TYPES
-- =============================================
CREATE TYPE user_role AS ENUM ('admin', 'teacher');
CREATE TYPE day_of_week AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');

-- =============================================
-- 3. CORE TABLES
-- =============================================

-- Teachers table
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    photo_url VARCHAR(500), -- Cloudinary URL (longer for CDN URLs)
    photo_public_id VARCHAR(255), -- Cloudinary public_id for deletion
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    lessons_per_week INTEGER DEFAULT 0 CHECK (lessons_per_week >= 0),
    added_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (for authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    password_changed_by_admin BOOLEAN DEFAULT false,
    password_changed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure teacher users have valid teacher_id, admin users have NULL teacher_id
    CONSTRAINT check_teacher_user_consistency 
        CHECK (
            (role = 'teacher' AND teacher_id IS NOT NULL) OR 
            (role = 'admin' AND teacher_id IS NULL)
        ),
    -- Ensure each teacher can only have one user account
    CONSTRAINT unique_teacher_user UNIQUE (teacher_id)
);

-- Time slots table for systematic time management
CREATE TABLE time_slots (
    id SERIAL PRIMARY KEY,
    time_slot VARCHAR(20) NOT NULL UNIQUE, -- e.g., "8:00-8:30"
    duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schedule templates table (recurring pattern per student/teacher/day/time)
CREATE TABLE schedule_templates (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Monday, 1=Tuesday, etc.
    time_slot VARCHAR(20) NOT NULL,
    lessons_per_week INTEGER DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    cancellation_date DATE,
    cancellation_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_template UNIQUE (student_id, teacher_id, day_of_week, time_slot, start_date)
);

-- Student schedules table (weekly schedule assignments)
CREATE TABLE student_schedules (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Monday, 1=Tuesday, etc.
    time_slot VARCHAR(20) NOT NULL,
    week_start_date DATE NOT NULL,
    attendance_status VARCHAR(20) DEFAULT 'scheduled' CHECK (attendance_status IN ('scheduled', 'completed', 'absent', 'absent_warned')),
    attendance_date DATE, -- Date when attendance was marked
    is_recurring BOOLEAN DEFAULT false,
    end_date DATE,
    original_teacher_id INTEGER REFERENCES teachers(id),
    recurrence_pattern VARCHAR(50) DEFAULT 'weekly',
    lesson_type VARCHAR(20) DEFAULT 'scheduled' CHECK (lesson_type IN ('scheduled', 'completed', 'cancelled', 'template')),
    template_id INTEGER REFERENCES schedule_templates(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, teacher_id, day_of_week, time_slot, week_start_date)
);

-- Schedule history table (audit log of changes to student_schedules)
CREATE TABLE schedule_history (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES student_schedules(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created','updated','reassigned','cancelled','deleted','completed')),
    old_teacher_id INTEGER REFERENCES teachers(id),
    new_teacher_id INTEGER REFERENCES teachers(id),
    changed_by INTEGER REFERENCES users(id),
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Lesson reports table (teacher comments for specific lessons)
CREATE TABLE lesson_reports (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student lessons tracking (total lessons taken, not linked to specific teacher)
CREATE TABLE student_lessons (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_lesson UNIQUE (student_id, lesson_date, time_slot)
);

-- Student-Teacher relationships table
CREATE TABLE student_teachers (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    assigned_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, teacher_id)
);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    background_image VARCHAR(500), -- Cloudinary URL (longer for CDN URLs)
    background_image_public_id VARCHAR(255), -- Cloudinary public_id for deletion
    detailed_description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mission content table
CREATE TABLE mission_content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    banner_image VARCHAR(500), -- Cloudinary URL (longer for CDN URLs)
    banner_image_public_id VARCHAR(255), -- Cloudinary public_id for deletion
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher showcase settings table
CREATE TABLE teacher_showcase_settings (
    id SERIAL PRIMARY KEY,
    display_count INTEGER DEFAULT 3,
    rotation_type VARCHAR(20) DEFAULT 'random' CHECK (rotation_type IN ('random', 'featured', 'alphabetical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Featured teachers table (for showcase)
CREATE TABLE featured_teachers (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id)
);

-- File management tables
CREATE TABLE file_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shared_files (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER REFERENCES file_folders(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'pdf', 'doc', 'docx', 'txt', etc.
    file_size BIGINT NOT NULL, -- in bytes
    cloudinary_public_id VARCHAR(255) NOT NULL,
    cloudinary_url VARCHAR(500) NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE file_access_logs (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES shared_files(id) ON DELETE CASCADE,
    accessed_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'view', 'download'
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Core table indexes
CREATE INDEX idx_students_teacher_id ON students(teacher_id);
CREATE INDEX idx_students_added_date ON students(added_date);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_teacher_id ON users(teacher_id);
CREATE INDEX idx_courses_display_order ON courses(display_order);
CREATE INDEX idx_courses_is_active ON courses(is_active);
CREATE INDEX idx_mission_content_is_active ON mission_content(is_active);
CREATE INDEX idx_featured_teachers_teacher ON featured_teachers(teacher_id);
CREATE INDEX idx_featured_teachers_display_order ON featured_teachers(display_order);

-- Schedule system indexes
CREATE INDEX idx_schedule_templates_student ON schedule_templates(student_id);
CREATE INDEX idx_schedule_templates_teacher ON schedule_templates(teacher_id);
CREATE INDEX idx_schedule_templates_active ON schedule_templates(is_active);
CREATE INDEX idx_schedule_templates_dates ON schedule_templates(start_date, end_date);
CREATE INDEX idx_schedule_templates_student_active ON schedule_templates(student_id, is_active);
CREATE INDEX idx_schedule_templates_cancellation ON schedule_templates(cancellation_date);

CREATE INDEX idx_student_schedules_teacher_week ON student_schedules(teacher_id, week_start_date);
CREATE INDEX idx_student_schedules_student ON student_schedules(student_id);
CREATE INDEX idx_student_schedules_is_active ON student_schedules(is_active);
CREATE INDEX idx_student_schedules_template_active ON student_schedules(template_id, is_active);
CREATE INDEX idx_student_schedules_lesson_type ON student_schedules(lesson_type);
CREATE INDEX idx_student_schedules_template ON student_schedules(template_id);

CREATE INDEX idx_schedule_history_schedule ON schedule_history(schedule_id);
CREATE INDEX idx_schedule_history_action ON schedule_history(action);
CREATE INDEX idx_schedule_history_date ON schedule_history(change_date);
CREATE INDEX idx_schedule_history_teacher ON schedule_history(old_teacher_id, new_teacher_id);
CREATE INDEX idx_schedule_history_schedule_action ON schedule_history(schedule_id, action);

-- Lesson and report indexes
CREATE INDEX idx_lesson_reports_teacher_date ON lesson_reports(teacher_id, lesson_date);
CREATE INDEX idx_lesson_reports_student ON lesson_reports(student_id);
CREATE INDEX idx_student_lessons_student ON student_lessons(student_id);
CREATE INDEX idx_student_lessons_date ON student_lessons(lesson_date);

-- Time slots indexes
CREATE INDEX idx_time_slots_active ON time_slots(is_active);
CREATE INDEX idx_time_slots_slot ON time_slots(time_slot);

-- Student-teacher relationship indexes
CREATE INDEX idx_student_teachers_student ON student_teachers(student_id);
CREATE INDEX idx_student_teachers_teacher ON student_teachers(teacher_id);
CREATE INDEX idx_student_teachers_active ON student_teachers(is_active);

-- File system indexes
CREATE INDEX idx_file_folders_created_by ON file_folders(created_by);
CREATE INDEX idx_file_folders_active ON file_folders(is_active);
CREATE INDEX idx_shared_files_folder ON shared_files(folder_id);
CREATE INDEX idx_shared_files_uploaded_by ON shared_files(uploaded_by);
CREATE INDEX idx_shared_files_active ON shared_files(is_active);
CREATE INDEX idx_file_access_logs_file ON file_access_logs(file_id);
CREATE INDEX idx_file_access_logs_accessed_by ON file_access_logs(accessed_by);

-- =============================================
-- 5. CREATE TRIGGER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to protect past schedules from deletion
CREATE OR REPLACE FUNCTION protect_past_schedules_before_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- prevent hard delete of past occurrences
    IF OLD.week_start_date < DATE_TRUNC('week', CURRENT_DATE) THEN
        RAISE EXCEPTION 'Cannot delete past schedule occurrence id=% - keep for audit', OLD.id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce schedule status consistency
CREATE OR REPLACE FUNCTION enforce_schedule_status_consistency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.attendance_status = 'completed' THEN
        NEW.lesson_type := 'completed';
        IF NEW.attendance_date IS NULL THEN
            NEW.attendance_date := schedule_lesson_date(NEW.week_start_date, NEW.day_of_week);
        END IF;
        NEW.is_active := TRUE; -- completed occurrences remain active in history
    END IF;

    IF NEW.attendance_status = 'absent' OR NEW.attendance_status = 'absent_warned' THEN
        -- ensure lesson_type not 'template' for attended statuses
        IF NEW.lesson_type IS NULL OR NEW.lesson_type = 'template' THEN
            NEW.lesson_type := 'scheduled';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure student-teacher link on schedule insert
CREATE OR REPLACE FUNCTION ensure_student_teacher_link()
RETURNS TRIGGER AS $$
BEGIN
    -- Reactivate if exists; else insert
    UPDATE student_teachers
        SET is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE student_id = NEW.student_id
          AND teacher_id = NEW.teacher_id;

    IF NOT FOUND THEN
        INSERT INTO student_teachers (student_id, teacher_id, assigned_date, assigned_by, is_active, created_at, updated_at)
        VALUES (NEW.student_id, NEW.teacher_id, CURRENT_DATE, NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, teacher_id) DO UPDATE
          SET is_active = TRUE,
              updated_at = EXCLUDED.updated_at;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create occurrences from template after insert
CREATE OR REPLACE FUNCTION trg_schedule_template_after_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Create occurrences for the next 12 weeks
    PERFORM create_occurrences_from_template(NEW.id, 12);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. CREATE TRIGGERS
-- =============================================

-- Updated_at triggers
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_reports_updated_at BEFORE UPDATE ON lesson_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_schedules_updated_at BEFORE UPDATE ON student_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_teachers_updated_at BEFORE UPDATE ON student_teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Schedule management triggers
CREATE TRIGGER trg_protect_past_schedules_delete
    BEFORE DELETE ON student_schedules
    FOR EACH ROW EXECUTE FUNCTION protect_past_schedules_before_delete();

CREATE TRIGGER trg_enforce_schedule_status_consistency
    BEFORE INSERT OR UPDATE ON student_schedules
    FOR EACH ROW EXECUTE FUNCTION enforce_schedule_status_consistency();

CREATE TRIGGER trg_ensure_student_teacher_link
    AFTER INSERT ON student_schedules
    FOR EACH ROW EXECUTE FUNCTION ensure_student_teacher_link();

CREATE TRIGGER schedule_template_after_insert
    AFTER INSERT ON schedule_templates
    FOR EACH ROW EXECUTE FUNCTION trg_schedule_template_after_insert();

-- =============================================
-- 7. CORE DATABASE FUNCTIONS
-- =============================================

-- Function to get current week start (Monday)
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
    RETURN DATE_TRUNC('week', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Function to get week start for any given date
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
    -- Calculate Monday of the week containing input_date
    -- Monday = 0, Sunday = 6
    RETURN input_date - (EXTRACT(DOW FROM input_date)::INTEGER - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate lesson date from week start and day of week
CREATE OR REPLACE FUNCTION schedule_lesson_date(p_week_start DATE, p_day_of_week INTEGER)
RETURNS DATE AS $$
BEGIN
    RETURN (p_week_start + (p_day_of_week * INTERVAL '1 day'))::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create occurrences from template (idempotent)
CREATE OR REPLACE FUNCTION create_occurrences_from_template(p_template_id INT, p_weeks_ahead INT DEFAULT 12)
RETURNS VOID AS $$
DECLARE
    tpl RECORD;
    gen_start DATE;
    gen_end DATE;
    wk DATE;
    week_start DATE;
BEGIN
    SELECT * INTO tpl FROM schedule_templates WHERE id = p_template_id;
    IF NOT FOUND THEN
        RAISE NOTICE 'Template % not found', p_template_id;
        RETURN;
    END IF;

    -- Only create if template is active
    IF NOT tpl.is_active THEN
        RAISE NOTICE 'Template % is not active - skipping', p_template_id;
        RETURN;
    END IF;

    -- start generation at max(template.start_date, current week start)
    gen_start := GREATEST(tpl.start_date, get_current_week_start());
    gen_end := (gen_start + (p_weeks_ahead * INTERVAL '7 days'))::DATE;
    
    IF tpl.end_date IS NOT NULL AND tpl.end_date < gen_end THEN
        gen_end := tpl.end_date;
    END IF;

    wk := gen_start;
    WHILE wk <= gen_end LOOP
        week_start := get_week_start(wk);
        
        -- Insert occurrence if not exists (avoid duplicates)
        INSERT INTO student_schedules (
            student_id, teacher_id, day_of_week, time_slot, week_start_date, 
            is_recurring, end_date, original_teacher_id, template_id, 
            lesson_type, attendance_status, is_active, created_at, updated_at
        ) SELECT 
            tpl.student_id, tpl.teacher_id, tpl.day_of_week, tpl.time_slot, week_start,
            TRUE, tpl.end_date, tpl.teacher_id, tpl.id,
            'scheduled', 'scheduled', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM student_schedules ss
            WHERE ss.student_id = tpl.student_id
              AND ss.teacher_id = tpl.teacher_id
              AND ss.day_of_week = tpl.day_of_week
              AND ss.time_slot = tpl.time_slot
              AND ss.week_start_date = week_start
              AND ss.template_id = tpl.id
        );
        
        wk := wk + INTERVAL '7 days';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk extend all templates
CREATE OR REPLACE FUNCTION extend_all_templates(p_weeks_ahead INT DEFAULT 12)
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM schedule_templates WHERE is_active = TRUE LOOP
        PERFORM create_occurrences_from_template(r.id, p_weeks_ahead);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel template and future occurrences
CREATE OR REPLACE FUNCTION cancel_template_and_future_occurrences(
    p_template_id INT,
    p_cancelled_by INT,
    p_note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_week_start DATE := get_current_week_start();
BEGIN
    -- Deactivate template and set cancellation date & note
    UPDATE schedule_templates
        SET is_active = FALSE, cancellation_date = current_week_start, cancellation_note = p_note, updated_at = CURRENT_TIMESTAMP
        WHERE id = p_template_id;

    -- Soft-disable future occurrences, but do NOT modify past occurrences or completed occurrences
    UPDATE student_schedules ss
    SET is_active = FALSE,
        attendance_status = CASE WHEN ss.attendance_status = 'scheduled' THEN 'scheduled' ELSE ss.attendance_status END,
        lesson_type = CASE WHEN ss.attendance_status = 'scheduled' THEN 'cancelled' ELSE ss.lesson_type END,
        updated_at = CURRENT_TIMESTAMP
    WHERE ss.template_id = p_template_id
      AND ss.week_start_date >= current_week_start
      AND ss.lesson_type <> 'completed';  -- keep completed ones untouched

    -- Log history entries for affected future occurrences
    INSERT INTO schedule_history (schedule_id, action, old_teacher_id, new_teacher_id, changed_by, change_date, notes)
    SELECT ss.id, 'cancelled', ss.teacher_id, NULL, p_cancelled_by, CURRENT_TIMESTAMP, p_note
    FROM student_schedules ss
    WHERE ss.template_id = p_template_id
      AND ss.week_start_date >= current_week_start
      AND ss.lesson_type <> 'completed';
END;
$$ LANGUAGE plpgsql;

-- Function to mark schedule as completed
CREATE OR REPLACE FUNCTION mark_schedule_completed(p_schedule_id INT, p_marked_by INT)
RETURNS VOID AS $$
DECLARE
    ss RECORD;
    lesson_dt DATE;
BEGIN
    SELECT * INTO ss FROM student_schedules WHERE id = p_schedule_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Schedule % not found', p_schedule_id;
    END IF;

    IF ss.is_active = FALSE THEN
        RAISE EXCEPTION 'Schedule % is inactive and cannot be completed', p_schedule_id;
    END IF;

    -- compute lesson date (week_start_date + day_of_week days)
    lesson_dt := schedule_lesson_date(ss.week_start_date, ss.day_of_week);

    -- If already completed, bail out (idempotent)
    IF ss.attendance_status = 'completed' THEN
        RETURN;
    END IF;

    -- Update schedule occurrence
    UPDATE student_schedules
    SET attendance_status = 'completed',
        attendance_date = lesson_dt,
        lesson_type = 'completed',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_schedule_id;

    -- Insert canonical ledger entry (avoid duplicates)
    BEGIN
        INSERT INTO student_lessons (student_id, lesson_date, time_slot, created_at)
        VALUES (ss.student_id, lesson_dt, ss.time_slot, CURRENT_TIMESTAMP);
    EXCEPTION WHEN unique_violation THEN
        -- already exists in ledger (safe / idempotent)
        NULL;
    END;

    -- Add history record showing completion
    INSERT INTO schedule_history (schedule_id, action, old_teacher_id, new_teacher_id, changed_by, change_date, notes)
    VALUES (p_schedule_id, 'completed', ss.teacher_id, ss.teacher_id, p_marked_by, CURRENT_TIMESTAMP, 'Marked completed via mark_schedule_completed()');
END;
$$ LANGUAGE plpgsql;

-- Function to delete future lessons
CREATE OR REPLACE FUNCTION delete_future_lesson(
    schedule_id_param INTEGER,
    deleted_by_user_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    schedule_rec RECORD;
    deleted_count INTEGER := 0;
BEGIN
    -- Get the lesson details from the provided schedule_id
    SELECT * INTO schedule_rec
    FROM student_schedules
    WHERE id = schedule_id_param;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Log the deletion action
    INSERT INTO schedule_history(
        schedule_id,
        action,
        old_teacher_id,
        changed_by,
        change_date,
        notes
    ) VALUES (
        schedule_rec.id,
        'deleted_recurring',
        schedule_rec.teacher_id,
        deleted_by_user_id,
        CURRENT_TIMESTAMP,
        'Deleted all future recurring lessons for student ' || schedule_rec.student_id || 
        ' with teacher ' || schedule_rec.teacher_id || 
        ' on ' || schedule_rec.day_of_week || ' at ' || schedule_rec.time_slot
    );

    -- Delete ALL future lessons for this student/teacher/day/time combination
    -- that are on or after the current week
    DELETE FROM student_schedules
    WHERE student_id = schedule_rec.student_id
      AND teacher_id = schedule_rec.teacher_id
      AND day_of_week = schedule_rec.day_of_week
      AND time_slot = schedule_rec.time_slot
      AND week_start_date >= get_current_week_start()
      AND id != schedule_rec.id; -- Don't delete the original record we used as reference

    -- Get count of deleted records
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Also delete the original record if it's in the future
    IF schedule_rec.week_start_date >= get_current_week_start() THEN
        DELETE FROM student_schedules WHERE id = schedule_rec.id;
        deleted_count := deleted_count + 1;
    END IF;

    -- Update the history record with the count
    UPDATE schedule_history 
    SET notes = notes || ' (deleted ' || deleted_count || ' lessons)'
    WHERE schedule_id = schedule_rec.id 
      AND action = 'deleted_recurring'
      AND changed_by = deleted_by_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get teacher schedule
CREATE OR REPLACE FUNCTION get_teacher_schedule(teacher_id_param INTEGER, week_start_param DATE)
RETURNS TABLE (
    student_id INTEGER,
    student_name VARCHAR,
    day_of_week INTEGER,
    time_slot VARCHAR,
    day_name TEXT,
    lesson_date DATE,
    has_report BOOLEAN,
    attendance_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        ss.day_of_week,
        ss.time_slot,
        CASE ss.day_of_week
            WHEN 0 THEN 'Monday'
            WHEN 1 THEN 'Tuesday'
            WHEN 2 THEN 'Wednesday'
            WHEN 3 THEN 'Thursday'
            WHEN 4 THEN 'Friday'
            WHEN 5 THEN 'Saturday'
            WHEN 6 THEN 'Sunday'
        END,
        schedule_lesson_date(ss.week_start_date, ss.day_of_week),
        CASE WHEN lr.id IS NOT NULL THEN true ELSE false END,
        ss.attendance_status
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    LEFT JOIN lesson_reports lr ON (
        lr.student_id = ss.student_id 
        AND lr.teacher_id = ss.teacher_id
        AND lr.lesson_date = schedule_lesson_date(ss.week_start_date, ss.day_of_week)
        AND lr.time_slot = ss.time_slot
    )
    WHERE ss.teacher_id = teacher_id_param 
    AND ss.week_start_date = week_start_param
    AND s.is_active = true
    AND ss.is_active = true
    ORDER BY ss.day_of_week, ss.time_slot;
END;
$$ LANGUAGE plpgsql;

-- Admin password management functions
CREATE OR REPLACE FUNCTION admin_change_teacher_password(
    teacher_id_param INTEGER,
    new_password VARCHAR(255),
    admin_user_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE teacher_id = teacher_id_param 
        AND role = 'teacher' 
        AND is_active = true
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN FALSE;
    END IF;
    
    UPDATE users 
    SET 
        password = new_password,
        password_changed_by_admin = true,
        password_changed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE teacher_id = teacher_id_param 
    AND role = 'teacher';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION admin_get_teacher_password(teacher_id_param INTEGER)
RETURNS TABLE (
    user_id INTEGER,
    username VARCHAR,
    password VARCHAR,
    teacher_name VARCHAR,
    password_changed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.password,
        t.name,
        u.password_changed_at
    FROM users u
    JOIN teachers t ON u.teacher_id = t.id
    WHERE u.teacher_id = teacher_id_param 
    AND u.role = 'teacher' 
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. CREATE DATABASE VIEWS
-- =============================================

-- Weekly schedule view
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
    ss.is_active,
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
WHERE ss.is_active = true;

-- Upcoming schedule view
CREATE VIEW upcoming_schedule_view AS
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
    ss.is_active,
    ss.created_at,
    ss.updated_at
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.week_start_date >= get_current_week_start()
  AND ss.is_active = true;

-- Lesson statistics view
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
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, ss.week_start_date
ORDER BY ss.teacher_id, ss.week_start_date;

-- Teacher monthly stats view
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
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, DATE_TRUNC('month', ss.week_start_date)::DATE
ORDER BY ss.teacher_id, month_start;

-- =============================================
-- 9. INSERT STANDARD TIME SLOTS
-- =============================================

INSERT INTO time_slots (time_slot, duration_minutes) VALUES
('8:00-8:30', 30), ('8:30-9:00', 30), ('9:00-9:30', 30), ('9:30-10:00', 30),
('10:00-10:30', 30), ('10:30-11:00', 30), ('11:00-11:30', 30), ('11:30-12:00', 30),
('12:00-12:30', 30), ('12:30-13:00', 30), ('13:00-13:30', 30), ('13:30-14:00', 30),
('14:00-14:30', 30), ('14:30-15:00', 30), ('15:00-15:30', 30), ('15:30-16:00', 30),
('16:00-16:30', 30), ('16:30-17:00', 30), ('17:00-17:30', 30), ('17:30-18:00', 30),
('18:00-18:30', 30), ('18:30-19:00', 30), ('19:00-19:30', 30), ('19:30-20:00', 30),
('20:00-20:30', 30), ('20:30-21:00', 30), ('21:00-21:30', 30), ('21:30-22:00', 30);

-- =============================================
-- 10. ADD FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add foreign key constraint to reference time_slots table
ALTER TABLE student_schedules
ADD CONSTRAINT fk_student_schedules_time_slot 
FOREIGN KEY (time_slot) REFERENCES time_slots(time_slot);

-- =============================================
-- 11. ADD COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN student_schedules.day_of_week IS 'Day of week: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday';
COMMENT ON COLUMN student_schedules.is_active IS 'Soft delete flag - FALSE means cancelled/inactive';
COMMENT ON COLUMN schedule_templates.cancellation_date IS 'Date when template was cancelled';
COMMENT ON COLUMN schedule_templates.cancellation_note IS 'Reason for template cancellation';
COMMENT ON FUNCTION schedule_lesson_date IS 'Calculate actual lesson date from week start and day of week';
COMMENT ON FUNCTION create_occurrences_from_template IS 'Idempotent function to create schedule occurrences from template';
COMMENT ON FUNCTION cancel_template_and_future_occurrences IS 'Safely cancel template and future occurrences, preserving past records';
COMMENT ON FUNCTION mark_schedule_completed IS 'Atomically mark schedule as completed and create ledger entry';
COMMENT ON VIEW upcoming_schedule_view IS 'Active upcoming schedule for UI display';

COMMIT;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
