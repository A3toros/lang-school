-- Migration: Fix Report Date Logic
-- Date: 2025-01-15
-- Description: Fix report key generation to use consistent Monday week start

BEGIN;

-- 1. Add week_start_date column to lesson_reports table for consistent key generation
ALTER TABLE lesson_reports 
ADD COLUMN IF NOT EXISTS week_start_date DATE;

-- 2. Update existing reports to have week_start_date calculated from lesson_date
UPDATE lesson_reports 
SET week_start_date = DATE_TRUNC('week', lesson_date)::date;

-- 3. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_reports_week_start ON lesson_reports(week_start_date);

-- 4. Add constraint to ensure week_start_date is always Monday
ALTER TABLE lesson_reports 
ADD CONSTRAINT check_week_start_is_monday 
CHECK (EXTRACT(DOW FROM week_start_date) = 1);

-- 5. Verify the migration
SELECT 
    'Report week start verification' as check_type,
    week_start_date,
    EXTRACT(DOW FROM week_start_date) as day_of_week,
    CASE EXTRACT(DOW FROM week_start_date)
        WHEN 1 THEN 'Monday (CORRECT)'
        ELSE 'NOT Monday (ERROR)'
    END as status,
    COUNT(*) as count
FROM lesson_reports 
GROUP BY week_start_date, EXTRACT(DOW FROM week_start_date)
ORDER BY week_start_date;

COMMIT;
