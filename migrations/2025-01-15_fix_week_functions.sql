-- Migration: Fix week start functions to return Monday
-- Date: 2025-01-15
-- Description: Fix get_current_week_start() and get_week_start() to return Monday instead of Tuesday

BEGIN;

-- Fix get_current_week_start() function to return Monday (not Tuesday)
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
    -- Return Monday of current week (not Tuesday)
    RETURN DATE_TRUNC('week', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Fix get_week_start() function to return Monday (not Tuesday)
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
    -- Return Monday of the week for any given date (not Tuesday)
    RETURN DATE_TRUNC('week', input_date);
END;
$$ LANGUAGE plpgsql;

-- Verify the functions work correctly
SELECT 
    'Function test' as check_type,
    get_current_week_start() as current_week_start,
    EXTRACT(DOW FROM get_current_week_start()) as day_of_week,
    CASE EXTRACT(DOW FROM get_current_week_start())
        WHEN 1 THEN 'Monday (CORRECT)'
        ELSE 'WRONG'
    END as status;

COMMIT;
