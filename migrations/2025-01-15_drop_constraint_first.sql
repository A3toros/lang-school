-- Quick fix: Drop the problematic constraint first
-- Run this BEFORE the main migration

BEGIN;

-- Drop the constraint that's causing the error
ALTER TABLE student_schedules 
DROP CONSTRAINT IF EXISTS student_schedules_time_slot_check;

COMMIT;
