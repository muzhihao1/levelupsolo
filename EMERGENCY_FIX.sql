-- 紧急修复脚本：在 Supabase SQL Editor 中运行

-- 1. 首先检查 tasks 表的实际结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- 2. 如果缺少必要的列，添加它们
DO $$ 
BEGIN
    -- 检查并添加 last_completed_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'last_completed_at'
    ) THEN
        -- 检查是否有其他形式的该列
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND column_name = 'lastCompletedAt'
        ) THEN
            -- 如果是 camelCase，创建一个别名列
            ALTER TABLE tasks ADD COLUMN last_completed_at TIMESTAMP;
            UPDATE tasks SET last_completed_at = "lastCompletedAt";
        ELSE
            -- 完全没有这个列，创建新列
            ALTER TABLE tasks ADD COLUMN last_completed_at TIMESTAMP;
        END IF;
    END IF;
    
    -- 检查并添加 completion_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'completion_count'
    ) THEN
        -- 检查是否有其他形式的该列
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND column_name = 'completionCount'
        ) THEN
            -- 如果是 camelCase，创建一个别名列
            ALTER TABLE tasks ADD COLUMN completion_count INTEGER DEFAULT 0;
            UPDATE tasks SET completion_count = "completionCount";
        ELSE
            -- 完全没有这个列，创建新列
            ALTER TABLE tasks ADD COLUMN completion_count INTEGER DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 3. 创建一个函数来处理习惯完成（兼容多种列名）
CREATE OR REPLACE FUNCTION complete_habit_universal(
    p_task_id INTEGER,
    p_user_id VARCHAR
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_column_info TEXT;
BEGIN
    -- 获取实际存在的列
    SELECT string_agg(column_name, ', ') INTO v_column_info
    FROM information_schema.columns
    WHERE table_name = 'tasks'
    AND column_name ILIKE '%complet%';
    
    RAISE NOTICE 'Found completion-related columns: %', v_column_info;
    
    -- 尝试更新（处理各种可能的列名）
    EXECUTE format('
        UPDATE tasks 
        SET %s
        WHERE id = $1 
        AND %s = $2 
        AND %s = ''habit''
        RETURNING row_to_json(tasks.*)',
        -- SET clause
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'last_completed_at') 
            THEN 'last_completed_at = NOW(), completion_count = COALESCE(completion_count, 0) + 1'
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'lastCompletedAt') 
            THEN '"lastCompletedAt" = NOW(), "completionCount" = COALESCE("completionCount", 0) + 1'
            ELSE 'updated_at = NOW()' -- 最低限度的更新
        END,
        -- user_id column
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'user_id') 
            THEN 'user_id'
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'userId') 
            THEN '"userId"'
            ELSE 'user_id'
        END,
        -- task_category column
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'task_category') 
            THEN 'task_category'
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'taskCategory') 
            THEN '"taskCategory"'
            ELSE 'task_category'
        END
    ) INTO v_result USING p_task_id, p_user_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 4. 测试函数（替换为实际的任务ID和用户ID）
-- SELECT complete_habit_universal(140, 'YOUR_USER_ID');

-- 5. 创建触发器自动同步 camelCase 和 snake_case 列（如果两种都存在）
CREATE OR REPLACE FUNCTION sync_task_columns() RETURNS TRIGGER AS $$
BEGIN
    -- 同步 last_completed_at
    IF TG_OP = 'UPDATE' THEN
        IF NEW.last_completed_at IS DISTINCT FROM OLD.last_completed_at THEN
            NEW."lastCompletedAt" = NEW.last_completed_at;
        ELSIF NEW."lastCompletedAt" IS DISTINCT FROM OLD."lastCompletedAt" THEN
            NEW.last_completed_at = NEW."lastCompletedAt";
        END IF;
        
        -- 同步 completion_count
        IF NEW.completion_count IS DISTINCT FROM OLD.completion_count THEN
            NEW."completionCount" = NEW.completion_count;
        ELSIF NEW."completionCount" IS DISTINCT FROM OLD."completionCount" THEN
            NEW.completion_count = NEW."completionCount";
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 仅在需要时创建触发器
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'last_completed_at'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'lastCompletedAt'
    ) THEN
        DROP TRIGGER IF EXISTS sync_task_columns_trigger ON tasks;
        CREATE TRIGGER sync_task_columns_trigger
        BEFORE UPDATE ON tasks
        FOR EACH ROW
        EXECUTE FUNCTION sync_task_columns();
    END IF;
END $$;

-- 6. 显示最终的表结构
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name ILIKE '%complet%' THEN '*** COMPLETION RELATED ***'
        WHEN column_name ILIKE '%count%' THEN '*** COUNT RELATED ***'
        ELSE ''
    END as note
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;