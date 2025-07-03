-- 紧急修复：添加缺失的列
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 首先检查哪些列存在
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
    AND column_name IN ('last_completed_at', 'completion_count', 'lastCompletedAt', 'completionCount')
ORDER BY column_name;

-- 2. 添加缺失的列（如果不存在）
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0;

-- 3. 如果列名是 camelCase，复制数据到 snake_case（可选）
DO $$ 
BEGIN
    -- 如果有 lastCompletedAt 列，同步数据
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'lastCompletedAt'
    ) THEN
        UPDATE tasks 
        SET last_completed_at = "lastCompletedAt"
        WHERE last_completed_at IS NULL AND "lastCompletedAt" IS NOT NULL;
    END IF;
    
    -- 如果有 completionCount 列，同步数据
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'completionCount'
    ) THEN
        UPDATE tasks 
        SET completion_count = "completionCount"
        WHERE completion_count = 0 AND "completionCount" > 0;
    END IF;
END $$;

-- 4. 验证列已添加
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
    AND column_name IN ('last_completed_at', 'completion_count')
ORDER BY column_name;

-- 5. 测试更新（使用你的实际任务ID）
-- UPDATE tasks 
-- SET 
--     last_completed_at = NOW(),
--     completion_count = COALESCE(completion_count, 0) + 1
-- WHERE id = 165
-- RETURNING id, title, last_completed_at, completion_count;