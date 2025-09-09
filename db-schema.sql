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
    lessons_per_week INTEGER DEFAULT 1 CHECK (lessons_per_week > 0),
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

-- Insert sample students
INSERT INTO students (name, teacher_id, lessons_per_week, added_date) VALUES
-- Students for Sarah Johnson (teacher_id: 1)
('Emma Wilson', 1, 2, '2024-01-15'),
('James Brown', 1, 1, '2024-02-03'),
('Olivia Davis', 1, 3, '2024-01-28'),
('William Miller', 1, 2, '2024-02-10'),
('Sophia Garcia', 1, 1, '2024-01-20'),

-- Students for Michael Chen (teacher_id: 2)
('Alex Zhang', 2, 2, '2024-01-12'),
('Lisa Wang', 2, 1, '2024-02-05'),
('Kevin Liu', 2, 3, '2024-01-25'),
('Jennifer Chen', 2, 2, '2024-02-08'),
('Daniel Wu', 2, 1, '2024-01-30'),

-- Students for Elena Rodriguez (teacher_id: 3)
('Carlos Martinez', 3, 2, '2024-01-18'),
('Isabella Lopez', 3, 1, '2024-02-12'),
('Diego Gonzalez', 3, 3, '2024-01-22'),
('Valentina Perez', 3, 2, '2024-02-15'),
('Santiago Rodriguez', 3, 1, '2024-01-08'),

-- Students for David Kim (teacher_id: 4)
('Min-jun Park', 4, 2, '2024-01-14'),
('So-young Lee', 4, 1, '2024-02-07'),
('Jae-hoon Kim', 4, 3, '2024-01-26'),
('Hye-jin Choi', 4, 2, '2024-02-11'),
('Tae-woo Jung', 4, 1, '2024-01-31'),

-- Students for Anna Petrov (teacher_id: 5)
('Vladimir Petrov', 5, 2, '2024-01-16'),
('Natalia Ivanova', 5, 1, '2024-02-09'),
('Dmitri Volkov', 5, 3, '2024-01-24'),
('Elena Sokolova', 5, 2, '2024-02-13'),
('Sergei Kozlov', 5, 1, '2024-01-29'),

-- Students for Yuki Tanaka (teacher_id: 6)
('Hiroshi Yamamoto', 6, 2, '2024-01-17'),
('Yuki Sato', 6, 1, '2024-02-06'),
('Takeshi Nakamura', 6, 3, '2024-01-27'),
('Akiko Ito', 6, 2, '2024-02-14'),
('Kenji Suzuki', 6, 1, '2024-01-21'),

-- Students for Pierre Dubois (teacher_id: 7)
('Marie Dubois', 7, 2, '2024-01-19'),
('Jean Martin', 7, 1, '2024-02-04'),
('Claire Bernard', 7, 3, '2024-01-23'),
('François Moreau', 7, 2, '2024-02-16'),
('Camille Petit', 7, 1, '2024-01-11'),

-- Students for Maria Silva (teacher_id: 8)
('João Santos', 8, 2, '2024-01-13'),
('Ana Costa', 8, 1, '2024-02-17'),
('Pedro Oliveira', 8, 3, '2024-01-31'),
('Beatriz Ferreira', 8, 2, '2024-02-18'),
('Rafael Almeida', 8, 1, '2024-02-01'),

-- Students for Giuseppe Rossi (teacher_id: 9)
('Marco Bianchi', 9, 2, '2024-02-02'),
('Giulia Romano', 9, 1, '2024-02-19'),
('Alessandro Ferrari', 9, 3, '2024-02-03'),
('Francesca Conti', 9, 2, '2024-02-20'),
('Lorenzo Ricci', 9, 1, '2024-02-04'),

-- Students for Hans Mueller (teacher_id: 10)
('Klaus Weber', 10, 2, '2024-02-05'),
('Greta Schmidt', 10, 1, '2024-02-21'),
('Wolfgang Fischer', 10, 3, '2024-02-06'),
('Ingrid Wagner', 10, 2, '2024-02-22'),
('Helmut Becker', 10, 1, '2024-02-07');

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
