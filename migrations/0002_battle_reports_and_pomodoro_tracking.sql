-- Add fields to tasks table for better pomodoro tracking
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS actual_energy_balls INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pomodoro_cycles INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS battle_start_time TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS battle_end_time TIMESTAMP DEFAULT NULL;

-- Create daily_battle_reports table
CREATE TABLE IF NOT EXISTS daily_battle_reports (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    total_battle_time INTEGER DEFAULT 0, -- Total battle time in minutes
    energy_balls_consumed INTEGER DEFAULT 0, -- Total energy balls consumed
    tasks_completed INTEGER DEFAULT 0, -- Number of tasks completed
    pomodoro_cycles INTEGER DEFAULT 0, -- Total pomodoro cycles completed
    task_details JSONB DEFAULT '[]'::jsonb, -- Detailed task information
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_user_id ON daily_battle_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_date ON daily_battle_reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_user_date ON daily_battle_reports(user_id, date);

-- Create pomodoro_sessions table for tracking individual sessions
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP DEFAULT NULL,
    work_duration INTEGER DEFAULT 0, -- Work time in minutes
    rest_duration INTEGER DEFAULT 0, -- Rest time in minutes
    cycles_completed INTEGER DEFAULT 0,
    actual_energy_balls INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for pomodoro_sessions
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_start_time ON pomodoro_sessions(start_time DESC);

-- Function to update daily battle report
CREATE OR REPLACE FUNCTION update_daily_battle_report(
    p_user_id VARCHAR,
    p_date DATE,
    p_battle_time INTEGER,
    p_energy_balls INTEGER,
    p_task_completed BOOLEAN,
    p_cycles INTEGER,
    p_task_id INTEGER,
    p_task_title TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO daily_battle_reports (
        user_id, 
        date, 
        total_battle_time, 
        energy_balls_consumed, 
        tasks_completed,
        pomodoro_cycles,
        task_details
    )
    VALUES (
        p_user_id, 
        p_date, 
        p_battle_time, 
        p_energy_balls, 
        CASE WHEN p_task_completed THEN 1 ELSE 0 END,
        p_cycles,
        jsonb_build_array(jsonb_build_object(
            'taskId', p_task_id,
            'taskTitle', p_task_title,
            'battleTime', p_battle_time,
            'energyBalls', p_energy_balls,
            'cycles', p_cycles
        ))
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_battle_time = daily_battle_reports.total_battle_time + EXCLUDED.total_battle_time,
        energy_balls_consumed = daily_battle_reports.energy_balls_consumed + EXCLUDED.energy_balls_consumed,
        tasks_completed = daily_battle_reports.tasks_completed + EXCLUDED.tasks_completed,
        pomodoro_cycles = daily_battle_reports.pomodoro_cycles + EXCLUDED.pomodoro_cycles,
        task_details = daily_battle_reports.task_details || EXCLUDED.task_details,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;