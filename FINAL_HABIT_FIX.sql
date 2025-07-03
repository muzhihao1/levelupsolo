-- 最终修复方案：确保习惯功能正常工作

-- 1. 首先检查现有的列
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- 2. 添加所有缺失但必要的列
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 3. 为了兼容性，如果有 camelCase 列，同步数据
DO $$ 
BEGIN
    -- 检查是否有 camelCase 版本的列
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name IN ('lastCompletedAt', 'completionCount', 'updatedAt')
    ) THEN
        -- 同步数据到 snake_case 列
        UPDATE tasks 
        SET 
            last_completed_at = COALESCE(last_completed_at, "lastCompletedAt"),
            completion_count = COALESCE(completion_count, "completionCount", 0)
        WHERE last_completed_at IS NULL OR completion_count = 0;
    END IF;
END $$;

-- 4. 创建一个存储过程来安全地完成习惯
CREATE OR REPLACE FUNCTION complete_habit_safe(
    p_task_id INTEGER,
    p_user_id VARCHAR
) RETURNS TABLE (
    id INTEGER,
    title TEXT,
    completed BOOLEAN,
    last_completed_at TIMESTAMP,
    completion_count INTEGER
) AS $$
BEGIN
    -- 先检查任务是否存在
    IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = p_task_id 
        AND tasks.user_id = p_user_id 
        AND tasks.task_category = 'habit'
    ) THEN
        RAISE EXCEPTION 'Habit not found or not authorized';
    END IF;
    
    -- 更新习惯
    RETURN QUERY
    UPDATE tasks 
    SET 
        completed = true,
        completed_at = NOW(),
        last_completed_at = NOW(),
        completion_count = COALESCE(tasks.completion_count, 0) + 1,
        updated_at = NOW()
    WHERE 
        tasks.id = p_task_id 
        AND tasks.user_id = p_user_id
        AND tasks.task_category = 'habit'
    RETURNING 
        tasks.id,
        tasks.title,
        tasks.completed,
        tasks.last_completed_at,
        tasks.completion_count;
END;
$$ LANGUAGE plpgsql;

-- 5. 测试函数（替换成你的实际值）
-- SELECT * FROM complete_habit_safe(140, 'YOUR_USER_ID');

-- 6. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_tasks_user_category 
ON tasks(user_id, task_category) 
WHERE task_category = 'habit';

-- 7. 验证修复
SELECT 
    'Columns Check' as check_type,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'last_completed_at') as last_completed_at_exists,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completion_count') as completion_count_exists,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'updated_at') as updated_at_exists;