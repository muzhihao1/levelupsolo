-- 创建战报相关表的简化脚本
-- 在 Supabase SQL Editor 中直接运行此脚本

-- 1. 创建每日战报表
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

-- 2. 创建番茄钟会话表
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

-- 3. 为 tasks 表添加缺失的列
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_energy_balls INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pomodoro_cycles INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS battle_start_time TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS battle_end_time TIMESTAMP;

-- 4. 创建索引（在表创建后）
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_user_id ON daily_battle_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_date ON daily_battle_reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);

-- 5. 创建唯一约束
ALTER TABLE daily_battle_reports 
ADD CONSTRAINT daily_battle_reports_user_date_unique 
UNIQUE(user_id, date);

-- 完成
SELECT '✅ 表创建成功！' as status;