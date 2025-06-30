-- Type Consistency Fix Migration Script
-- 类型一致性修复迁移脚本
-- 
-- Purpose: 修复Web端和iOS端之间的数据模型差异
-- Target: PostgreSQL Database
-- 
-- 注意：执行前请先备份数据库！

-- =====================================================
-- Phase 1: 添加缺失的字段
-- =====================================================

-- 1. 为tasks表添加dueDate字段（iOS端已实现，Web端缺失）
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

COMMENT ON COLUMN tasks.due_date IS '任务截止日期，用于任务管理和提醒';

-- 2. 为tasks表添加priority字段（iOS端已实现，Web端缺失）
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1
CHECK (priority >= 0 AND priority <= 5);

COMMENT ON COLUMN tasks.priority IS '任务优先级：0=最低, 5=最高，默认为1';

-- 创建priority索引以优化查询
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- =====================================================
-- Phase 2: 修复枚举类型约束
-- =====================================================

-- 更新taskCategory的约束，支持iOS端的扩展类型
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_task_category_check;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_task_category_check 
CHECK (task_category IN ('habit', 'daily', 'todo', 'mainQuest', 'sideQuest'));

-- =====================================================
-- Phase 3: 数据迁移和默认值设置
-- =====================================================

-- 为现有的主线任务设置较高优先级
UPDATE tasks 
SET priority = 3 
WHERE task_type = 'main' AND priority IS NULL;

-- 为现有的日常任务设置中等优先级
UPDATE tasks 
SET priority = 2 
WHERE task_type IN ('daily', 'stage') AND priority IS NULL;

-- 为现有的简单任务设置较低优先级
UPDATE tasks 
SET priority = 1 
WHERE task_type = 'simple' AND priority IS NULL;

-- 设置合理的默认截止日期（未完成任务设为30天后）
UPDATE tasks 
SET due_date = CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE completed = false 
  AND due_date IS NULL 
  AND task_category != 'habit';

-- =====================================================
-- Phase 4: 添加iOS端可能需要的额外索引
-- =====================================================

-- 复合索引：用户ID + 优先级 + 完成状态
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority_completed 
ON tasks(user_id, priority DESC, completed);

-- 复合索引：用户ID + 截止日期 + 完成状态
CREATE INDEX IF NOT EXISTS idx_tasks_user_duedate_completed 
ON tasks(user_id, due_date, completed);

-- =====================================================
-- Phase 5: 创建数据一致性检查函数
-- =====================================================

-- 创建函数来验证数据一致性
CREATE OR REPLACE FUNCTION check_type_consistency()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- 检查是否所有字段都存在
    RETURN QUERY
    SELECT 
        'Tasks table - due_date field'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'due_date'
        ) THEN 'OK'::TEXT ELSE 'MISSING'::TEXT END,
        'Required for iOS compatibility'::TEXT;
    
    RETURN QUERY
    SELECT 
        'Tasks table - priority field'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'priority'
        ) THEN 'OK'::TEXT ELSE 'MISSING'::TEXT END,
        'Required for iOS compatibility'::TEXT;
    
    -- 检查是否有无效的枚举值
    RETURN QUERY
    SELECT 
        'Task category values'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM tasks 
            WHERE task_category NOT IN ('habit', 'daily', 'todo', 'mainQuest', 'sideQuest')
        ) THEN 'INVALID VALUES FOUND'::TEXT ELSE 'OK'::TEXT END,
        'All values must match iOS enum'::TEXT;
    
    -- 检查优先级范围
    RETURN QUERY
    SELECT 
        'Task priority values'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM tasks 
            WHERE priority IS NOT NULL AND (priority < 0 OR priority > 5)
        ) THEN 'OUT OF RANGE'::TEXT ELSE 'OK'::TEXT END,
        'Priority must be between 0 and 5'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Phase 6: 创建迁移验证报告
-- =====================================================

-- 运行一致性检查
SELECT * FROM check_type_consistency();

-- 显示迁移统计
SELECT 
    'Migration Statistics' as report_type,
    COUNT(*) FILTER (WHERE due_date IS NOT NULL) as tasks_with_due_date,
    COUNT(*) FILTER (WHERE priority IS NOT NULL) as tasks_with_priority,
    COUNT(*) as total_tasks
FROM tasks;

-- =====================================================
-- Rollback Script (保存以备回滚需要)
-- =====================================================
/*
-- 如果需要回滚，运行以下命令：

-- 删除新增的列
ALTER TABLE tasks DROP COLUMN IF EXISTS due_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS priority;

-- 删除新增的索引
DROP INDEX IF EXISTS idx_tasks_priority;
DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_user_priority_completed;
DROP INDEX IF EXISTS idx_tasks_user_duedate_completed;

-- 恢复原始的taskCategory约束
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_task_category_check;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_task_category_check 
CHECK (task_category IN ('habit', 'daily', 'todo'));

-- 删除检查函数
DROP FUNCTION IF EXISTS check_type_consistency();
*/