
-- Language School Management System Database Schema
-- Neon PostgreSQL Database Setup

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'teacher');
CREATE TYPE day_of_week AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');

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

-- Student schedules table (weekly schedule assignments)
CREATE TABLE student_schedules (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
    time_slot VARCHAR(20) NOT NULL, -- e.g., "6:30-7:00"
    week_start_date DATE NOT NULL,
    attendance_status VARCHAR(20) DEFAULT 'scheduled' CHECK (attendance_status IN ('scheduled', 'completed', 'absent')),
    attendance_date DATE, -- Date when attendance was marked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, teacher_id, day_of_week, time_slot, week_start_date)
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Create indexes for better performance
CREATE INDEX idx_students_teacher_id ON students(teacher_id);
CREATE INDEX idx_students_added_date ON students(added_date);
CREATE INDEX idx_student_schedules_teacher_week ON student_schedules(teacher_id, week_start_date);
CREATE INDEX idx_student_schedules_student ON student_schedules(student_id);
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_reports_updated_at BEFORE UPDATE ON lesson_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample teachers
INSERT INTO teachers (name, email, photo_url, description) VALUES
('Sarah Johnson', 'sarah.johnson@langschool.com', '/pics/teachers/sarah.jpg', 'Experienced English teacher with 10+ years of experience. Specializes in business English and conversation practice.'),
('Michael Chen', 'michael.chen@langschool.com', '/pics/teachers/michael.jpg', 'Native Mandarin speaker teaching Chinese language and culture. Patient and encouraging teaching style.'),
('Elena Rodriguez', 'elena.rodriguez@langschool.com', '/pics/teachers/elena.jpg', 'Spanish teacher from Madrid with expertise in grammar and pronunciation. Loves teaching through music and culture.'),
('David Kim', 'david.kim@langschool.com', '/pics/teachers/david.jpg', 'Korean language instructor with background in linguistics. Great at explaining complex grammar concepts simply.'),
('Anna Petrov', 'anna.petrov@langschool.com', '/pics/teachers/anna.jpg', 'Russian teacher with PhD in Slavic languages. Specializes in advanced Russian literature and conversation.'),
('Yuki Tanaka', 'yuki.tanaka@langschool.com', '/pics/teachers/yuki.jpg', 'Japanese teacher from Tokyo. Expert in JLPT preparation and cultural exchange. Very patient with beginners.'),
('Pierre Dubois', 'pierre.dubois@langschool.com', '/pics/teachers/pierre.jpg', 'French teacher with passion for French culture and cuisine. Makes learning fun with interactive activities.'),
('Maria Silva', 'maria.silva@langschool.com', '/pics/teachers/maria.jpg', 'Portuguese teacher from Brazil. Specializes in Brazilian Portuguese and business communication.'),
('Giuseppe Rossi', 'giuseppe.rossi@langschool.com', '/pics/teachers/giuseppe.jpg', 'Italian teacher from Rome. Loves teaching through Italian art, history, and delicious food culture.'),
('Hans Mueller', 'hans.mueller@langschool.com', '/pics/teachers/hans.jpg', 'German teacher with engineering background. Great at teaching technical German and business language.');

-- Insert sample students (lessons_per_week will be auto-calculated by trigger)
INSERT INTO students (name, teacher_id, lessons_per_week, added_date) VALUES
-- Students for Sarah Johnson (teacher_id: 1)
('Emma Wilson', 1, 0, '2024-01-15'),
('James Brown', 1, 0, '2024-02-03'),
('Olivia Davis', 1, 0, '2024-01-28'),
('William Miller', 1, 0, '2024-02-10'),
('Sophia Garcia', 1, 0, '2024-01-20'),

-- Students for Michael Chen (teacher_id: 2)
('Alex Zhang', 2, 0, '2024-01-12'),
('Lisa Wang', 2, 0, '2024-02-05'),
('Kevin Liu', 2, 0, '2024-01-25'),
('Jennifer Chen', 2, 0, '2024-02-08'),
('Daniel Wu', 2, 0, '2024-01-30'),

-- Students for Elena Rodriguez (teacher_id: 3)
('Carlos Martinez', 3, 0, '2024-01-18'),
('Isabella Lopez', 3, 0, '2024-02-12'),
('Diego Gonzalez', 3, 0, '2024-01-22'),
('Valentina Perez', 3, 0, '2024-02-15'),
('Santiago Rodriguez', 3, 0, '2024-01-08'),

-- Students for David Kim (teacher_id: 4)
('Min-jun Park', 4, 0, '2024-01-14'),
('So-young Lee', 4, 0, '2024-02-07'),
('Jae-hoon Kim', 4, 0, '2024-01-26'),
('Hye-jin Choi', 4, 0, '2024-02-11'),
('Tae-woo Jung', 4, 0, '2024-01-31'),

-- Students for Anna Petrov (teacher_id: 5)
('Vladimir Petrov', 5, 0, '2024-01-16'),
('Natalia Ivanova', 5, 0, '2024-02-09'),
('Dmitri Volkov', 5, 0, '2024-01-24'),
('Elena Sokolova', 5, 0, '2024-02-13'),
('Sergei Kozlov', 5, 0, '2024-01-29'),

-- Students for Yuki Tanaka (teacher_id: 6)
('Hiroshi Yamamoto', 6, 0, '2024-01-17'),
('Yuki Sato', 6, 0, '2024-02-06'),
('Takeshi Nakamura', 6, 0, '2024-01-27'),
('Akiko Ito', 6, 0, '2024-02-14'),
('Kenji Suzuki', 6, 0, '2024-01-21'),

-- Students for Pierre Dubois (teacher_id: 7)
('Marie Dubois', 7, 0, '2024-01-19'),
('Jean Martin', 7, 0, '2024-02-04'),
('Claire Bernard', 7, 0, '2024-01-23'),
('François Moreau', 7, 0, '2024-02-16'),
('Camille Petit', 7, 0, '2024-01-11'),

-- Students for Maria Silva (teacher_id: 8)
('João Santos', 8, 0, '2024-01-13'),
('Ana Costa', 8, 0, '2024-02-17'),
('Pedro Oliveira', 8, 0, '2024-01-31'),
('Beatriz Ferreira', 8, 0, '2024-02-18'),
('Rafael Almeida', 8, 0, '2024-02-01'),

-- Students for Giuseppe Rossi (teacher_id: 9)
('Marco Bianchi', 9, 0, '2024-02-02'),
('Giulia Romano', 9, 0, '2024-02-19'),
('Alessandro Ferrari', 9, 0, '2024-02-03'),
('Francesca Conti', 9, 0, '2024-02-20'),
('Lorenzo Ricci', 9, 0, '2024-02-04'),

-- Students for Hans Mueller (teacher_id: 10)
('Klaus Weber', 10, 0, '2024-02-05'),
('Greta Schmidt', 10, 0, '2024-02-21'),
('Wolfgang Fischer', 10, 0, '2024-02-06'),
('Ingrid Wagner', 10, 0, '2024-02-22'),
('Helmut Becker', 10, 0, '2024-02-07');

-- Insert admin user (password: admin123)
INSERT INTO users (username, password, role, teacher_id) VALUES
('admin', 'admin123', 'admin', NULL);

-- Insert teacher users (password: teacher123)
INSERT INTO users (username, password, role, teacher_id) VALUES
('sarah.johnson', 'teacher123', 'teacher', 1),
('michael.chen', 'teacher123', 'teacher', 2),
('elena.rodriguez', 'teacher123', 'teacher', 3),
('david.kim', 'teacher123', 'teacher', 4),
('anna.petrov', 'teacher123', 'teacher', 5),
('yuki.tanaka', 'teacher123', 'teacher', 6),
('pierre.dubois', 'teacher123', 'teacher', 7),
('maria.silva', 'teacher123', 'teacher', 8),
('giuseppe.rossi', 'teacher123', 'teacher', 9),
('hans.mueller', 'teacher123', 'teacher', 10);

-- Insert sample courses
INSERT INTO courses (name, description, background_image, detailed_description, display_order) VALUES
('English for Beginners', 'Start your English learning journey with our comprehensive beginner course. Perfect for those with no prior experience.', '/pics/courses/english-beginner.jpg', 'Our English for Beginners course is designed to take you from zero to conversational level in just 6 months. You will learn essential vocabulary, basic grammar structures, and practical phrases for everyday situations. The course includes interactive lessons, pronunciation practice, and real-world scenarios to build your confidence.', 1),
('Business English Mastery', 'Advanced business communication skills for professionals. Learn formal writing, presentations, and negotiations.', '/pics/courses/business-english.jpg', 'Master the art of professional communication with our Business English course. Perfect for executives, managers, and professionals who need to communicate effectively in international business environments. Learn to write compelling emails, deliver powerful presentations, and negotiate with confidence.', 2),
('Chinese Characters and Culture', 'Master Chinese characters while exploring rich cultural traditions. From basic strokes to advanced calligraphy.', '/pics/courses/chinese-culture.jpg', 'Discover the fascinating world of Chinese characters and culture. Learn the fundamental strokes, radicals, and character formation principles while exploring the rich cultural heritage of China. Perfect for those interested in calligraphy, traditional arts, and understanding Chinese culture through its written language.', 3),
('Spanish Conversation Club', 'Improve your speaking skills through interactive conversations about current events, culture, and daily life.', '/pics/courses/spanish-conversation.jpg', 'Join our dynamic Spanish Conversation Club where you will practice speaking through engaging discussions about current events, cultural topics, and everyday situations. Build confidence in your conversational skills while learning about Spanish-speaking cultures around the world.', 4),
('Korean K-Pop & Language', 'Learn Korean through music, drama, and pop culture. Fun and engaging approach to language learning.', '/pics/courses/korean-kpop.jpg', 'Immerse yourself in Korean language and culture through K-Pop, K-Dramas, and contemporary Korean media. Learn vocabulary, expressions, and cultural context while enjoying your favorite Korean entertainment. Perfect for K-Pop fans and K-Drama enthusiasts who want to understand the language behind the content they love.', 5),
('Russian Literature & Grammar', 'Dive deep into Russian literature while mastering complex grammar structures and advanced vocabulary.', '/pics/courses/russian-literature.jpg', 'Explore the rich world of Russian literature while mastering the complex grammar and vocabulary of the Russian language. Study works by Tolstoy, Dostoevsky, and other great Russian authors while developing advanced language skills. Perfect for literature lovers and those seeking to understand Russian culture through its literary masterpieces.', 6),
('Japanese JLPT Preparation', 'Comprehensive preparation for all JLPT levels. Practice tests, vocabulary, and grammar mastery.', '/pics/courses/japanese-jlpt.jpg', 'Prepare thoroughly for the Japanese Language Proficiency Test (JLPT) at any level from N5 to N1. Our comprehensive course covers all aspects of the exam including vocabulary, grammar, reading comprehension, and listening skills. Practice with real exam questions and develop test-taking strategies for success.', 7),
('French Cuisine & Language', 'Learn French through cooking and culinary traditions. Bon appétit!', '/pics/courses/french-cuisine.jpg', 'Discover the French language through the delicious world of French cuisine and culinary traditions. Learn vocabulary, expressions, and cultural context while exploring French cooking techniques, regional specialties, and dining etiquette. Perfect for food lovers who want to combine their passion for cooking with language learning.', 8),
('Portuguese for Travelers', 'Essential Portuguese phrases and cultural tips for your next trip to Brazil or Portugal.', '/pics/courses/portuguese-travel.jpg', 'Master essential Portuguese phrases and cultural insights for your travels to Brazil, Portugal, or other Portuguese-speaking countries. Learn practical vocabulary for transportation, dining, shopping, and emergency situations while understanding cultural norms and etiquette. Perfect for travelers and those planning to visit Portuguese-speaking destinations.', 9),
('Italian Art & History', 'Explore Italian language through the lens of art, history, and Renaissance culture.', '/pics/courses/italian-art.jpg', 'Discover the beauty of Italian language through art, history, and architecture. Learn Italian while exploring Renaissance masterpieces, ancient Roman history, and architectural wonders. Perfect for art lovers, history enthusiasts, and travelers planning to visit Italy.', 10);

-- Insert mission content
INSERT INTO mission_content (title, content, banner_image) VALUES
('Our Mission', 'At LangSchool, we believe that language learning should be engaging, practical, and accessible to everyone. Our mission is to break down language barriers and connect people across cultures through innovative teaching methods, experienced instructors, and a supportive learning environment. We are committed to helping our students achieve their language goals while fostering a deeper understanding and appreciation of different cultures around the world.', '/pics/banners/mission-banner.jpg');

-- Insert teacher showcase settings
INSERT INTO teacher_showcase_settings (display_count, rotation_type) VALUES
(3, 'random');

-- Insert featured teachers (sample)
INSERT INTO featured_teachers (teacher_id, display_order) VALUES
(1, 1),
(2, 2),
(3, 3);

-- Insert sample student schedules for current week
-- Get current week start date (Monday)
WITH current_week AS (
    SELECT DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day' AS week_start
)
INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date)
SELECT 
    s.id,
    s.teacher_id,
    CASE 
        WHEN s.id % 7 = 0 THEN 1  -- Monday
        WHEN s.id % 7 = 1 THEN 2  -- Tuesday
        WHEN s.id % 7 = 2 THEN 3  -- Wednesday
        WHEN s.id % 7 = 3 THEN 4  -- Thursday
        WHEN s.id % 7 = 4 THEN 5  -- Friday
        WHEN s.id % 7 = 5 THEN 6  -- Saturday
        ELSE 0  -- Sunday
    END,
    CASE 
        WHEN s.id % 4 = 0 THEN '9:00-9:30'
        WHEN s.id % 4 = 1 THEN '14:00-14:30'
        WHEN s.id % 4 = 2 THEN '18:00-18:30'
        ELSE '19:30-20:00'
    END,
    (SELECT week_start FROM current_week)
FROM students s
WHERE s.is_active = true
LIMIT 20;

-- Insert sample lesson reports
INSERT INTO lesson_reports (student_id, teacher_id, lesson_date, time_slot, comment) VALUES
(1, 1, CURRENT_DATE - INTERVAL '3 days', '9:00-9:30', 'Great progress with pronunciation! Emma is becoming more confident in speaking. Need to work on past tense forms.'),
(2, 1, CURRENT_DATE - INTERVAL '2 days', '14:00-14:30', 'James completed the homework perfectly. Excellent understanding of present continuous tense.'),
(3, 1, CURRENT_DATE - INTERVAL '1 day', '18:00-18:30', 'Olivia struggled with irregular verbs today. Suggested extra practice exercises. Very motivated student.'),
(4, 2, CURRENT_DATE - INTERVAL '4 days', '9:00-9:30', 'Alex showed great improvement in character recognition. Pinyin pronunciation needs work.'),
(5, 2, CURRENT_DATE - INTERVAL '3 days', '14:00-14:30', 'Lisa mastered the basic greetings perfectly. Ready to move to next chapter.'),
(6, 3, CURRENT_DATE - INTERVAL '2 days', '18:00-18:30', 'Carlos has excellent listening skills. Need to practice more writing exercises.'),
(7, 3, CURRENT_DATE - INTERVAL '1 day', '19:30-20:00', 'Isabella is very shy but making good progress. Encouraged more participation.'),
(8, 4, CURRENT_DATE - INTERVAL '5 days', '9:00-9:30', 'Min-jun is very dedicated. Completed all homework and asked great questions.'),
(9, 4, CURRENT_DATE - INTERVAL '4 days', '14:00-14:30', 'So-young needs more practice with Korean sentence structure. Very polite student.'),
(10, 5, CURRENT_DATE - INTERVAL '3 days', '18:00-18:30', 'Vladimir has strong grammar foundation. Working on improving conversation skills.');

-- Create view for easy schedule queries
CREATE VIEW weekly_schedule AS
SELECT 
    ss.id,
    s.name as student_name,
    t.name as teacher_name,
    ss.day_of_week,
    ss.time_slot,
    ss.week_start_date,
    CASE ss.day_of_week
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE s.is_active = true;

-- Create view for lesson statistics
CREATE VIEW lesson_statistics AS
SELECT 
    s.id as student_id,
    s.name as student_name,
    t.name as teacher_name,
    COUNT(ss.id) as total_lessons_scheduled,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'scheduled' THEN 1 END) as pending_lessons,
    COUNT(sl.id) as total_lessons_taken_ever,
    s.lessons_per_week,
    s.added_date,
    ROUND(
        (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(ss.id), 0)) * 100, 2
    ) as attendance_percentage
FROM students s
LEFT JOIN teachers t ON s.teacher_id = t.id
LEFT JOIN student_schedules ss ON s.id = ss.student_id
LEFT JOIN student_lessons sl ON s.id = sl.student_id
WHERE s.is_active = true
GROUP BY s.id, s.name, t.name, s.lessons_per_week, s.added_date;

-- Create view for teacher monthly statistics
CREATE VIEW teacher_monthly_stats AS
SELECT 
    t.id as teacher_id,
    t.name as teacher_name,
    t.email as teacher_email,
    DATE_TRUNC('month', ss.attendance_date) as month_year,
    EXTRACT(YEAR FROM ss.attendance_date) as year,
    EXTRACT(MONTH FROM ss.attendance_date) as month,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(ss.id) as total_lessons,
    ROUND(
        (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(ss.id), 0)) * 100, 2
    ) as attendance_percentage,
    COUNT(DISTINCT s.id) as unique_students_taught
FROM teachers t
LEFT JOIN student_schedules ss ON t.id = ss.teacher_id 
    AND ss.attendance_status IN ('completed', 'absent')
    AND ss.attendance_date IS NOT NULL
LEFT JOIN students s ON ss.student_id = s.id AND s.is_active = true
WHERE t.is_active = true
GROUP BY t.id, t.name, t.email, DATE_TRUNC('month', ss.attendance_date), 
         EXTRACT(YEAR FROM ss.attendance_date), EXTRACT(MONTH FROM ss.attendance_date)
ORDER BY t.id, month_year DESC;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Add some useful functions for the application

-- Function to get current week start (Monday)
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
    RETURN DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Function to get week start for any given date
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN DATE_TRUNC('week', input_date) + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Function to get students for a specific teacher and week
CREATE OR REPLACE FUNCTION get_teacher_schedule(teacher_id_param INTEGER, week_start_param DATE)
RETURNS TABLE (
    student_id INTEGER,
    student_name VARCHAR,
    day_of_week INTEGER,
    time_slot VARCHAR,
    day_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        ss.day_of_week,
        ss.time_slot,
        CASE ss.day_of_week
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
        END
    FROM student_schedules ss
    JOIN students s ON ss.student_id = s.id
    WHERE ss.teacher_id = teacher_id_param 
    AND ss.week_start_date = week_start_param
    AND s.is_active = true
    ORDER BY ss.day_of_week, ss.time_slot;
END;
$$ LANGUAGE plpgsql;

-- Function to get teacher monthly statistics
CREATE OR REPLACE FUNCTION get_teacher_monthly_stats(teacher_id_param INTEGER, year_param INTEGER, month_param INTEGER)
RETURNS TABLE (
    teacher_id INTEGER,
    teacher_name VARCHAR,
    year INTEGER,
    month INTEGER,
    completed_lessons BIGINT,
    absent_lessons BIGINT,
    total_lessons BIGINT,
    attendance_percentage NUMERIC,
    unique_students_taught BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        EXTRACT(YEAR FROM ss.attendance_date)::INTEGER,
        EXTRACT(MONTH FROM ss.attendance_date)::INTEGER,
        COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END),
        COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END),
        COUNT(ss.id),
        ROUND(
            (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(ss.id), 0)) * 100, 2
        ),
        COUNT(DISTINCT s.id)
    FROM teachers t
    LEFT JOIN student_schedules ss ON t.id = ss.teacher_id 
        AND ss.attendance_status IN ('completed', 'absent')
        AND ss.attendance_date IS NOT NULL
        AND EXTRACT(YEAR FROM ss.attendance_date) = year_param
        AND EXTRACT(MONTH FROM ss.attendance_date) = month_param
    LEFT JOIN students s ON ss.student_id = s.id AND s.is_active = true
    WHERE t.id = teacher_id_param
    GROUP BY t.id, t.name, EXTRACT(YEAR FROM ss.attendance_date), EXTRACT(MONTH FROM ss.attendance_date);
END;
$$ LANGUAGE plpgsql;

-- Insert some additional sample data for different weeks
INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date)
SELECT 
    s.id,
    s.teacher_id,
    CASE 
        WHEN s.id % 7 = 0 THEN 1  -- Monday
        WHEN s.id % 7 = 1 THEN 2  -- Tuesday
        WHEN s.id % 7 = 2 THEN 3  -- Wednesday
        WHEN s.id % 7 = 3 THEN 4  -- Thursday
        WHEN s.id % 7 = 4 THEN 5  -- Friday
        WHEN s.id % 7 = 5 THEN 6  -- Saturday
        ELSE 0  -- Sunday
    END,
    CASE 
        WHEN s.id % 4 = 0 THEN '10:00-10:30'
        WHEN s.id % 4 = 1 THEN '15:00-15:30'
        WHEN s.id % 4 = 2 THEN '17:00-17:30'
        ELSE '20:00-20:30'
    END,
    (SELECT get_current_week_start() + INTERVAL '7 days') -- Next week
FROM students s
WHERE s.is_active = true
LIMIT 15;

-- Add some more lesson reports for variety
INSERT INTO lesson_reports (student_id, teacher_id, lesson_date, time_slot, comment) VALUES
(11, 6, CURRENT_DATE - INTERVAL '6 days', '9:00-9:30', 'Hiroshi is very enthusiastic about learning Japanese. Great progress with hiragana.'),
(12, 6, CURRENT_DATE - INTERVAL '5 days', '14:00-14:30', 'Yuki needs more practice with particle usage. Very polite and respectful student.'),
(13, 7, CURRENT_DATE - INTERVAL '4 days', '18:00-18:30', 'Marie has excellent French pronunciation. Working on expanding vocabulary.'),
(14, 7, CURRENT_DATE - INTERVAL '3 days', '19:30-20:00', 'Jean completed the grammar exercises perfectly. Ready for more advanced topics.'),
(15, 8, CURRENT_DATE - INTERVAL '2 days', '9:00-9:30', 'João shows great interest in Brazilian culture. Portuguese pronunciation is improving.'),
(16, 8, CURRENT_DATE - INTERVAL '1 day', '14:00-14:30', 'Ana is very organized with her studies. Excellent homework completion rate.'),
(17, 9, CURRENT_DATE - INTERVAL '7 days', '18:00-18:30', 'Marco loves Italian art and history. This helps with vocabulary learning.'),
(18, 9, CURRENT_DATE - INTERVAL '6 days', '19:30-20:00', 'Giulia has a natural talent for languages. Very quick learner.'),
(19, 10, CURRENT_DATE - INTERVAL '5 days', '9:00-9:30', 'Klaus is very methodical in his approach. German grammar is strong.'),
(20, 10, CURRENT_DATE - INTERVAL '4 days', '14:00-14:30', 'Greta needs more confidence in speaking. Writing skills are excellent.');

-- Final statistics query to verify data
SELECT 
    'Teachers' as table_name, 
    COUNT(*) as record_count 
FROM teachers
UNION ALL
SELECT 
    'Students' as table_name, 
    COUNT(*) as record_count 
FROM students
UNION ALL
SELECT 
    'Users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'Student Schedules' as table_name, 
    COUNT(*) as record_count 
FROM student_schedules
UNION ALL
SELECT 
    'Lesson Reports' as table_name, 
    COUNT(*) as record_count 
FROM lesson_reports
UNION ALL
SELECT 
    'Courses' as table_name, 
    COUNT(*) as record_count 
FROM courses;

-- Create function for admin to change teacher password
CREATE OR REPLACE FUNCTION admin_change_teacher_password(
    teacher_id_param INTEGER,
    new_password VARCHAR(255),
    admin_user_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if teacher user exists
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE teacher_id = teacher_id_param 
        AND role = 'teacher' 
        AND is_active = true
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update teacher password
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

-- Create function for admin to get teacher password
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


-- new changes for Recurring_Schedule_Plan.md

BEGIN;

-- Ensure updated_at helper function exists (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 0) Attendance: extend enum-like check to include absent_warned
ALTER TABLE student_schedules DROP CONSTRAINT IF EXISTS student_schedules_attendance_status_check;
ALTER TABLE student_schedules
  ADD CONSTRAINT student_schedules_attendance_status_check
  CHECK (attendance_status IN ('scheduled','completed','absent','absent_warned'));

-- 1) Add recurrence/history columns + updated_at (if missing)
ALTER TABLE student_schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE student_schedules ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE student_schedules ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE student_schedules ADD COLUMN IF NOT EXISTS original_teacher_id INTEGER REFERENCES teachers(id);
ALTER TABLE student_schedules ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50) DEFAULT 'weekly';

-- 2) Add updated_at trigger for student_schedules (idempotent)
DROP TRIGGER IF EXISTS update_student_schedules_updated_at ON student_schedules;
CREATE TRIGGER update_student_schedules_updated_at BEFORE UPDATE ON student_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3) Ensure idempotency on student_lessons (avoid double counting)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_lesson'
  ) THEN
    ALTER TABLE student_lessons
      ADD CONSTRAINT unique_student_lesson UNIQUE (student_id, lesson_date, time_slot);
  END IF;
END $$;

-- 4) Day-of-week mapping migration (optional but recommended)
-- Current DB likely uses Sunday=0; target uses Monday=0.
-- Remap existing data: 0..6 (Sun..Sat) -> 0..6 (Mon..Sun)
-- Formula: new = (old + 6) % 7
UPDATE student_schedules
SET day_of_week = (day_of_week + 6) % 7;

-- 5) Recreate weekly_schedule with Monday=0 and extra columns
DROP VIEW IF EXISTS weekly_schedule;
CREATE VIEW weekly_schedule AS
SELECT 
    ss.id,
    s.name as student_name,
    t.name as teacher_name,
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
WHERE s.is_active = true;

-- 6) Recreate lesson_statistics (adds warned_absences, adjusted percentage)
DROP VIEW IF EXISTS lesson_statistics;
CREATE VIEW lesson_statistics AS
SELECT 
    s.id as student_id,
    s.name as student_name,
    t.name as teacher_name,
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
LEFT JOIN teachers t ON s.teacher_id = t.id
LEFT JOIN student_schedules ss ON s.id = ss.student_id
LEFT JOIN student_lessons sl ON s.id = sl.student_id
WHERE s.is_active = true
GROUP BY s.id, s.name, t.name, s.lessons_per_week, s.added_date;

-- 7) Recreate teacher_monthly_stats (adds warned_absences, adjusted totals/percentage)
DROP VIEW IF EXISTS teacher_monthly_stats;
CREATE VIEW teacher_monthly_stats AS
SELECT 
    t.id as teacher_id,
    t.name as teacher_name,
    t.email as teacher_email,
    DATE_TRUNC('month', ss.attendance_date) as month_year,
    EXTRACT(YEAR FROM ss.attendance_date) as year,
    EXTRACT(MONTH FROM ss.attendance_date) as month,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as warned_absences,
    (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)
     + COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END)) as total_lessons,
    ROUND(
        (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(
           (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)
            + COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END)), 0)) * 100, 2
    ) as attendance_percentage,
    COUNT(DISTINCT s.id) as unique_students_taught
FROM teachers t
LEFT JOIN student_schedules ss ON t.id = ss.teacher_id 
    AND ss.attendance_status IN ('completed', 'absent', 'absent_warned')
    AND ss.attendance_date IS NOT NULL
LEFT JOIN students s ON ss.student_id = s.id AND s.is_active = true
WHERE t.is_active = true
GROUP BY t.id, t.name, t.email, DATE_TRUNC('month', ss.attendance_date), 
         EXTRACT(YEAR FROM ss.attendance_date), EXTRACT(MONTH FROM ss.attendance_date)
ORDER BY t.id, month_year DESC;

COMMIT;

-- REQUIRED: Add recurring templates and audit history tables
BEGIN;

-- Ensure updated_at helper function exists (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- schedule_templates: recurring pattern per student/teacher/day/time
CREATE TABLE IF NOT EXISTS schedule_templates (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time_slot VARCHAR(20) NOT NULL,
  lessons_per_week INTEGER DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_template UNIQUE (student_id, teacher_id, day_of_week, time_slot, start_date)
);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_student ON schedule_templates(student_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_teacher ON schedule_templates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON schedule_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_dates ON schedule_templates(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_student_active ON schedule_templates(student_id, is_active);

DROP TRIGGER IF EXISTS update_schedule_templates_updated_at ON schedule_templates;
CREATE TRIGGER update_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- schedule_history: audit log of changes to student_schedules
CREATE TABLE IF NOT EXISTS schedule_history (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES student_schedules(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('created','updated','reassigned','cancelled','deleted')),
  old_teacher_id INTEGER REFERENCES teachers(id),
  new_teacher_id INTEGER REFERENCES teachers(id),
  changed_by INTEGER REFERENCES users(id),
  change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_schedule_history_schedule ON schedule_history(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_history_action ON schedule_history(action);
CREATE INDEX IF NOT EXISTS idx_schedule_history_date ON schedule_history(change_date);
CREATE INDEX IF NOT EXISTS idx_schedule_history_teacher ON schedule_history(old_teacher_id, new_teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_history_schedule_action ON schedule_history(schedule_id, action);
-- Removed partial index using CURRENT_DATE (not IMMUTABLE). Use the simple date index above.

COMMIT;

-- Multiple Lesson Scheduling Enhancements
-- Migration: 2025-01-15_multiple_lesson_enhancements.sql

BEGIN;

-- 2. Add lesson type classification to student_schedules
ALTER TABLE student_schedules 
ADD COLUMN lesson_type VARCHAR(20) DEFAULT 'scheduled' 
CHECK (lesson_type IN ('scheduled', 'completed', 'cancelled', 'template'));

-- 3. Add template reference to student_schedules
ALTER TABLE student_schedules 
ADD COLUMN template_id INTEGER REFERENCES schedule_templates(id);

-- 4. Create time_slots table for systematic time management
CREATE TABLE time_slots (
  id SERIAL PRIMARY KEY,
  time_slot VARCHAR(20) NOT NULL UNIQUE, -- e.g., "6:30-7:00"
  duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Insert standard time slots (6:30-22:00)
INSERT INTO time_slots (time_slot, duration_minutes) VALUES
('6:30-7:00', 30), ('7:00-7:30', 30), ('7:30-8:00', 30), ('8:00-8:30', 30),
('8:30-9:00', 30), ('9:00-9:30', 30), ('9:30-10:00', 30), ('10:00-10:30', 30),
('10:30-11:00', 30), ('11:00-11:30', 30), ('11:30-12:00', 30), ('12:00-12:30', 30),
('12:30-13:00', 30), ('13:00-13:30', 30), ('13:30-14:00', 30), ('14:00-14:30', 30),
('14:30-15:00', 30), ('15:00-15:30', 30), ('15:30-16:00', 30), ('16:00-16:30', 30),
('16:30-17:00', 30), ('17:00-17:30', 30), ('17:30-18:00', 30), ('18:00-18:30', 30),
('18:30-19:00', 30), ('19:00-19:30', 30), ('19:30-20:00', 30), ('20:00-20:30', 30),
('20:30-21:00', 30), ('21:00-21:30', 30), ('21:30-22:00', 30);

-- 6. Add performance indexes
CREATE INDEX idx_student_schedules_lesson_type ON student_schedules(lesson_type);
CREATE INDEX idx_student_schedules_template ON student_schedules(template_id);
CREATE INDEX idx_time_slots_active ON time_slots(is_active);
CREATE INDEX idx_time_slots_slot ON time_slots(time_slot);

-- 7. Update existing student_schedules to have proper lesson_type
UPDATE student_schedules 
SET lesson_type = CASE 
  WHEN attendance_status = 'completed' THEN 'completed'
  WHEN attendance_status = 'absent' THEN 'scheduled'
  ELSE 'scheduled'
END;

COMMIT;

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
    UNIQUE(student_id, teacher_id)
);

-- Create partial unique index to ensure only one primary teacher per student
CREATE UNIQUE INDEX idx_student_teachers_unique_primary 
ON student_teachers (student_id) 
WHERE is_primary = true;
```

### Modified Tables
```sql
-- Add primary teacher reference
ALTER TABLE students ADD COLUMN primary_teacher_id INTEGER REFERENCES teachers(id);
ALTER TABLE students ADD COLUMN teacher_count INTEGER DEFAULT 0;

-- Add primary teacher reference to schedules
ALTER TABLE student_schedules ADD COLUMN primary_teacher_id INTEGER REFERENCES teachers(id);

-- Migration: Fix to Monday=0 Mapping (CORRECT VERSION)
-- Date: 2025-01-15
-- Description: Change all day_of_week values from Sunday=0 to Monday=0 mapping

BEGIN;

-- 1. Update attendance status constraint to include absent_warned
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS student_schedules_attendance_status_check;

ALTER TABLE student_schedules
ADD CONSTRAINT student_schedules_attendance_status_check
CHECK (attendance_status IN ('scheduled','completed','absent','absent_warned'));

-- 2. First, update time_slots table with correct 8:00-21:30 range
DELETE FROM time_slots;

INSERT INTO time_slots (time_slot, duration_minutes) VALUES
('8:00-8:30', 30), ('8:30-9:00', 30), ('9:00-9:30', 30), ('9:30-10:00', 30),
('10:00-10:30', 30), ('10:30-11:00', 30), ('11:00-11:30', 30), ('11:30-12:00', 30),
('12:00-12:30', 30), ('12:30-13:00', 30), ('13:00-13:30', 30), ('13:30-14:00', 30),
('14:00-14:30', 30), ('14:30-15:00', 30), ('15:00-15:30', 30), ('15:30-16:00', 30),
('16:00-16:30', 30), ('16:30-17:00', 30), ('17:00-17:30', 30), ('17:30-18:00', 30),
('18:00-18:30', 30), ('18:30-19:00', 30), ('19:00-19:30', 30), ('19:30-20:00', 30),
('20:00-20:30', 30), ('20:30-21:00', 30), ('21:00-21:30', 30), ('21:30-22:00', 30);

-- 3. Now migrate student_schedules time slots to match time_slots table
UPDATE student_schedules 
SET time_slot = CASE 
    -- Map early morning slots to 8:00+ range
    WHEN time_slot = '6:30-7:00' THEN '8:00-8:30'
    WHEN time_slot = '7:00-7:30' THEN '8:30-9:00'
    WHEN time_slot = '7:30-8:00' THEN '9:00-9:30'
    -- Keep existing valid time slots as-is
    WHEN time_slot IN ('8:00-8:30', '8:30-9:00', '9:00-9:30', '9:30-10:00', '10:00-10:30', '10:30-11:00', 
                       '11:00-11:30', '11:30-12:00', '12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00',
                       '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00',
                       '17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00',
                       '20:00-20:30', '20:30-21:00', '21:00-21:30', '21:30-22:00')
    THEN time_slot
    -- Handle any other invalid time slots by setting to a default valid time
    ELSE '8:00-8:30'
END;

-- 4. Add foreign key constraint to reference time_slots table
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS fk_student_schedules_time_slot;

ALTER TABLE student_schedules
ADD CONSTRAINT fk_student_schedules_time_slot 
FOREIGN KEY (time_slot) REFERENCES time_slots(time_slot);

-- 3. Update database week start functions to ensure Monday start
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
  -- Ensure Monday start: DATE_TRUNC('week', date) returns Monday of the week
  RETURN DATE_TRUNC('week', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  -- Ensure Monday start: DATE_TRUNC('week', date) returns Monday of the week
  RETURN DATE_TRUNC('week', input_date);
END;
$$ LANGUAGE plpgsql;

-- 4. Migrate existing day_of_week values from Sunday=0 to Monday=0
-- Current: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- Target:  0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
-- Formula: new = (old + 6) % 7
UPDATE student_schedules 
SET day_of_week = (day_of_week + 6) % 7;

-- 5. Update table comment to reflect Monday=0 mapping
COMMENT ON COLUMN student_schedules.day_of_week IS 'Day of week: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday';

-- 6. Recreate views with Monday=0 mapping
DROP VIEW IF EXISTS weekly_schedule CASCADE;
CREATE VIEW weekly_schedule AS
SELECT 
    ss.id,
    s.name as student_name,
    t.name as teacher_name,
    ss.day_of_week,
    ss.time_slot,
    ss.week_start_date,
    CASE ss.day_of_week
        WHEN 0 THEN 'Monday'    -- 0 = Monday (CORRECT)
        WHEN 1 THEN 'Tuesday'   -- 1 = Tuesday (CORRECT)
        WHEN 2 THEN 'Wednesday' -- 2 = Wednesday (CORRECT)
        WHEN 3 THEN 'Thursday'  -- 3 = Thursday (CORRECT)
        WHEN 4 THEN 'Friday'    -- 4 = Friday (CORRECT)
        WHEN 5 THEN 'Saturday'  -- 5 = Saturday (CORRECT)
        WHEN 6 THEN 'Sunday'    -- 6 = Sunday (CORRECT)
    END as day_name
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE s.is_active = true;

-- 7. Recreate lesson_statistics view
DROP VIEW IF EXISTS lesson_statistics CASCADE;
CREATE VIEW lesson_statistics AS
SELECT 
    s.id as student_id,
    s.name as student_name,
    t.name as teacher_name,
    COUNT(ss.id) as total_lessons_scheduled,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'scheduled' THEN 1 END) as pending_lessons,
    COUNT(sl.id) as total_lessons_taken_ever,
    s.lessons_per_week,
    s.added_date,
    ROUND(
        (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(ss.id), 0)) * 100, 2
    ) as attendance_percentage
FROM students s
LEFT JOIN teachers t ON s.teacher_id = t.id
LEFT JOIN student_schedules ss ON s.id = ss.student_id
LEFT JOIN student_lessons sl ON s.id = sl.student_id
WHERE s.is_active = true
GROUP BY s.id, s.name, t.name, s.lessons_per_week, s.added_date;

-- 8. Recreate teacher_monthly_stats view
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;
CREATE VIEW teacher_monthly_stats AS
SELECT 
    t.id as teacher_id,
    t.name as teacher_name,
    t.email as teacher_email,
    DATE_TRUNC('month', ss.attendance_date) as month_year,
    EXTRACT(YEAR FROM ss.attendance_date) as year,
    EXTRACT(MONTH FROM ss.attendance_date) as month,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent_warned' THEN 1 END) as absent_warned_lessons,
    COUNT(ss.id) as total_lessons,
    ROUND(
        (COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(ss.id), 0)) * 100, 2
    ) as attendance_percentage,
    COUNT(DISTINCT s.id) as unique_students_taught
FROM teachers t
LEFT JOIN student_schedules ss ON t.id = ss.teacher_id 
    AND ss.attendance_status IN ('completed', 'absent', 'absent_warned')
    AND ss.attendance_date IS NOT NULL
LEFT JOIN students s ON ss.student_id = s.id AND s.is_active = true
WHERE t.is_active = true
GROUP BY t.id, t.name, t.email, DATE_TRUNC('month', ss.attendance_date), 
         EXTRACT(YEAR FROM ss.attendance_date), EXTRACT(MONTH FROM ss.attendance_date)
ORDER BY t.id, month_year DESC;

-- 9. Time slots already migrated above

-- 10. Verify the migration
SELECT 
    'Day of week distribution after migration' as check_type,
    day_of_week,
    CASE day_of_week
        WHEN 0 THEN 'Monday (should be 0)'
        WHEN 1 THEN 'Tuesday (should be 1)'
        WHEN 2 THEN 'Wednesday (should be 2)'
        WHEN 3 THEN 'Thursday (should be 3)'
        WHEN 4 THEN 'Friday (should be 4)'
        WHEN 5 THEN 'Saturday (should be 5)'
        WHEN 6 THEN 'Sunday (should be 6)'
    END as day_name,
    COUNT(*) as count
FROM student_schedules 
GROUP BY day_of_week 
ORDER BY day_of_week;

COMMIT;

CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  -- If input is Sunday (day 0), return Monday of the SAME week
  -- Otherwise, return Monday of the week containing the date
  IF EXTRACT(DOW FROM input_date) = 0 THEN
    -- Sunday: return Monday of the same week (6 days ago)
    RETURN input_date - INTERVAL '6 days';
  ELSE
    -- Other days: return Monday of the week containing the date
    RETURN DATE_TRUNC('week', input_date);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ======= Schedule Management Enhancement Migration =======
-- Date: 2025-01-15
-- Description: Enhanced schedule management with improved data integrity, audit trails, and business logic enforcement
-- Author: AI Assistant

BEGIN;

-- ======= 1) Defensive / idempotent schema changes =======

-- 1.1 Add is_active to student_schedules
ALTER TABLE student_schedules
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 1.2 Update schedule_history action constraint to include 'completed'
ALTER TABLE schedule_history
  DROP CONSTRAINT IF EXISTS schedule_history_action_check;

ALTER TABLE schedule_history
  ADD CONSTRAINT schedule_history_action_check
  CHECK (action IN ('created','updated','reassigned','cancelled','deleted','completed'));

-- 1.2 Add cancellation fields to schedule_templates
ALTER TABLE schedule_templates
  ADD COLUMN IF NOT EXISTS cancellation_date DATE,
  ADD COLUMN IF NOT EXISTS cancellation_note TEXT;

-- 1.3 Ensure unique constraint on student_lessons exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_lesson'
  ) THEN
    ALTER TABLE student_lessons
      ADD CONSTRAINT unique_student_lesson UNIQUE (student_id, lesson_date, time_slot);
  END IF;
END $$;

-- 1.4 Ensure consistent "status" usage:
-- We will treat attendance_status as authoritative for attendance lifecycle.
-- Keep lesson_type for classification (already exists). No change needed here,
-- but later code will update both in a controlled manner.

-- ======= 2) Triggers to protect past records (no deletes of past occurrences) =======

CREATE OR REPLACE FUNCTION protect_past_schedules_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- prevent hard delete of past occurrences
  IF OLD.week_start_date < DATE_TRUNC('week', CURRENT_DATE) THEN
    RAISE EXCEPTION 'Cannot delete past schedule occurrence id=% - keep for audit', OLD.id;
  END IF;

  -- For future schedules, we prefer soft-delete via is_active=false.
  -- If application attempts to delete, allow it (optional). Here we allow delete only for future records.
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_past_schedules_delete ON student_schedules;
CREATE TRIGGER trg_protect_past_schedules_delete
  BEFORE DELETE ON student_schedules
  FOR EACH ROW EXECUTE FUNCTION protect_past_schedules_before_delete();

-- ======= 3) Functions: creation, extension, cancel, complete =======

-- Utility: compute actual lesson_date from week_start_date + day_of_week
-- (day_of_week is integer with Monday=0)
CREATE OR REPLACE FUNCTION schedule_lesson_date(p_week_start DATE, p_day_of_week INTEGER)
RETURNS DATE AS $$
BEGIN
  RETURN (p_week_start + (p_day_of_week * INTERVAL '1 day'))::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3.1 Create occurrences for a single template for the next N weeks (idempotent)
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
  gen_start := GREATEST(tpl.start_date, DATE_TRUNC('week', CURRENT_DATE))::DATE;
  gen_end := (gen_start + (p_weeks_ahead * INTERVAL '7 days'))::DATE;

  IF tpl.end_date IS NOT NULL AND tpl.end_date < gen_end THEN
    gen_end := tpl.end_date;
  END IF;

  wk := gen_start;
  WHILE wk <= gen_end LOOP
    week_start := DATE_TRUNC('week', wk)::DATE;
    -- Insert occurrence if not exists (avoid duplicates)
    INSERT INTO student_schedules (
      student_id, teacher_id, day_of_week, time_slot, week_start_date,
      is_recurring, end_date, original_teacher_id, template_id, lesson_type, attendance_status,
      is_active, created_at, updated_at
    )
    SELECT tpl.student_id, tpl.teacher_id, tpl.day_of_week, tpl.time_slot, week_start,
           TRUE, tpl.end_date, tpl.teacher_id, tpl.id, 'scheduled', 'scheduled',
           TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM student_schedules ss
      WHERE ss.student_id = tpl.student_id
        AND ss.teacher_id = tpl.teacher_id
        AND ss.day_of_week = tpl.day_of_week
        AND ss.time_slot = tpl.time_slot
        AND ss.week_start_date = week_start
        -- If there's an existing cancelled/explicit row for the same template, do not override it.
        AND ss.template_id = tpl.id
    );

    wk := wk + INTERVAL '7 days';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Bulk extend all templates (call from cron/job)
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

-- 3.3 Cancel template: deactivate template and soft-cancel future occurrences (idempotent)
CREATE OR REPLACE FUNCTION cancel_template_and_future_occurrences(
  p_template_id INT,
  p_cancelled_by INT,               -- user id
  p_note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_week_start DATE := DATE_TRUNC('week', CURRENT_DATE);
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

-- 3.4 Mark schedule occurrence as completed (idempotent).
-- This updates student_schedules and inserts into student_lessons (ledger).
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

-- ======= 4) Trigger: on schedule_templates insert, materialize near-term occurrences =======
-- Use AFTER INSERT trigger to create the first N weeks occurrences (e.g., 12).
CREATE OR REPLACE FUNCTION trg_schedule_template_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create occurrences for the next 12 weeks
  PERFORM create_occurrences_from_template(NEW.id, 12);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schedule_template_after_insert ON schedule_templates;
CREATE TRIGGER schedule_template_after_insert
  AFTER INSERT ON schedule_templates
  FOR EACH ROW EXECUTE FUNCTION trg_schedule_template_after_insert();

-- ======= 5) Prevent accidental direct updates that break invariants =======

-- 5.1 Optional trigger to enforce consistency: when marking attendance_status = 'completed', set lesson_type = 'completed' and ensure attendance_date is set
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

DROP TRIGGER IF EXISTS trg_enforce_schedule_status_consistency ON student_schedules;
CREATE TRIGGER trg_enforce_schedule_status_consistency
  BEFORE INSERT OR UPDATE ON student_schedules
  FOR EACH ROW EXECUTE FUNCTION enforce_schedule_status_consistency();

-- ======= 6) Helpful view for backend/UI: upcoming schedule (active only) =======
DROP VIEW IF EXISTS upcoming_schedule_view;
CREATE VIEW upcoming_schedule_view AS
SELECT 
  ss.id,
  s.id as student_id,
  s.name as student_name,
  t.id as teacher_id,
  t.name as teacher_name,
  ss.day_of_week,
  ss.time_slot,
  ss.week_start_date,
  ss.attendance_status,
  ss.lesson_type,
  ss.template_id,
  ss.is_active,
  schedule_lesson_date(ss.week_start_date, ss.day_of_week) as lesson_date
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = TRUE
  AND ss.week_start_date >= DATE_TRUNC('week', CURRENT_DATE)
ORDER BY ss.week_start_date, ss.day_of_week, ss.time_slot;

-- ======= 7) Update existing records to set is_active = TRUE =======
UPDATE student_schedules SET is_active = TRUE WHERE is_active IS NULL;

-- ======= 8) Create indexes for performance =======
CREATE INDEX IF NOT EXISTS idx_student_schedules_is_active ON student_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_student_schedules_template_active ON student_schedules(template_id, is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON schedule_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_cancellation ON schedule_templates(cancellation_date);

-- ======= 9) Add comments for documentation =======
COMMENT ON COLUMN student_schedules.is_active IS 'Soft delete flag - FALSE means cancelled/inactive';
COMMENT ON COLUMN schedule_templates.cancellation_date IS 'Date when template was cancelled';
COMMENT ON COLUMN schedule_templates.cancellation_note IS 'Reason for template cancellation';
COMMENT ON FUNCTION schedule_lesson_date IS 'Calculate actual lesson date from week start and day of week';
COMMENT ON FUNCTION create_occurrences_from_template IS 'Idempotent function to create schedule occurrences from template';
COMMENT ON FUNCTION cancel_template_and_future_occurrences IS 'Safely cancel template and future occurrences, preserving past records';
COMMENT ON FUNCTION mark_schedule_completed IS 'Atomically mark schedule as completed and create ledger entry';
COMMENT ON VIEW upcoming_schedule_view IS 'Active upcoming schedule for UI display';

-- ======= 10) Safety notes: explicit commit not required; script end =======

COMMIT;

-- ======= Post-migration validation queries =======
-- Run these to verify the migration was successful:

-- Check that is_active column was added and populated
-- SELECT COUNT(*) as total_schedules, 
--        COUNT(*) FILTER (WHERE is_active = TRUE) as active_schedules,
--        COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_schedules
-- FROM student_schedules;

-- Check that new functions exist
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('schedule_lesson_date', 'create_occurrences_from_template', 'cancel_template_and_future_occurrences', 'mark_schedule_completed');

-- Check that triggers exist
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' 
-- AND trigger_name IN ('trg_protect_past_schedules_delete', 'schedule_template_after_insert', 'trg_enforce_schedule_status_consistency');

-- Check that view exists
-- SELECT table_name, table_type 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name = 'upcoming_schedule_view';
-- ======= 7) Optimized delete function for future lessons =======
CREATE OR REPLACE FUNCTION delete_future_lesson(
    schedule_id_param INTEGER,
    deleted_by_user_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    schedule_rec RECORD;
BEGIN
    SELECT * INTO schedule_rec
    FROM student_schedules
    WHERE id = schedule_id_param;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- If lesson is in the past, do nothing
    IF schedule_rec.week_start_date < CURRENT_DATE THEN
        INSERT INTO schedule_history(
            schedule_id,
            action,
            old_teacher_id,
            changed_by,
            change_date,
            notes
        ) VALUES (
            schedule_rec.id,
            'deleted',
            schedule_rec.teacher_id,
            deleted_by_user_id,
            CURRENT_TIMESTAMP,
            'Attempt to delete past lesson, preserved'
        );
        RETURN TRUE;
    END IF;

    -- If lesson is in the future, remove it entirely
    DELETE FROM student_schedules
    WHERE id = schedule_rec.id;

    -- Optional: log deletion
    INSERT INTO schedule_history(
        schedule_id,
        action,
        old_teacher_id,
        changed_by,
        change_date,
        notes
    ) VALUES (
        schedule_rec.id,
        'deleted',
        schedule_rec.teacher_id,
        deleted_by_user_id,
        CURRENT_TIMESTAMP,
        'Future lesson deleted'
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ======= Fix Date Types Migration =======
-- Convert TIMESTAMP columns to DATE to avoid timezone issues

-- 1. Clean up all test data first
DELETE FROM schedule_history;
DELETE FROM student_schedules;
DELETE FROM schedule_templates;
DELETE FROM student_lessons;
DELETE FROM lesson_reports;
DELETE FROM student_teachers;
DELETE FROM students;
DELETE FROM teachers;
DELETE FROM users WHERE role IN ('teacher', 'student');

-- 2. Drop dependent views first
DROP VIEW IF EXISTS upcoming_schedule_view CASCADE;
DROP VIEW IF EXISTS weekly_schedule CASCADE;
DROP VIEW IF EXISTS lesson_statistics CASCADE;
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;

-- 3. Convert student_schedules.week_start_date from TIMESTAMP to DATE
ALTER TABLE student_schedules
  ALTER COLUMN week_start_date TYPE DATE USING week_start_date::DATE;

-- 4. Convert schedule_templates date columns from TIMESTAMP to DATE
ALTER TABLE schedule_templates
  ALTER COLUMN start_date TYPE DATE USING start_date::DATE;

ALTER TABLE schedule_templates
  ALTER COLUMN end_date TYPE DATE USING end_date::DATE;

-- 5. Update get_week_start function to return DATE instead of TIMESTAMP
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  -- Calculate Monday of the week containing input_date
  -- Monday = 0, Sunday = 6
  RETURN input_date - (EXTRACT(DOW FROM input_date)::INTEGER - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Update get_current_week_start function to return DATE
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
  RETURN get_week_start(CURRENT_DATE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Update delete_future_lesson function to work with DATE
CREATE OR REPLACE FUNCTION delete_future_lesson(
    schedule_id_param INTEGER,
    deleted_by_user_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    schedule_rec RECORD;
BEGIN
    SELECT * INTO schedule_rec
    FROM student_schedules
    WHERE id = schedule_id_param;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- If lesson is in the past (before current week), do nothing
    IF schedule_rec.week_start_date < get_current_week_start() THEN
        INSERT INTO schedule_history(
            schedule_id,
            action,
            old_teacher_id,
            changed_by,
            change_date,
            notes
        ) VALUES (
            schedule_rec.id,
            'deleted',
            schedule_rec.teacher_id,
            deleted_by_user_id,
            CURRENT_TIMESTAMP,
            'Attempt to delete past lesson, preserved'
        );
        RETURN TRUE;
    END IF;

    -- Log deletion BEFORE deleting the record
    INSERT INTO schedule_history(
        schedule_id,
        action,
        old_teacher_id,
        changed_by,
        change_date,
        notes
    ) VALUES (
        schedule_rec.id,
        'deleted',
        schedule_rec.teacher_id,
        deleted_by_user_id,
        CURRENT_TIMESTAMP,
        'Future lesson deleted'
    );

    -- If lesson is in the future, remove it entirely
    DELETE FROM student_schedules
    WHERE id = schedule_rec.id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Update create_occurrences_from_template function to work with DATE
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

-- 9. Update schedule_lesson_date function to work with DATE
CREATE OR REPLACE FUNCTION schedule_lesson_date(p_week_start DATE, p_day_of_week INTEGER)
RETURNS DATE AS $$
BEGIN
    RETURN (p_week_start + (p_day_of_week * INTERVAL '1 day'))::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. Recreate the views with DATE types
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
    ss.is_active
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true;

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
WHERE ss.week_start_date >= get_current_week_start()
GROUP BY ss.teacher_id, t.name, ss.week_start_date;

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
WHERE ss.week_start_date >= get_current_week_start()
GROUP BY ss.teacher_id, t.name, DATE_TRUNC('month', ss.week_start_date)::DATE;


### 1. `file_folders` table

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


### 2. `shared_files` table

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


### 3. `file_access_logs` table (optional - for analytics)

CREATE TABLE file_access_logs (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES shared_files(id) ON DELETE CASCADE,
    accessed_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'view', 'download'
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Helpful indexes

ALTER TABLE student_schedules DROP CONSTRAINT IF EXISTS student_schedules_attendance_status_check;
ALTER TABLE student_schedules
  ADD CONSTRAINT student_schedules_attendance_status_check
  CHECK (attendance_status IN ('scheduled','completed','absent','absent_warned'));

  -- 2) Remove primary-teacher concept from student_teachers
DROP INDEX IF EXISTS idx_student_teachers_unique_primary;
ALTER TABLE student_teachers DROP COLUMN IF EXISTS is_primary;

  -- 3) Ensure uniqueness of links (usually exists already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t ON t.oid = c.conrelid
    WHERE  t.relname = 'student_teachers'
    AND    c.contype = 'u'
  ) THEN
    ALTER TABLE student_teachers ADD CONSTRAINT student_teachers_student_teacher_unique UNIQUE (student_id, teacher_id);
  END IF;
END $$;

  -- 4) Auto-create/reactivate student_teachers on schedule insert (admin creates schedules)
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

DROP TRIGGER IF EXISTS trg_ensure_student_teacher_link ON student_schedules;
CREATE TRIGGER trg_ensure_student_teacher_link
  AFTER INSERT ON student_schedules
  FOR EACH ROW EXECUTE FUNCTION ensure_student_teacher_link();

  -- Fix lesson_statistics view to include all lessons (not just current/future)
-- This will allow monthly stats to show historical data

-- Drop the existing view
DROP VIEW IF EXISTS lesson_statistics CASCADE;

-- Recreate the view without the date restriction
CREATE VIEW lesson_statistics AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    ss.week_start_date,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, ss.week_start_date
ORDER BY ss.teacher_id, ss.week_start_date;

-- Also update the teacher_monthly_stats view to be consistent
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;

CREATE VIEW teacher_monthly_stats AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    DATE_TRUNC('month', ss.week_start_date)::DATE as month_start,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, DATE_TRUNC('month', ss.week_start_date)::DATE
ORDER BY ss.teacher_id, month_start;

-- Grant permissions to the app user
GRANT SELECT ON lesson_statistics TO your_app_user;
GRANT SELECT ON teacher_monthly_stats TO your_app_user;

-- Test the view to make sure it works
SELECT 
    teacher_id,
    teacher_name,
    week_start_date,
    total_lessons,
    completed_lessons,
    absent_lessons
FROM lesson_statistics 
WHERE EXTRACT(YEAR FROM week_start_date) = 2025 
  AND EXTRACT(MONTH FROM week_start_date) = 9
ORDER BY teacher_id, week_start_date
LIMIT 10;


-- Fix lesson_statistics view to include all lessons (not just current/future)
-- This will allow monthly stats to show historical data

-- Drop the existing view
DROP VIEW IF EXISTS lesson_statistics CASCADE;

-- Recreate the view without the date restriction
CREATE VIEW lesson_statistics AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    ss.week_start_date,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, ss.week_start_date
ORDER BY ss.teacher_id, ss.week_start_date;

-- Also update the teacher_monthly_stats view to be consistent
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;

CREATE VIEW teacher_monthly_stats AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    DATE_TRUNC('month', ss.week_start_date)::DATE as month_start,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, DATE_TRUNC('month', ss.week_start_date)::DATE
ORDER BY ss.teacher_id, month_start;

-- Grant permissions to the app user
GRANT SELECT ON lesson_statistics TO your_app_user;
GRANT SELECT ON teacher_monthly_stats TO your_app_user;

-- Test the view to make sure it works
SELECT 
    teacher_id,
    teacher_name,
    week_start_date,
    total_lessons,
    completed_lessons,
    absent_lessons
FROM lesson_statistics 
WHERE EXTRACT(YEAR FROM week_start_date) = 2025 
  AND EXTRACT(MONTH FROM week_start_date) = 9
ORDER BY teacher_id, week_start_date
LIMIT 10;

-- Modified delete_future_lesson function to delete all recurring lessons in the same time slot
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


-- Fix lesson_statistics view to include all lessons (not just current/future)
-- This will allow monthly stats to show historical data

-- Drop the existing view
DROP VIEW IF EXISTS lesson_statistics CASCADE;

-- Recreate the view without the date restriction
CREATE VIEW lesson_statistics AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    ss.week_start_date,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, ss.week_start_date
ORDER BY ss.teacher_id, ss.week_start_date;

-- Also update the teacher_monthly_stats view to be consistent
DROP VIEW IF EXISTS teacher_monthly_stats CASCADE;

CREATE VIEW teacher_monthly_stats AS
SELECT 
    ss.teacher_id,
    t.name as teacher_name,
    DATE_TRUNC('month', ss.week_start_date)::DATE as month_start,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
    COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
FROM student_schedules ss
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.is_active = true
GROUP BY ss.teacher_id, t.name, DATE_TRUNC('month', ss.week_start_date)::DATE
ORDER BY ss.teacher_id, month_start;

-- Grant permissions to the app user
GRANT SELECT ON lesson_statistics TO your_app_user;
GRANT SELECT ON teacher_monthly_stats TO your_app_user;

-- Test the view to make sure it works
SELECT 
    teacher_id,
    teacher_name,
    week_start_date,
    total_lessons,
    completed_lessons,
    absent_lessons
FROM lesson_statistics 
WHERE EXTRACT(YEAR FROM week_start_date) = 2025 
  AND EXTRACT(MONTH FROM week_start_date) = 9
ORDER BY teacher_id, week_start_date
LIMIT 10;

ALTER TABLE teachers 
ADD COLUMN meeting_id VARCHAR(255),
ADD COLUMN meeting_password VARCHAR(255);

-- Remove email column (after data migration if needed)
-- Note: Uncomment the line below after confirming no data migration is needed
-- ALTER TABLE teachers DROP COLUMN email;

-- Add comments for documentation
COMMENT ON COLUMN teachers.meeting_id IS 'Meeting room ID for online classes';
COMMENT ON COLUMN teachers.meeting_password IS 'Meeting room password for online classes';

-- Create index on meeting_id for faster lookups (optional)
CREATE INDEX IF NOT EXISTS idx_teachers_meeting_id ON teachers(meeting_id);

-- Schedule Extension System - Database Functions
-- Language School Management System

-- =====================================================
-- Schedule Extension System - Database Functions
-- Language School Management System

-- =====================================================
-- 1. EXTENSION FUNCTION (Core Functionality)
-- =====================================================

CREATE OR REPLACE FUNCTION extend_schedules_by_one_week()
RETURNS INT AS $$
DECLARE
  inserted_count INT := 0;
BEGIN
  -- Single query: Find last week per template and insert next week
  WITH last_weeks AS (
    SELECT DISTINCT
      ss.template_id,
      ss.student_id,
      ss.teacher_id,
      ss.day_of_week,
      ss.time_slot,
      MAX(ss.week_start_date) as last_week_date
    FROM student_schedules ss
    JOIN schedule_templates tpl ON ss.template_id = tpl.id
    WHERE tpl.is_active = TRUE
      AND ss.is_active = TRUE
      AND ss.week_start_date >= get_current_week_start()
    GROUP BY ss.template_id, ss.student_id, ss.teacher_id, ss.day_of_week, ss.time_slot
  )
  INSERT INTO student_schedules (
    student_id, teacher_id, day_of_week, time_slot, week_start_date,
    is_recurring, template_id, lesson_type, attendance_status, is_active,
    created_at, updated_at
  )
  SELECT 
    lw.student_id, lw.teacher_id, lw.day_of_week, lw.time_slot,
    lw.last_week_date + INTERVAL '7 days' as new_week_date,
    TRUE, lw.template_id, 'scheduled', 'scheduled', TRUE,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM last_weeks lw
  WHERE NOT EXISTS (
    SELECT 1 FROM student_schedules ss2
    WHERE ss2.student_id = lw.student_id 
      AND ss2.teacher_id = lw.teacher_id 
      AND ss2.day_of_week = lw.day_of_week 
      AND ss2.time_slot = lw.time_slot 
      AND ss2.week_start_date = lw.last_week_date + INTERVAL '7 days'
  );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. REMINDER FUNCTION (Simple Count)
-- =====================================================

CREATE OR REPLACE FUNCTION count_schedules_needing_extension()
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM (
      SELECT DISTINCT 
        ss.student_id, 
        ss.teacher_id, 
        ss.day_of_week, 
        ss.time_slot,
        MAX(ss.week_start_date) as last_week_date
      FROM student_schedules ss
      JOIN schedule_templates tpl ON ss.template_id = tpl.id
      WHERE tpl.is_active = TRUE
        AND ss.is_active = TRUE
        AND ss.week_start_date >= get_current_week_start()
      GROUP BY ss.student_id, ss.teacher_id, ss.day_of_week, ss.time_slot
      HAVING (MAX(ss.week_start_date) - get_current_week_start()) / 7 <= 2
    ) AS schedules_needing_extension
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. HELPER FUNCTION (Get Current Week Start)
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
  RETURN get_week_start(CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. HELPER FUNCTION (Get Week Start for Any Date)
-- =====================================================

CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  -- Calculate Monday of the week containing input_date
  -- Monday = 0, Sunday = 6
  RETURN input_date - (EXTRACT(DOW FROM input_date)::INTEGER - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 5. TEST FUNCTIONS (For Development/Testing)
-- =====================================================

-- Function to test extension without actually extending
CREATE OR REPLACE FUNCTION test_extension_candidates()
RETURNS TABLE(
  student_id INT,
  teacher_id INT,
  day_of_week INT,
  time_slot VARCHAR,
  last_week_date DATE,
  new_week_date DATE,
  template_id INT
) AS $$
BEGIN
  RETURN QUERY
  WITH last_weeks AS (
    SELECT DISTINCT
      ss.template_id,
      ss.student_id,
      ss.teacher_id,
      ss.day_of_week,
      ss.time_slot,
      MAX(ss.week_start_date) as last_week_date
    FROM student_schedules ss
    JOIN schedule_templates tpl ON ss.template_id = tpl.id
    WHERE tpl.is_active = TRUE
      AND ss.is_active = TRUE
      AND ss.week_start_date >= get_current_week_start()
    GROUP BY ss.template_id, ss.student_id, ss.teacher_id, ss.day_of_week, ss.time_slot
  )
  SELECT 
    lw.student_id,
    lw.teacher_id,
    lw.day_of_week,
    lw.time_slot,
    lw.last_week_date,
    lw.last_week_date + INTERVAL '7 days' as new_week_date,
    lw.template_id
  FROM last_weeks lw
  WHERE NOT EXISTS (
    SELECT 1 FROM student_schedules ss2
    WHERE ss2.student_id = lw.student_id 
      AND ss2.teacher_id = lw.teacher_id 
      AND ss2.day_of_week = lw.day_of_week 
      AND ss2.time_slot = lw.time_slot 
      AND ss2.week_start_date = lw.last_week_date + INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get detailed reminder information
CREATE OR REPLACE FUNCTION get_extension_reminder_details()
RETURNS TABLE(
  student_id INT,
  teacher_id INT,
  student_name VARCHAR,
  teacher_name VARCHAR,
  day_of_week INT,
  time_slot VARCHAR,
  last_week_date DATE,
  weeks_remaining INT
) AS $$
BEGIN
  RETURN QUERY
  WITH last_weeks AS (
    SELECT DISTINCT
      ss.template_id,
      ss.student_id,
      ss.teacher_id,
      s.name as student_name,
      t.name as teacher_name,
      ss.day_of_week,
      ss.time_slot,
      MAX(ss.week_start_date) as last_week_date,
      (MAX(ss.week_start_date) - get_current_week_start()) / 7 as weeks_remaining
    FROM student_schedules ss
    JOIN schedule_templates tpl ON ss.template_id = tpl.id
    JOIN students s ON ss.student_id = s.id
    JOIN teachers t ON ss.teacher_id = t.id
    WHERE tpl.is_active = TRUE
      AND ss.is_active = TRUE
      AND ss.week_start_date >= get_current_week_start()
    GROUP BY ss.template_id, ss.student_id, ss.teacher_id, s.name, t.name, ss.day_of_week, ss.time_slot
  )
  SELECT 
    lw.student_id,
    lw.teacher_id,
    lw.student_name,
    lw.teacher_name,
    lw.day_of_week,
    lw.time_slot,
    lw.last_week_date,
    lw.weeks_remaining::INT
  FROM last_weeks lw
  WHERE lw.weeks_remaining <= 2
  ORDER BY lw.weeks_remaining ASC, lw.last_week_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. USAGE EXAMPLES
-- =====================================================

-- Example 1: Extend all schedules by one week
-- SELECT extend_schedules_by_one_week();

-- Example 2: Check how many schedules need extension
-- SELECT count_schedules_needing_extension();

-- Example 3: See what would be extended (test mode)
-- SELECT * FROM test_extension_candidates();

-- Example 4: Get detailed reminder information
-- SELECT * FROM get_extension_reminder_details();

-- Example 5: Check current week start
-- SELECT get_current_week_start();

-- =====================================================
-- 7. PERFORMANCE INDEXES (Critical for Large Datasets)
-- =====================================================

-- Composite index for COUNT(DISTINCT ...) performance
-- This is CRITICAL for performance with 10,000+ schedules
CREATE INDEX IF NOT EXISTS idx_schedule_extension_performance 
ON student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date);

-- Additional indexes for template joins and filtering
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active 
ON schedule_templates (is_active);

CREATE INDEX IF NOT EXISTS idx_student_schedules_active_week 
ON student_schedules (is_active, week_start_date);

-- =====================================================
-- 8. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION extend_schedules_by_one_week() IS 'Extends all active schedule templates by adding one week after the last existing week for each unique pattern';
COMMENT ON FUNCTION count_schedules_needing_extension() IS 'Returns count of schedule patterns that have 2 weeks or less remaining';
COMMENT ON FUNCTION get_current_week_start() IS 'Returns the Monday date of the current week';
COMMENT ON FUNCTION get_week_start(DATE) IS 'Returns the Monday date of the week containing the input date';
COMMENT ON FUNCTION test_extension_candidates() IS 'Shows what schedules would be extended without actually extending them (for testing)';
COMMENT ON FUNCTION get_extension_reminder_details() IS 'Returns detailed information about schedules needing extension (for debugging)';

COMMENT ON INDEX idx_schedule_extension_performance IS 'Critical performance index for COUNT(DISTINCT ...) operations on large datasets';
COMMENT ON INDEX idx_schedule_templates_active IS 'Optimizes template join filtering by is_active status';
COMMENT ON INDEX idx_student_schedules_active_week IS 'Optimizes schedule filtering by is_active and week_start_date';

-- Student Lesson Packages - Optimal Database Schema
-- Language School Management System

-- =====================================================
-- 1. CREATE STUDENT_PACKAGES TABLE
-- =====================================================

CREATE TABLE student_packages (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    number_of_lessons INTEGER NOT NULL CHECK (number_of_lessons > 0),
    date_added DATE NOT NULL,
    week_start_date DATE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_student_packages_student_id ON student_packages(student_id);
CREATE INDEX idx_student_packages_date_added ON student_packages(date_added);
CREATE INDEX idx_student_packages_week_start ON student_packages(week_start_date);
CREATE INDEX idx_student_packages_day_of_week ON student_packages(day_of_week);

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE TRIGGER update_student_packages_updated_at 
    BEFORE UPDATE ON student_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. CREATE SIMPLE VIEW FOR PACKAGE TRACKING
-- =====================================================

-- Fix student_package_tracking view to use date_added instead of week_start_date
-- This ensures lessons are only counted AFTER package creation

DROP VIEW IF EXISTS student_package_tracking;

CREATE VIEW student_package_tracking AS
SELECT 
    sp.id as package_id,
    sp.student_id,
    s.name as student_name,
    sp.number_of_lessons,
    sp.date_added,
    -- Count lessons taken since package creation using existing weekly_schedule view
    COALESCE(lessons_taken.count, 0) as lessons_taken,
    -- Calculate remaining lessons
    (sp.number_of_lessons - COALESCE(lessons_taken.count, 0)) as lessons_remaining,
    -- Package status
    CASE 
        WHEN (sp.number_of_lessons - COALESCE(lessons_taken.count, 0)) <= 0 THEN 'exhausted'
        WHEN (sp.number_of_lessons - COALESCE(lessons_taken.count, 0)) <= 2 THEN 'low'
        ELSE 'active'
    END as package_status,
    sp.created_at,
    sp.updated_at
FROM student_packages sp
JOIN students s ON sp.student_id = s.id
    LEFT JOIN (
        -- Use weekly_schedule view to count lessons taken AFTER package creation
        SELECT 
            ws.student_id,
            sp_inner.id as package_id,
            COUNT(*) as count
        FROM weekly_schedule ws
        JOIN student_packages sp_inner ON ws.student_id = sp_inner.student_id
               WHERE ws.attendance_status IN ('completed', 'absent')
                   AND (
                     -- For the package's start week: only count from day_of_week onwards (4,5,6)
                     (ws.week_start_date = sp_inner.week_start_date AND ws.day_of_week >= sp_inner.day_of_week)
                     OR
                     -- For all subsequent weeks: count all days
                     ws.week_start_date > sp_inner.week_start_date
                   )
        GROUP BY ws.student_id, sp_inner.id
    ) lessons_taken ON sp.id = lessons_taken.package_id
WHERE s.is_active = true;


-- =====================================================
-- 5. CREATE ESSENTIAL FUNCTIONS ONLY
-- =====================================================

-- Function to get exhausted packages (for notifications)
CREATE OR REPLACE FUNCTION get_exhausted_packages()
RETURNS TABLE (
    package_id INTEGER,
    student_id INTEGER,
    student_name VARCHAR,
    total_lessons INTEGER,
    lessons_taken INTEGER,
    date_added DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        spt.package_id,
        spt.student_id,
        spt.student_name,
        spt.number_of_lessons,
        spt.lessons_taken,
        spt.date_added
    FROM student_package_tracking spt
    WHERE spt.package_status = 'exhausted'
    ORDER BY spt.date_added DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE student_packages IS 'Tracks student lesson packages with remaining lesson counts';
COMMENT ON COLUMN student_packages.number_of_lessons IS 'Total number of lessons in the package';
COMMENT ON COLUMN student_packages.date_added IS 'Date when package was added (stored as DATE, not TIMESTAMP)';

COMMENT ON VIEW student_package_tracking IS 'View showing package status and remaining lessons using weekly_schedule view';
COMMENT ON FUNCTION get_exhausted_packages IS 'Get all packages that have been exhausted (0 lessons remaining)';

-- =====================================================
-- 7. USAGE EXAMPLES
-- =====================================================

-- Example 1: Add a new package
-- INSERT INTO student_packages (student_id, number_of_lessons, date_added) 
-- VALUES (1, 10, CURRENT_DATE);

-- Example 2: Get all package tracking data
-- SELECT * FROM student_package_tracking;

-- Example 3: Get exhausted packages
-- SELECT * FROM get_exhausted_packages();

-- Example 4: Delete a package
-- DELETE FROM student_packages WHERE id = 1;


CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  RETURN DATE_TRUNC('week', input_date)::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
  RETURN get_week_start(CURRENT_DATE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;