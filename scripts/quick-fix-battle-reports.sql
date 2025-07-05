-- Quick fix for battle reports 500 error
-- Run this directly in Railway PostgreSQL console

-- 1. Create daily_battle_reports table
CREATE TABLE IF NOT EXISTS daily_battle_reports (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    date TIMESTAMP NOT NULL,
    total_battle_time INTEGER DEFAULT 0,
    energy_balls_consumed INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    pomodoro_cycles INTEGER DEFAULT 0,
    task_details JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create unique constraint
ALTER TABLE daily_battle_reports 
ADD CONSTRAINT daily_battle_reports_user_date_unique 
UNIQUE(user_id, date);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_user_id ON daily_battle_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_date ON daily_battle_reports(date DESC);

-- 4. Create pomodoro_sessions table
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    task_id INTEGER,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP DEFAULT NULL,
    work_duration INTEGER DEFAULT 0,
    rest_duration INTEGER DEFAULT 0,
    cycles_completed INTEGER DEFAULT 0,
    actual_energy_balls INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create indexes for pomodoro_sessions
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);

-- 6. Add missing columns to tasks table (if they don't exist)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_energy_balls INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pomodoro_cycles INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS battle_start_time TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS battle_end_time TIMESTAMP;

-- Verify tables were created
SELECT 'Tables created successfully!' as status;