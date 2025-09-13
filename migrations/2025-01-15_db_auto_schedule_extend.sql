-- ======= Database Auto Schedule Extension Migration =======
-- Date: 2025-01-15
-- Description: Automatic weekly schedule extension to maintain 1-week buffer
-- Author: AI Assistant
-- Purpose: Prevents schedule gaps by automatically extending schedules at end of week

BEGIN;

-- ======= 1) Create weekly schedule extension function =======

CREATE OR REPLACE FUNCTION weekly_schedule_extension()
RETURNS TABLE(
    extended_count INTEGER, 
    error_count INTEGER,
    execution_time TIMESTAMP,
    details TEXT
) AS $$
DECLARE
    template_record RECORD;
    last_week DATE;
    current_week_start DATE;
    extended INTEGER := 0;
    errors INTEGER := 0;
    error_details TEXT := '';
    start_time TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
    -- Get current week start (Monday)
    current_week_start := get_current_week_start();
    
    -- Log execution start
    RAISE NOTICE 'Starting weekly schedule extension at % for week starting %', 
        start_time, current_week_start;
    
    -- Process all active templates
    FOR template_record IN 
        SELECT 
            t.id, 
            t.student_id, 
            t.teacher_id, 
            t.day_of_week, 
            t.time_slot,
            s.name as student_name,
            te.name as teacher_name
        FROM schedule_templates t
        JOIN students s ON t.student_id = s.id
        JOIN teachers te ON t.teacher_id = te.id
        WHERE t.is_active = true
        ORDER BY t.id
    LOOP
        BEGIN
            -- Get the last generated week for this template
            SELECT MAX(week_start_date) INTO last_week
            FROM student_schedules 
            WHERE template_id = template_record.id;
            
            -- Check if extension is needed
            -- Extend if last week is current week or earlier (maintain 1-week buffer)
            IF last_week IS NOT NULL AND last_week <= current_week_start THEN
                -- Extend by 1 week
                PERFORM create_occurrences_from_template(template_record.id, 1);
                extended := extended + 1;
                
                RAISE NOTICE 'Extended schedule for % (student: %, teacher: %, day: %, time: %)', 
                    template_record.id, 
                    template_record.student_name,
                    template_record.teacher_name,
                    template_record.day_of_week,
                    template_record.time_slot;
            ELSE
                RAISE NOTICE 'No extension needed for template % (last week: %, current week: %)', 
                    template_record.id, last_week, current_week_start;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            errors := errors + 1;
            error_details := error_details || 'Template ' || template_record.id || ': ' || SQLERRM || '; ';
            RAISE WARNING 'Failed to extend template %: %', template_record.id, SQLERRM;
        END;
    END LOOP;
    
    -- Log execution summary
    RAISE NOTICE 'Weekly extension completed: % extended, % errors, execution time: %', 
        extended, errors, CURRENT_TIMESTAMP - start_time;
    
    -- Return results
    RETURN QUERY SELECT 
        extended, 
        errors, 
        start_time,
        CASE 
            WHEN error_details = '' THEN 'All extensions successful'
            ELSE 'Errors: ' || error_details
        END;
END;
$$ LANGUAGE plpgsql;

-- ======= 2) Create schedule extension log table =======

CREATE TABLE IF NOT EXISTS schedule_extension_log (
    id SERIAL PRIMARY KEY,
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    extended_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    execution_duration INTERVAL,
    details TEXT,
    triggered_by VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_schedule_extension_log_time 
ON schedule_extension_log(execution_time);

CREATE INDEX IF NOT EXISTS idx_schedule_extension_log_triggered_by 
ON schedule_extension_log(triggered_by);

-- ======= 3) Create logging wrapper function =======

CREATE OR REPLACE FUNCTION log_and_extend_schedules(triggered_by VARCHAR(50) DEFAULT 'system')
RETURNS TABLE(
    extended_count INTEGER, 
    error_count INTEGER,
    execution_time TIMESTAMP,
    log_id INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP := CURRENT_TIMESTAMP;
    result RECORD;
    log_id INTEGER;
BEGIN
    -- Execute the extension function
    SELECT * INTO result FROM weekly_schedule_extension();
    
    -- Log the results
    INSERT INTO schedule_extension_log (
        execution_time,
        extended_count,
        error_count,
        execution_duration,
        details,
        triggered_by
    ) VALUES (
        start_time,
        result.extended_count,
        result.error_count,
        CURRENT_TIMESTAMP - start_time,
        result.details,
        triggered_by
    ) RETURNING id INTO log_id;
    
    -- Return results with log ID
    RETURN QUERY SELECT 
        result.extended_count,
        result.error_count,
        result.execution_time,
        log_id;
END;
$$ LANGUAGE plpgsql;

-- ======= 4) Create manual extension function for testing =======

CREATE OR REPLACE FUNCTION manual_schedule_extension()
RETURNS TABLE(
    extended_count INTEGER, 
    error_count INTEGER,
    execution_time TIMESTAMP,
    log_id INTEGER,
    message TEXT
) AS $$
DECLARE
    result RECORD;
BEGIN
    -- Execute with manual trigger
    SELECT * INTO result FROM log_and_extend_schedules('manual');
    
    RETURN QUERY SELECT 
        result.extended_count,
        result.error_count,
        result.execution_time,
        result.log_id,
        'Manual extension completed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ======= 5) Create function to check extension status =======

CREATE OR REPLACE FUNCTION check_schedule_extension_status()
RETURNS TABLE(
    template_id INTEGER,
    student_name VARCHAR,
    teacher_name VARCHAR,
    day_of_week INTEGER,
    time_slot VARCHAR,
    last_week DATE,
    current_week DATE,
    needs_extension BOOLEAN,
    weeks_ahead INTEGER
) AS $$
DECLARE
    current_week_start DATE := get_current_week_start();
BEGIN
    RETURN QUERY
    SELECT 
        t.id as template_id,
        s.name as student_name,
        te.name as teacher_name,
        t.day_of_week,
        t.time_slot,
        COALESCE(MAX(ss.week_start_date), t.start_date) as last_week,
        current_week_start as current_week,
        (COALESCE(MAX(ss.week_start_date), t.start_date) <= current_week_start) as needs_extension,
        EXTRACT(DAYS FROM (COALESCE(MAX(ss.week_start_date), t.start_date) - current_week_start))::INTEGER / 7 as weeks_ahead
    FROM schedule_templates t
    JOIN students s ON t.student_id = s.id
    JOIN teachers te ON t.teacher_id = te.id
    LEFT JOIN student_schedules ss ON t.id = ss.template_id
    WHERE t.is_active = true
    GROUP BY t.id, s.name, te.name, t.day_of_week, t.time_slot, t.start_date
    ORDER BY needs_extension DESC, t.id;
END;
$$ LANGUAGE plpgsql;

-- ======= 6) Create cleanup function for old logs =======

CREATE OR REPLACE FUNCTION cleanup_extension_logs(keep_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM schedule_extension_log 
    WHERE execution_time < CURRENT_TIMESTAMP - INTERVAL '1 day' * keep_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old extension log entries (older than % days)', 
        deleted_count, keep_days;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ======= 7) Add comments for documentation =======

COMMENT ON FUNCTION weekly_schedule_extension IS 'Automatically extends all active schedule templates by 1 week when needed';
COMMENT ON FUNCTION log_and_extend_schedules IS 'Wrapper function that extends schedules and logs the results';
COMMENT ON FUNCTION manual_schedule_extension IS 'Manual trigger for schedule extension (useful for testing)';
COMMENT ON FUNCTION check_schedule_extension_status IS 'Shows which templates need extension and their current status';
COMMENT ON FUNCTION cleanup_extension_logs IS 'Removes old extension log entries to prevent table bloat';
COMMENT ON TABLE schedule_extension_log IS 'Logs all schedule extension operations for audit and debugging';

-- ======= 8) Create test data and validation =======

-- Insert a test log entry
INSERT INTO schedule_extension_log (extended_count, error_count, details, triggered_by) 
VALUES (0, 0, 'Migration completed - no extensions needed', 'migration');

-- ======= 9) Grant necessary permissions =======

-- Grant execute permissions to the application user
-- (Adjust the username as needed for your setup)
-- GRANT EXECUTE ON FUNCTION weekly_schedule_extension() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION log_and_extend_schedules(VARCHAR) TO your_app_user;
-- GRANT EXECUTE ON FUNCTION manual_schedule_extension() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION check_schedule_extension_status() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_extension_logs(INTEGER) TO your_app_user;

-- ======= 10) Usage Examples =======

-- Example 1: Check which templates need extension
-- SELECT * FROM check_schedule_extension_status();

-- Example 2: Manually trigger extension (for testing)
-- SELECT * FROM manual_schedule_extension();

-- Example 3: Check extension history
-- SELECT * FROM schedule_extension_log ORDER BY execution_time DESC LIMIT 10;

-- Example 4: Clean up old logs (keep last 30 days)
-- SELECT cleanup_extension_logs(30);

COMMIT;

-- ======= Post-migration validation =======

-- Verify functions were created
SELECT 
    routine_name, 
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'weekly_schedule_extension',
    'log_and_extend_schedules', 
    'manual_schedule_extension',
    'check_schedule_extension_status',
    'cleanup_extension_logs'
)
ORDER BY routine_name;

-- Verify table was created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'schedule_extension_log';

-- Test the status check function
SELECT 'Extension status check:' as test_type, COUNT(*) as template_count
FROM check_schedule_extension_status();
