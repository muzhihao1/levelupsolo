-- Level Up Solo 数据库架构
-- 适用于 Supabase PostgreSQL

-- 1. 用户会话表
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- 2. 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 用户资料表
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  age TEXT,
  occupation TEXT,
  mission TEXT,
  has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE,
  has_completed_tutorial BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. 用户统计表
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
  level INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0,
  experience_to_next INTEGER NOT NULL DEFAULT 100,
  energy_balls INTEGER NOT NULL DEFAULT 18,
  max_energy_balls INTEGER NOT NULL DEFAULT 18,
  energy_ball_duration INTEGER NOT NULL DEFAULT 15,
  energy_peak_start INTEGER NOT NULL DEFAULT 9,
  energy_peak_end INTEGER NOT NULL DEFAULT 12,
  streak INTEGER NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  last_energy_reset TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. 技能表
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0,
  max_exp INTEGER NOT NULL DEFAULT 100,
  color TEXT NOT NULL DEFAULT '#6366F1',
  icon TEXT NOT NULL DEFAULT 'fas fa-star',
  skill_type TEXT NOT NULL DEFAULT 'basic',
  category TEXT NOT NULL DEFAULT 'general',
  talent_points INTEGER NOT NULL DEFAULT 0,
  prestige INTEGER NOT NULL DEFAULT 0,
  unlocked BOOLEAN NOT NULL DEFAULT TRUE,
  prerequisites INTEGER[]
);

-- 6. 目标表
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  progress REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  target_date TIMESTAMP,
  parent_goal_id INTEGER,
  exp_reward INTEGER NOT NULL DEFAULT 100,
  skill_id INTEGER REFERENCES skills(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 7. 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  skill_id INTEGER REFERENCES skills(id),
  goal_id INTEGER REFERENCES goals(id),
  goal_tags TEXT[],
  exp_reward INTEGER NOT NULL DEFAULT 0,
  estimated_duration INTEGER DEFAULT 25,
  actual_duration INTEGER,
  accumulated_time INTEGER DEFAULT 0,
  pomodoro_session_id TEXT,
  started_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  task_category TEXT NOT NULL DEFAULT 'todo',
  task_type TEXT NOT NULL DEFAULT 'simple',
  parent_task_id INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  required_energy_balls INTEGER NOT NULL DEFAULT 1,
  last_completed_at TIMESTAMP,
  completion_count INTEGER NOT NULL DEFAULT 0
);

-- 8. 微任务表
CREATE TABLE IF NOT EXISTS micro_tasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. 里程碑表
CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  progress REAL NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 10. 活动日志表
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  exp_gained INTEGER NOT NULL DEFAULT 0,
  task_id INTEGER REFERENCES tasks(id),
  skill_id INTEGER REFERENCES skills(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. 成就表
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  progress REAL NOT NULL DEFAULT 0,
  max_progress REAL NOT NULL DEFAULT 100,
  rarity TEXT NOT NULL DEFAULT 'common',
  exp_reward INTEGER NOT NULL DEFAULT 0
);

-- 12. 目标任务关联表
CREATE TABLE IF NOT EXISTS goal_tasks (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE(goal_id, task_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();