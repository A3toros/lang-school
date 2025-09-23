-- =============================================
-- COMPLETE DATABASE MIGRATION SCRIPT
-- Template-Free Schedule System
-- =============================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE ENUM TYPES
CREATE TYPE user_role AS ENUM ('admin', 'teacher');
CREATE TYPE day_of_week AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');

-- 3. CORE TABLES
-- Teachers table
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    photo_url VARCHAR(500),
    photo_public_id VARCHAR(255),
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
    CONSTRAINT check_teacher_user_consistency 
        CHECK (
            (role = 'teacher' AND teacher_id IS NOT NULL) OR 
            (role = 'admin' AND teacher_id IS NULL)
        ),
    CONSTRAINT unique_teacher_user UNIQUE (teacher_id)
);

-- NEW: Schedule Templates Table (Template-Free System)
CREATE TABLE schedule_templates (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    time_slot VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Attendance Records Table (Template-Free System)
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'completed', 'absent', 'absent_warned')),
    attendance_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    UNIQUE(student_id, teacher_id, lesson_date, time_slot)
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

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    background_image VARCHAR(500),
    background_image_public_id VARCHAR(255),
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
    banner_image VARCHAR(500),
    banner_image_public_id VARCHAR(255),
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

-- Time slots table for systematic time management
CREATE TABLE time_slots (
    id SERIAL PRIMARY KEY,
    time_slot VARCHAR(20) NOT NULL UNIQUE,
    duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
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
    action VARCHAR(50) NOT NULL,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cache telemetry table
CREATE TABLE cache_telemetry (
    id BIGSERIAL PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id INT NULL,
    user_role TEXT NULL,
    event TEXT NOT NULL,
    resource TEXT NULL,
    resource_id TEXT NULL,
    endpoint TEXT NULL,
    etag TEXT NULL,
    version TEXT NULL,
    status TEXT NULL,
    latency_ms INT NULL
);

-- 4. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_students_teacher_id ON students(teacher_id);
CREATE INDEX idx_students_added_date ON students(added_date);
CREATE INDEX idx_lesson_reports_teacher_date ON lesson_reports(teacher_id, lesson_date);
CREATE INDEX idx_lesson_reports_student ON lesson_reports(student_id);
CREATE INDEX idx_student_lessons_student ON student_lessons(student_id);
CREATE INDEX idx_student_lessons_date ON student_lessons(lesson_date);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_teacher_id ON users(teacher_id);
CREATE INDEX idx_courses_display_order ON courses(display_order);
CREATE INDEX idx_courses_is_active ON courses(is_active);
CREATE INDEX idx_mission_content_is_active ON mission_content(is_active);
CREATE INDEX idx_featured_teachers_teacher ON featured_teachers(teacher_id);
CREATE INDEX idx_featured_teachers_display_order ON featured_teachers(display_order);

-- Template-Free System Indexes
CREATE INDEX idx_schedule_templates_student ON schedule_templates(student_id);
CREATE INDEX idx_schedule_templates_teacher ON schedule_templates(teacher_id);
CREATE INDEX idx_schedule_templates_active ON schedule_templates(is_active);
CREATE INDEX idx_schedule_templates_dates ON schedule_templates(start_date, end_date);
CREATE INDEX idx_attendance_records_student_teacher ON attendance_records(student_id, teacher_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(lesson_date);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);

-- Additional indexes
CREATE INDEX idx_time_slots_active ON time_slots(is_active);
CREATE INDEX idx_time_slots_slot ON time_slots(time_slot);
CREATE INDEX idx_cache_telemetry_ts ON cache_telemetry (ts DESC);
CREATE INDEX idx_cache_telemetry_resource_ts ON cache_telemetry (resource, ts DESC);
CREATE INDEX idx_cache_telemetry_user_ts ON cache_telemetry (user_id, ts DESC);
CREATE INDEX idx_cache_telemetry_event_ts ON cache_telemetry (event, ts DESC);

-- 5. CREATE TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. CREATE TRIGGERS
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

-- 7. CORE DATABASE FUNCTIONS

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
    RETURN DATE_TRUNC('week', input_date);
END;
$$ LANGUAGE plpgsql;

-- NEW: Core Template-Free Function
CREATE OR REPLACE FUNCTION get_schedule_for_week_range(
    p_week_start DATE,
    p_week_end DATE
) RETURNS TABLE (
    student_id INTEGER,
    teacher_id INTEGER,
    day_of_week INTEGER,
    time_slot VARCHAR(20),
    week_start_date DATE,
    lesson_date DATE,
    has_report BOOLEAN,
    report_id INTEGER,
    report_comment TEXT,
    report_created_at TIMESTAMP,
    attendance_status VARCHAR(20),
    attendance_date DATE
) AS $$
BEGIN
    RETURN QUERY
    WITH week_series AS (
        SELECT generate_series(
            p_week_start::DATE,
            p_week_end::DATE,
            '7 days'::INTERVAL
        )::DATE as week_start
    ),
    schedule_data AS (
        SELECT 
            st.student_id,
            st.teacher_id,
            st.day_of_week,
            st.time_slot,
            ws.week_start as week_start_date,
            (ws.week_start + (st.day_of_week * INTERVAL '1 day'))::DATE as lesson_date
        FROM schedule_templates st
        CROSS JOIN week_series ws
        WHERE st.is_active = true
        AND st.start_date <= ws.week_start
        AND (st.end_date IS NULL OR st.end_date >= ws.week_start)
    )
    SELECT 
        sd.student_id,
        sd.teacher_id,
        sd.day_of_week,
        sd.time_slot,
        sd.week_start_date,
        sd.lesson_date,
        CASE WHEN lr.id IS NOT NULL THEN true ELSE false END as has_report,
        lr.id as report_id,
        lr.comment as report_comment,
        lr.created_at as report_created_at,
        COALESCE(ar.status, 'scheduled') as attendance_status,
        ar.attendance_date
    FROM schedule_data sd
    LEFT JOIN lesson_reports lr ON (
        lr.student_id = sd.student_id 
        AND lr.teacher_id = sd.teacher_id
        AND lr.lesson_date = sd.lesson_date
        AND lr.time_slot = sd.time_slot
    )
    LEFT JOIN attendance_records ar ON (
        ar.student_id = sd.student_id 
        AND ar.teacher_id = sd.teacher_id
        AND ar.lesson_date = sd.lesson_date
        AND ar.time_slot = sd.time_slot
    );
END;
$$ LANGUAGE plpgsql;

-- Rewritten get_teacher_schedule function
CREATE OR REPLACE FUNCTION get_teacher_schedule(teacher_id_param INTEGER, week_start_param DATE)
RETURNS TABLE (
    student_id INTEGER,
    student_name VARCHAR,
    day_of_week INTEGER,
    time_slot VARCHAR(20),
    day_name TEXT,
    lesson_date DATE,
    has_report BOOLEAN,
    attendance_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.student_id,
        s.name as student_name,
        gs.day_of_week,
        gs.time_slot,
        CASE gs.day_of_week
            WHEN 0 THEN 'Monday'
            WHEN 1 THEN 'Tuesday'
            WHEN 2 THEN 'Wednesday'
            WHEN 3 THEN 'Thursday'
            WHEN 4 THEN 'Friday'
            WHEN 5 THEN 'Saturday'
            WHEN 6 THEN 'Sunday'
        END as day_name,
        gs.lesson_date,
        gs.has_report,
        gs.attendance_status
    FROM get_schedule_for_week_range(week_start_param, week_start_param) gs
    JOIN students s ON gs.student_id = s.id
    WHERE gs.teacher_id = teacher_id_param
    ORDER BY gs.day_of_week, gs.time_slot;
END;
$$ LANGUAGE plpgsql;

-- Rewritten mark_schedule_completed function
CREATE OR REPLACE FUNCTION mark_schedule_completed(
    p_student_id INTEGER,
    p_teacher_id INTEGER,
    p_lesson_date DATE,
    p_time_slot VARCHAR(20),
    p_user_id INTEGER
) RETURNS VOID AS $$
DECLARE
    template_exists BOOLEAN;
BEGIN
    -- Check if template exists for this lesson
    SELECT EXISTS(
        SELECT 1 FROM schedule_templates st
        WHERE st.student_id = p_student_id
        AND st.teacher_id = p_teacher_id
        AND st.day_of_week = EXTRACT(DOW FROM p_lesson_date)::INTEGER - 1
        AND st.time_slot = p_time_slot
        AND st.is_active = true
        AND st.start_date <= p_lesson_date
        AND (st.end_date IS NULL OR st.end_date >= p_lesson_date)
    ) INTO template_exists;
    
    IF NOT template_exists THEN
        RAISE EXCEPTION 'No active template found for this lesson';
    END IF;
    
    -- Insert or update attendance record
    INSERT INTO attendance_records (student_id, teacher_id, lesson_date, time_slot, status, attendance_date, created_by)
    VALUES (p_student_id, p_teacher_id, p_lesson_date, p_time_slot, 'completed', p_lesson_date, p_user_id)
    ON CONFLICT (student_id, teacher_id, lesson_date, time_slot)
    DO UPDATE SET 
        status = 'completed',
        attendance_date = p_lesson_date,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_user_id;
    
    -- Insert into student_lessons for counting
    INSERT INTO student_lessons (student_id, lesson_date, time_slot)
    VALUES (p_student_id, p_lesson_date, p_time_slot)
    ON CONFLICT (student_id, lesson_date, time_slot) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate lesson date from week start and day of week
CREATE OR REPLACE FUNCTION schedule_lesson_date(p_week_start DATE, p_day_of_week INTEGER)
RETURNS DATE AS $$
BEGIN
    RETURN (p_week_start + (p_day_of_week * INTERVAL '1 day'))::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

-- 8. CREATE DATABASE VIEWS

-- weekly_schedule view (Template-Free)
CREATE VIEW weekly_schedule AS
SELECT 
    gs.student_id,
    s.name as student_name,
    gs.teacher_id,
    t.name as teacher_name,
    gs.day_of_week,
    gs.time_slot,
    gs.week_start_date,
    gs.lesson_date,
    gs.attendance_status,
    gs.has_report
FROM get_schedule_for_week_range(
    get_current_week_start(), 
    get_current_week_start() + INTERVAL '6 days'
) gs
JOIN students s ON gs.student_id = s.id
JOIN teachers t ON gs.teacher_id = t.id
WHERE s.is_active = true AND t.is_active = true;

-- upcoming_schedule_view (Template-Free)
CREATE VIEW upcoming_schedule_view AS
SELECT 
    gs.student_id,
    s.name as student_name,
    gs.teacher_id,
    t.name as teacher_name,
    gs.day_of_week,
    gs.time_slot,
    gs.week_start_date,
    gs.lesson_date,
    gs.attendance_status,
    gs.has_report
FROM get_schedule_for_week_range(
    get_current_week_start(),
    get_current_week_start() + INTERVAL '12 weeks'
) gs
JOIN students s ON gs.student_id = s.id
JOIN teachers t ON gs.teacher_id = t.id
WHERE s.is_active = true AND t.is_active = true
ORDER BY gs.week_start_date, gs.day_of_week, gs.time_slot;

-- lesson_statistics view (Template-Free)
CREATE VIEW lesson_statistics AS
SELECT 
    gs.teacher_id,
    t.name as teacher_name,
    gs.week_start_date,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN gs.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN gs.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN gs.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons
FROM get_schedule_for_week_range(
    get_current_week_start(),
    get_current_week_start() + INTERVAL '12 weeks'
) gs
JOIN teachers t ON gs.teacher_id = t.id
WHERE t.is_active = true
GROUP BY gs.teacher_id, t.name, gs.week_start_date
ORDER BY gs.week_start_date, gs.teacher_id;

-- teacher_monthly_stats view (Template-Free)
CREATE VIEW teacher_monthly_stats AS
SELECT 
    gs.teacher_id,
    t.name as teacher_name,
    t.email as teacher_email,
    DATE_TRUNC('month', gs.lesson_date) as month_year,
    EXTRACT(YEAR FROM gs.lesson_date) as year,
    EXTRACT(MONTH FROM gs.lesson_date) as month,
    COUNT(CASE WHEN gs.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN gs.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN gs.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons,
    COUNT(*) as total_lessons,
    ROUND(
        (COUNT(CASE WHEN gs.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(*), 0)) * 100, 2
    ) as attendance_percentage,
    COUNT(DISTINCT gs.student_id) as unique_students_taught
FROM get_schedule_for_week_range(
    get_current_week_start(),
    get_current_week_start() + INTERVAL '12 weeks'
) gs
JOIN teachers t ON gs.teacher_id = t.id
WHERE t.is_active = true
GROUP BY gs.teacher_id, t.name, t.email, DATE_TRUNC('month', gs.lesson_date), 
         EXTRACT(YEAR FROM gs.lesson_date), EXTRACT(MONTH FROM gs.lesson_date)
ORDER BY gs.teacher_id, month_year DESC;

-- 9. INSERT ACTUAL DATA

-- Insert actual teachers
INSERT INTO teachers (id, name, email, photo_url, photo_public_id, description, is_active, created_at, updated_at) VALUES
(13, 'Test Teacher', 'test@example.com', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757680112/fwubrpowmgxb8n1xq199.jpg', NULL, 'Sexy lady, will love you long time', true, '2025-09-12 05:33:44.466166', '2025-09-12 12:28:57.757267'),
(14, 'Sara Serene', '123', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757679962/e3cipg1ctkgj2cg7znfy.webp', NULL, 'Stupid as fuck', true, '2025-09-12 12:26:12.754733', '2025-09-12 12:26:12.754733'),
(15, 'lark Carson', '1234', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757679986/cjzribriwstnq7fbsbay.webp', NULL, 'Child molester', true, '2025-09-12 12:27:08.159482', '2025-09-12 12:27:08.159482'),
(16, 'Bart Bartson', '12345', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757680041/hgdt9rrafrjcmxxvs5hv.webp', NULL, 'Screams at you when he is horny', true, '2025-09-12 12:27:44.002503', '2025-09-12 14:02:11.813707'),
(17, 'Cocksucker Pussywanker', '123456', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757779658/erfbaiphh5okdvrirdj5.webp', NULL, 'Will suck cocks for money', true, '2025-09-13 16:07:39.897524', '2025-09-13 16:08:01.61292');

-- Insert actual users
INSERT INTO users (id, username, password, role, teacher_id, is_active, password_changed_by_admin, password_changed_at, created_at, updated_at) VALUES
(14, 'test.teacher', 'password123', 'teacher', 13, true, false, NULL, '2025-09-12 05:33:44.577079', '2025-09-12 05:33:44.577079'),
(15, 'admin', 'admin123', 'admin', NULL, true, false, NULL, '2025-09-12 05:33:44.625037', '2025-09-12 05:33:44.625037'),
(16, 'Benjamin', '123', 'teacher', 14, true, false, NULL, '2025-09-12 12:26:12.754733', '2025-09-12 12:26:12.754733'),
(17, 'cark', '123', 'teacher', 15, true, false, NULL, '2025-09-12 12:27:08.159482', '2025-09-12 12:27:08.159482'),
(18, 'bart', '123456', 'teacher', 16, true, true, '2025-09-13 16:05:33.00607', '2025-09-12 12:27:44.002503', '2025-09-13 16:05:33.00607'),
(19, 'cock', '123', 'teacher', 17, true, false, NULL, '2025-09-13 16:07:39.897524', '2025-09-13 16:08:01.646196');

-- Insert actual courses
INSERT INTO courses (id, name, description, background_image, background_image_public_id, detailed_description, is_active, display_order, created_at, updated_at) VALUES
(2, 'Business English Mastery', 'Advanced business communication skills for professionals. Learn formal writing, presentations, and negotiations.', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757682344/ylt2lrznm2fuobq8wgqv.webp', 'ylt2lrznm2fuobq8wgqv', 'Master the art of professional communication with our Business English course. Perfect for executives, managers, and professionals who need to communicate effectively in international business environments. Learn to write compelling emails, deliver powerful presentations, and negotiate with confidence.', true, 2, '2025-09-09 15:40:10.648121', '2025-09-12 13:05:46.505308'),
(3, 'Chinese Characters and Culture', 'Master Chinese characters while exploring rich cultural traditions. From basic strokes to advanced calligraphy.', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757682353/oeacncizit31x1iuaqex.webp', 'oeacncizit31x1iuaqex', 'Discover the fascinating world of Chinese characters and culture. Learn the fundamental strokes, radicals, and character formation principles while exploring the rich cultural heritage of China. Perfect for those interested in calligraphy, traditional arts, and understanding Chinese culture through its written language.', true, 3, '2025-09-09 15:40:10.648121', '2025-09-12 13:05:54.678001'),
(4, 'Spanish Conversation Club', 'Improve your speaking skills through interactive conversations about current events, culture, and daily life.', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757682360/upvhjjygaloufvibkfdi.webp', 'upvhjjygaloufvibkfdi', 'Join our dynamic Spanish Conversation Club where you will practice speaking through engaging discussions about current events, cultural topics, and everyday situations. Build confidence in your conversational skills while learning about Spanish-speaking cultures around the world.', true, 4, '2025-09-09 15:40:10.648121', '2025-09-12 13:06:01.99498'),
(5, 'Korean K-Pop & Language', 'Learn Korean through music, drama, and pop culture. Fun and engaging approach to language learning.', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757682367/apyg4bbermxkautpcweh.webp', 'apyg4bbermxkautpcweh', 'Immerse yourself in Korean language and culture through K-Pop, K-Dramas, and contemporary Korean media. Learn vocabulary, expressions, and cultural context while enjoying your favorite Korean entertainment. Perfect for K-Pop fans and K-Drama enthusiasts who want to understand the language behind the content they love.', true, 5, '2025-09-09 15:40:10.648121', '2025-09-12 13:06:09.71395'),
(6, 'Russian Literature & Grammar', 'Dive deep into Russian literature while mastering complex grammar structures and advanced vocabulary.', '', NULL, 'Explore the rich world of Russian literature while mastering the complex grammar and vocabulary of the Russian language. Study works by Tolstoy, Dostoevsky, and other great Russian authors while developing advanced language skills. Perfect for literature lovers and those seeking to understand Russian culture through its literary masterpieces.', true, 6, '2025-09-09 15:40:10.648121', '2025-09-12 13:06:14.19896'),
(7, 'Japanese JLPT Preparation', 'Comprehensive preparation for all JLPT levels. Practice tests, vocabulary, and grammar mastery.', '', NULL, 'Prepare thoroughly for the Japanese Language Proficiency Test (JLPT) at any level from N5 to N1. Our comprehensive course covers all aspects of the exam including vocabulary, grammar, reading comprehension, and listening skills. Practice with real exam questions and develop test-taking strategies for success.', true, 7, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(8, 'French Cuisine & Language', 'Learn French through cooking and culinary traditions. Bon appétit!', '', NULL, 'Discover the French language through the delicious world of French cuisine and culinary traditions. Learn vocabulary, expressions, and cultural context while exploring French cooking techniques, regional specialties, and dining etiquette. Perfect for food lovers who want to combine their passion for cooking with language learning.', true, 8, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(9, 'Portuguese for Travelers', 'Essential Portuguese phrases and cultural tips for your next trip to Brazil or Portugal.', '', NULL, 'Master essential Portuguese phrases and cultural insights for your travels to Brazil, Portugal, or other Portuguese-speaking countries. Learn practical vocabulary for transportation, dining, shopping, and emergency situations while understanding cultural norms and etiquette. Perfect for travelers and those planning to visit Portuguese-speaking destinations.', true, 9, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(10, 'Italian Art & History', 'Explore Italian language through the lens of art, history, and Renaissance culture.', '', NULL, 'Discover the beauty of Italian language through art, history, and architecture. Learn Italian while exploring Renaissance masterpieces, ancient Roman history, and architectural wonders. Perfect for art lovers, history enthusiasts, and travelers planning to visit Italy.', true, 10, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(11, 'English for Retards', 'Join our super dooper awesome crash course for retards - learn 5 new words in 2 weeks!', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757757940/cq0vrmzjmsfwaqwhckyr.jpg', 'cq0vrmzjmsfwaqwhckyr', 'Give us your money and fuck off', true, 1, '2025-09-13 10:05:44.71019', '2025-09-13 10:07:14.219949');

-- Insert actual mission content
INSERT INTO mission_content (id, title, content, banner_image, banner_image_public_id, created_at, updated_at) VALUES
(1, 'Our Mission', 'At LangSchool, we believe that language learning should be engaging, practical, and accessible to everyone. Our mission is to break down language barriers and connect people across cultures through innovative teaching methods, experienced instructors, and a supportive learning environment. We are committed to helping our students achieve their language goals while fostering a deeper understanding and appreciation of different cultures around the world.', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757682374/xtqjqjqjqjqjqjqjqjq.webp', 'xtqjqjqjqjqjqjqjqjq', '2025-09-09 15:40:10.648121', '2025-09-12 13:06:20.123456');

-- Insert actual teacher showcase settings
INSERT INTO teacher_showcase_settings (id, display_count, rotation_type, created_at, updated_at) VALUES
(1, 3, 'random', '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121');

-- Insert actual featured teachers
INSERT INTO featured_teachers (id, teacher_id, display_order, created_at, updated_at) VALUES
(1, 13, 1, '2025-09-12 05:33:44.466166', '2025-09-12 05:33:44.466166'),
(2, 14, 2, '2025-09-12 12:26:12.754733', '2025-09-12 12:26:12.754733'),
(3, 15, 3, '2025-09-12 12:27:08.159482', '2025-09-12 12:27:08.159482');

-- Insert actual time slots
INSERT INTO time_slots (id, time_slot, duration_minutes, created_at, updated_at) VALUES
(1, '8:00-8:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(2, '8:30-9:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(3, '9:00-9:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(4, '9:30-10:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(5, '10:00-10:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(6, '10:30-11:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(7, '11:00-11:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(8, '11:30-12:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(9, '12:00-12:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(10, '12:30-13:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(11, '13:00-13:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(12, '13:30-14:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(13, '14:00-14:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(14, '14:30-15:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(15, '15:00-15:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(16, '15:30-16:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(17, '16:00-16:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(18, '16:30-17:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(19, '17:00-17:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(20, '17:30-18:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(21, '18:00-18:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(22, '18:30-19:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(23, '19:00-19:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(24, '19:30-20:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(25, '20:00-20:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(26, '20:30-21:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(27, '21:00-21:30', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121'),
(28, '21:30-22:00', 30, '2025-09-09 15:40:10.648121', '2025-09-09 15:40:10.648121');


-- Insert actual shared files
INSERT INTO shared_files (id, folder_id, original_name, display_name, file_type, file_size, cloudinary_public_id, cloudinary_url, uploaded_by, is_active, download_count, created_at, updated_at) VALUES
(1, 1, 'favicon_io.zip', 'favicon_io', 'unknown', 298641, 'lang-school/files/lang-school/files/favicon_io.zip_1757727635.zip', 'https://res.cloudinary.com/dq5l7sxct/raw/upload/v1757727634/lang-school/files/lang-school/files/favicon_io.zip_1757727635.zip', 15, false, 0, '2025-09-13 01:40:36.360789', '2025-09-13 02:35:47.194774'),
(2, NULL, 'favicon_io.zip', 'favicon_io', 'unknown', 298641, 'lang-school/files/lang-school/files/favicon_io.zip_1757727659.zip', 'https://res.cloudinary.com/dq5l7sxct/raw/upload/v1757727658/lang-school/files/lang-school/files/favicon_io.zip_1757727659.zip', 15, false, 2, '2025-09-13 01:41:00.555333', '2025-09-13 02:35:40.490336'),
(3, 2, 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'romeo-and-juliet_PDF_FolgerShakespeare', 'pdf', 753180, 'lang-school/files/lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757730954.pdf', 'https://res.cloudinary.com/dq5l7sxct/raw/upload/v1757730956/lang-school/files/lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757730954.pdf', 15, false, 0, '2025-09-13 02:35:57.968088', '2025-09-13 02:46:32.556852'),
(4, 2, 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'romeo-and-juliet_PDF_FolgerShakespeare', 'pdf', 753180, 'lang-school/files/lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757731429.pdf', 'https://res.cloudinary.com/dq5l7sxct/raw/upload/v1757731431/lang-school/files/lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757731429.pdf', 15, false, 1, '2025-09-13 02:43:53.060226', '2025-09-13 02:46:32.556852'),
(5, NULL, 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'pdf', 753180, 'lang-school/files/lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757733391.pdf', 'https://res.cloudinary.com/dq5l7sxct/raw/upload/v1757733393/lang-school/files/lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757733391.pdf', 15, false, 6, '2025-09-13 03:16:35.095478', '2025-09-13 03:34:27.695455'),
(6, NULL, 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'pdf', 753180, 'lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757734472.pdf', 'https://res.cloudinary.com/dq5l7sxct/raw/upload/v1757734474/lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757734472.pdf', 15, false, 0, '2025-09-13 03:34:35.681045', '2025-09-13 03:36:36.379954'),
(7, NULL, 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'pdf', 753180, 'lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757734643.pdf', 'https://res.cloudinary.com/dq5l7sxct/raw/upload/v1757734642/lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757734643.pdf', 15, false, 0, '2025-09-13 03:37:24.762983', '2025-09-13 03:41:44.229775'),
(8, NULL, 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'romeo-and-juliet_PDF_FolgerShakespeare.pdf', 'pdf', 753180, 'lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757734908.pdf', 'https://res.cloudinary.com/dq5l7sxct/auto/upload/v1757734907/lang-school/files/romeo-and-juliet_PDF_FolgerShakespeare.pdf_1757734908.pdf', 15, false, 0, '2025-09-13 03:41:49.346294', '2025-09-13 03:56:25.529409'),
(9, NULL, 'Grades 2nd semester.xlsx', 'Grades 2nd semester.xlsx', 'xlsx', 45234, 'lang-school/files/Grades 2nd semester.xlsx_1757735791.xlsx', 'https://res.cloudinary.com/dq5l7sxct/raw/upload/v1757735791/lang-school/files/Grades%202nd%20semester.xlsx_1757735791.xlsx', 15, false, 0, '2025-09-13 03:56:33.22456', '2025-09-13 04:13:22.712061'),
(10, NULL, 'Grades 2nd semester.xlsx', 'Grades 2nd semester.xlsx', 'xlsx', 45234, 'lang-school/files/Grades 2nd semester.xlsx_1757736809.xlsx', 'https://res.cloudinary.com/dq5l7sxct/raw/upload/v1757736810/lang-school/files/Grades%202nd%20semester.xlsx_1757736809.xlsx', 15, true, 0, '2025-09-13 04:13:32.196689', '2025-09-13 04:13:32.196689'),
(11, NULL, 'Cities_and_migration_StudentWorksheet.pdf', 'Cities_and_migration_StudentWorksheet.pdf', 'pdf', 166999, 'lang-school/files/Cities_and_migration_StudentWorksheet.pdf_1757757164', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757757165/lang-school/files/Cities_and_migration_StudentWorksheet.pdf_1757757164.pdf', 15, false, 0, '2025-09-13 09:52:47.168307', '2025-09-13 10:02:14.120096'),
(12, NULL, 'LearnEnglish_Reading-A2-An-email-from-a-friend.pdf', 'LearnEnglish_Reading-A2-An-email-from-a-friend.pdf', 'pdf', 55290, 'lang-school/files/LearnEnglish_Reading-A2-An-email-from-a-friend.pdf_1757759235', 'https://res.cloudinary.com/dq5l7sxct/image/upload/v1757759235/lang-school/files/LearnEnglish_Reading-A2-An-email-from-a-friend.pdf_1757759235.pdf', 15, true, 0, '2025-09-13 10:27:17.233101', '2025-09-13 10:27:17.233101'),
(13, NULL, 'Avril Lavigne - Complicated (Official Instrumental).mp3', 'Avril Lavigne - Complicated (Official Instrumental).mp3', 'mp3', 6116551, 'lang-school/files/Avril Lavigne - Complicated (Official Instrumental).mp3_1757766702', 'https://res.cloudinary.com/dq5l7sxct/video/upload/v1757766704/lang-school/files/Avril%20Lavigne%20-%20Complicated%20%28Official%20Instrumental%29.mp3_1757766702.mp3', 15, true, 0, '2025-09-13 12:31:46.487432', '2025-09-13 12:31:46.487432');

-- 10. GRANT PERMISSIONS (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================