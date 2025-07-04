-- 立即在 Supabase 运行这个 SQL 解决问题

-- 1. 添加缺失的列
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0;

-- 2. 确认添加成功
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name IN ('last_completed_at', 'completion_count');

-- 运行后应该看到：
-- column_name        | data_type
-- -------------------|--------------------
-- completion_count   | integer
-- last_completed_at  | timestamp without time zone