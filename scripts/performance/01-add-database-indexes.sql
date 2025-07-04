-- Performance optimization: Add missing indexes to improve query speed
-- These indexes will significantly speed up task creation and queries

-- Index for tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, task_category);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_tasks_skill_id ON tasks(skill_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Index for skills table
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_name ON skills(user_id, name);

-- Index for user_stats table
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Index for activity_logs table
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Index for goals table
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_completed ON goals(user_id, completed_at);

-- Analyze tables to update query planner statistics
ANALYZE tasks;
ANALYZE skills;
ANALYZE user_stats;
ANALYZE activity_logs;
ANALYZE goals;