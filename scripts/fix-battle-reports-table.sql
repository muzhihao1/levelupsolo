-- Create daily_battle_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS daily_battle_reports (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    date TIMESTAMP NOT NULL, -- Changed from DATE to TIMESTAMP to match schema.ts
    total_battle_time INTEGER DEFAULT 0,
    energy_balls_consumed INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    pomodoro_cycles INTEGER DEFAULT 0,
    task_details JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_user_id ON daily_battle_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_date ON daily_battle_reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_user_date ON daily_battle_reports(user_id, date);

-- Also ensure pomodoro_sessions table exists
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP DEFAULT NULL,
    work_duration INTEGER DEFAULT 0,
    rest_duration INTEGER DEFAULT 0,
    cycles_completed INTEGER DEFAULT 0,
    actual_energy_balls INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for pomodoro_sessions
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_start_time ON pomodoro_sessions(start_time DESC);