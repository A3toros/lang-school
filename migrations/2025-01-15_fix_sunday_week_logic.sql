-- Fix Sunday week logic: Sunday lessons should be recorded for current week, not next week
-- This migration updates the get_week_start function to handle Sunday correctly

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

-- Test the function with some sample dates
-- SELECT get_week_start('2025-09-14'::DATE) as sunday_result;  -- Should return 2025-09-08 (Monday of same week)
-- SELECT get_week_start('2025-09-15'::DATE) as monday_result;  -- Should return 2025-09-15 (Monday of same week)
-- SELECT get_week_start('2025-09-16'::DATE) as tuesday_result; -- Should return 2025-09-15 (Monday of same week)
