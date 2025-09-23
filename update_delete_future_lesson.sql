-- Update delete_future_lesson function to delete current lesson AND all future recurring lessons
-- This replaces the existing function to delete all future occurrences in the same time slot

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS delete_future_lesson(integer, integer);

CREATE OR REPLACE FUNCTION delete_future_lesson(
    schedule_id_param INTEGER,
    deleted_by_user_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    schedule_rec RECORD;
    deleted_count INTEGER := 0;
    current_week_start DATE;
BEGIN
    -- Get the details of the specific lesson to identify the recurring pattern
    SELECT id, student_id, teacher_id, day_of_week, time_slot, week_start_date
    INTO schedule_rec
    FROM student_schedules
    WHERE id = schedule_id_param;

    IF NOT FOUND THEN
        RETURN 0; -- Schedule not found
    END IF;

    -- Get current week start for comparison
    current_week_start := get_current_week_start();

    -- If the lesson is in the past (before current week), do nothing
    IF schedule_rec.week_start_date < current_week_start THEN
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
        RETURN 1; -- Return 1 to indicate "success" but no actual deletion
    END IF;

    -- Log the deletion action for all future occurrences
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
        'All future recurring lessons in this slot deleted starting from ' || schedule_rec.week_start_date
    );

    -- Delete all future occurrences of this recurring lesson pattern
    -- This includes the current lesson if it's in the current week or future
    WITH deleted AS (
        DELETE FROM student_schedules
        WHERE student_id = schedule_rec.student_id
          AND teacher_id = schedule_rec.teacher_id
          AND day_of_week = schedule_rec.day_of_week
          AND time_slot = schedule_rec.time_slot
          AND week_start_date >= schedule_rec.week_start_date -- Delete from this week onwards
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
