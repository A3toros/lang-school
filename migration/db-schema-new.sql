- Create attendance_records table
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

-- Create indexes for performance
CREATE INDEX idx_attendance_records_student_teacher ON attendance_records(student_id, teacher_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(lesson_date);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);
```

### 1.2 Core Dynamic Generation Function
```sql
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
```

### 1.3 Additional Database Functions
```sql
-- Rewrite get_teacher_schedule function
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

-- Rewrite mark_schedule_completed function
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
```

### 1.3 Rewrite Database Views
```sql
-- weekly_schedule view
CREATE OR REPLACE VIEW weekly_schedule AS
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

-- upcoming_schedule_view
CREATE OR REPLACE VIEW upcoming_schedule_view AS
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