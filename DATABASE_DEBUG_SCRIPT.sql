-- 全面的数据库调试脚本
-- 用于诊断习惯完成失败的所有可能原因

-- 1. 检查当前schema
SELECT current_schema();

-- 2. 列出所有schema中的tasks表
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'tasks' OR tablename = 'Tasks' OR tablename = '"tasks"';

-- 3. 检查public.tasks表的所有列（包括隐藏列）
SELECT 
    attname as column_name,
    atttypid::regtype as data_type,
    attnotnull as not_null,
    attisdropped as is_dropped,
    attnum as column_number
FROM pg_attribute
WHERE attrelid = 'public.tasks'::regclass
    AND attnum > 0
ORDER BY attnum;

-- 4. 检查表名的精确形式（区分大小写）
SELECT 
    nspname as schema_name,
    relname as exact_table_name,
    relkind as table_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE relname ILIKE '%tasks%'
    AND relkind = 'r';

-- 5. 检查列名的精确形式（区分大小写）
SELECT 
    column_name,
    '|' || column_name || '|' as exact_column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
    AND column_name ILIKE '%complet%'
ORDER BY ordinal_position;

-- 6. 检查是否有触发器
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tasks';

-- 7. 检查约束
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.tasks'::regclass;

-- 8. 测试不同的UPDATE语法
-- 测试1: 最基础的UPDATE
UPDATE tasks SET id = id WHERE id = -999999;

-- 测试2: 带schema的UPDATE
UPDATE public.tasks SET id = id WHERE id = -999999;

-- 测试3: 检查NOW()函数
SELECT NOW(), CURRENT_TIMESTAMP;

-- 9. 检查用户权限
SELECT 
    privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'tasks' 
    AND grantee = current_user;

-- 10. 检查连接参数
SELECT 
    current_database(),
    current_user,
    current_schema(),
    version();

-- 11. 尝试创建缺失的列（如果需要）
DO $$ 
BEGIN
    -- 检查last_completed_at列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name IN ('last_completed_at', 'lastCompletedAt', 'lastcompletedAt')
    ) THEN
        RAISE NOTICE 'Column last_completed_at does not exist!';
        -- 可以在这里添加 ALTER TABLE 语句
    END IF;
    
    -- 检查completion_count列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name IN ('completion_count', 'completionCount', 'completioncount')
    ) THEN
        RAISE NOTICE 'Column completion_count does not exist!';
        -- 可以在这里添加 ALTER TABLE 语句
    END IF;
END $$;

-- 12. 显示实际的UPDATE语句应该是什么样的
SELECT 
    'UPDATE ' || table_schema || '.' || table_name || ' SET ' ||
    string_agg(
        CASE 
            WHEN column_name LIKE '%completed%' THEN '"' || column_name || '" = NOW()'
            WHEN column_name LIKE '%completion%' THEN '"' || column_name || '" = COALESCE("' || column_name || '", 0) + 1'
        END, 
        ', '
    ) || ' WHERE id = $1'
    as suggested_update_query
FROM information_schema.columns
WHERE table_name = 'tasks'
    AND column_name ILIKE ANY(ARRAY['%complet%', '%update%'])
GROUP BY table_schema, table_name;