-- Performance Optimization Indexes for Level Up Solo
-- Created: 2025-07-04
-- Purpose: Improve query performance for common operations

-- Tasks table indexes
-- Index for user's tasks lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Composite index for user's tasks by category
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, task_category);

-- Index for completed tasks filtering
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed);

-- Composite index for user's incomplete tasks (dashboard query)
CREATE INDEX IF NOT EXISTS idx_tasks_user_incomplete ON tasks(user_id, completed) WHERE completed = false;

-- Index for habit tasks that need daily reset
CREATE INDEX IF NOT EXISTS idx_tasks_habits ON tasks(task_category) WHERE task_category = 'habit';

-- Skills table indexes
-- Index for user's skills lookup
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);

-- Goals table indexes
-- Index for user's goals lookup
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Index for incomplete goals
CREATE INDEX IF NOT EXISTS idx_goals_user_incomplete ON goals(user_id, completed_at) WHERE completed_at IS NULL;

-- Activity logs indexes
-- Index for user's activity logs (sorted by date)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, created_at DESC);

-- Index for specific activity types
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type ON activity_logs(user_id, activity_type);

-- User stats indexes
-- Index for user stats lookup (frequent for energy checks)
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Micro tasks indexes
-- Index for task's micro tasks
CREATE INDEX IF NOT EXISTS idx_micro_tasks_task_id ON micro_tasks(task_id);

-- Composite index for incomplete micro tasks
CREATE INDEX IF NOT EXISTS idx_micro_tasks_incomplete ON micro_tasks(task_id, completed) WHERE completed = false;

-- Milestones indexes
-- Index for goal's milestones
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON milestones(goal_id);

-- Authentication indexes
-- Index for email lookup during login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Query performance views (optional - for monitoring)
-- View to check index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- View to identify missing indexes
CREATE OR REPLACE VIEW missing_indexes AS
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    CASE 
        WHEN seq_scan > 0 THEN 
            ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
        ELSE 0 
    END AS seq_scan_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND seq_scan > idx_scan
ORDER BY seq_scan DESC;

-- Analyze tables after creating indexes
ANALYZE tasks;
ANALYZE skills;
ANALYZE goals;
ANALYZE activity_logs;
ANALYZE user_stats;
ANALYZE micro_tasks;
ANALYZE milestones;
ANALYZE users;
ANALYZE user_profiles;