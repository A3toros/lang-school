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
