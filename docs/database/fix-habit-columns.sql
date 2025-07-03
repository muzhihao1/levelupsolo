-- Database Migration: Fix Habit Completion Columns
-- This script ensures the tasks table has the correct column names for habit tracking

-- First, check if columns exist and their current names
DO $$
BEGIN
    -- Check if last_completed_at exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'last_completed_at'
    ) THEN
        -- Check if camelCase version exists and rename it
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tasks' 
            AND column_name = 'lastCompletedAt'
        ) THEN
            ALTER TABLE tasks RENAME COLUMN "lastCompletedAt" TO last_completed_at;
            RAISE NOTICE 'Renamed column lastCompletedAt to last_completed_at';
        ELSE
            -- Column doesn't exist at all, create it
            ALTER TABLE tasks ADD COLUMN last_completed_at TIMESTAMP;
            RAISE NOTICE 'Added column last_completed_at';
        END IF;
    ELSE
        RAISE NOTICE 'Column last_completed_at already exists';
    END IF;

    -- Check if completion_count exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'completion_count'
    ) THEN
        -- Check if camelCase version exists and rename it
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tasks' 
            AND column_name = 'completionCount'
        ) THEN
            ALTER TABLE tasks RENAME COLUMN "completionCount" TO completion_count;
            RAISE NOTICE 'Renamed column completionCount to completion_count';
        ELSE
            -- Column doesn't exist at all, create it
            ALTER TABLE tasks ADD COLUMN completion_count INTEGER NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added column completion_count';
        END IF;
    ELSE
        RAISE NOTICE 'Column completion_count already exists';
    END IF;

    -- Ensure other columns are using snake_case
    -- This is a safer approach that checks before renaming
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'userId') THEN
        ALTER TABLE tasks RENAME COLUMN "userId" TO user_id;
        RAISE NOTICE 'Renamed column userId to user_id';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'skillId') THEN
        ALTER TABLE tasks RENAME COLUMN "skillId" TO skill_id;
        RAISE NOTICE 'Renamed column skillId to skill_id';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'goalId') THEN
        ALTER TABLE tasks RENAME COLUMN "goalId" TO goal_id;
        RAISE NOTICE 'Renamed column goalId to goal_id';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'taskCategory') THEN
        ALTER TABLE tasks RENAME COLUMN "taskCategory" TO task_category;
        RAISE NOTICE 'Renamed column taskCategory to task_category';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'taskType') THEN
        ALTER TABLE tasks RENAME COLUMN "taskType" TO task_type;
        RAISE NOTICE 'Renamed column taskType to task_type';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'parentTaskId') THEN
        ALTER TABLE tasks RENAME COLUMN "parentTaskId" TO parent_task_id;
        RAISE NOTICE 'Renamed column parentTaskId to parent_task_id';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'expReward') THEN
        ALTER TABLE tasks RENAME COLUMN "expReward" TO exp_reward;
        RAISE NOTICE 'Renamed column expReward to exp_reward';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'estimatedDuration') THEN
        ALTER TABLE tasks RENAME COLUMN "estimatedDuration" TO estimated_duration;
        RAISE NOTICE 'Renamed column estimatedDuration to estimated_duration';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'actualDuration') THEN
        ALTER TABLE tasks RENAME COLUMN "actualDuration" TO actual_duration;
        RAISE NOTICE 'Renamed column actualDuration to actual_duration';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'accumulatedTime') THEN
        ALTER TABLE tasks RENAME COLUMN "accumulatedTime" TO accumulated_time;
        RAISE NOTICE 'Renamed column accumulatedTime to accumulated_time';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'pomodoroSessionId') THEN
        ALTER TABLE tasks RENAME COLUMN "pomodoroSessionId" TO pomodoro_session_id;
        RAISE NOTICE 'Renamed column pomodoroSessionId to pomodoro_session_id';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'startedAt') THEN
        ALTER TABLE tasks RENAME COLUMN "startedAt" TO started_at;
        RAISE NOTICE 'Renamed column startedAt to started_at';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'createdAt') THEN
        ALTER TABLE tasks RENAME COLUMN "createdAt" TO created_at;
        RAISE NOTICE 'Renamed column createdAt to created_at';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'completedAt') THEN
        ALTER TABLE tasks RENAME COLUMN "completedAt" TO completed_at;
        RAISE NOTICE 'Renamed column completedAt to completed_at';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'requiredEnergyBalls') THEN
        ALTER TABLE tasks RENAME COLUMN "requiredEnergyBalls" TO required_energy_balls;
        RAISE NOTICE 'Renamed column requiredEnergyBalls to required_energy_balls';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'goalTags') THEN
        ALTER TABLE tasks RENAME COLUMN "goalTags" TO goal_tags;
        RAISE NOTICE 'Renamed column goalTags to goal_tags';
    END IF;

END $$;

-- Verify the final state
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tasks'
AND column_name IN ('last_completed_at', 'completion_count', 'user_id', 'task_category')
ORDER BY ordinal_position;