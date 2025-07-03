# 习惯完成问题的全面解决方案

## 新发现的可能原因

### 1. **Schema 问题**
表可能不在 `public` schema 中：
```sql
-- 错误的查询
UPDATE tasks SET ...

-- 正确的查询
UPDATE public.tasks SET ...
-- 或
UPDATE "levelupsolo".tasks SET ...
```

### 2. **表名大小写敏感**
PostgreSQL 中未加引号的标识符会转为小写，但创建时如果用了引号，就会保持原样：
```sql
-- 这些是不同的表
CREATE TABLE tasks ...        -- 实际表名: tasks
CREATE TABLE "Tasks" ...      -- 实际表名: Tasks
CREATE TABLE "TASKS" ...      -- 实际表名: TASKS
```

### 3. **列名实际不存在**
可能列名完全不同或者根本不存在：
- 可能是 `lastcompleteddate` 而不是 `last_completed_at`
- 可能是 `completions` 而不是 `completion_count`
- 可能这些列在不同的表中

### 4. **数据类型不匹配**
列可能存在但数据类型不兼容：
```sql
-- 如果列是 date 类型而不是 timestamp
UPDATE tasks SET last_completed_at = NOW()  -- 会失败
UPDATE tasks SET last_completed_at = CURRENT_DATE  -- 应该这样
```

### 5. **触发器或规则干扰**
可能有 BEFORE UPDATE 触发器阻止更新。

### 6. **权限问题**
用户可能有 SELECT 权限但没有 UPDATE 权限。

## 终极解决方案

### 方案 A：动态列名检测

```javascript
// 在 server/routes.ts 中添加
app.post('/api/tasks/:id/smart-complete', isAuthenticated, async (req: any, res) => {
  const taskId = parseInt(req.params.id);
  const userId = (req.user as any)?.claims?.sub;
  
  try {
    // 步骤1：动态获取列名
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
        AND (
          column_name ILIKE '%complet%' 
          OR column_name ILIKE '%count%'
          OR column_name ILIKE '%update%'
        )
    `);
    
    console.log('Found columns:', columnCheck.rows);
    
    // 步骤2：构建动态UPDATE语句
    let lastCompletedCol = 'last_completed_at';  // 默认值
    let completionCountCol = 'completion_count';  // 默认值
    
    // 查找实际的列名
    for (const row of columnCheck.rows) {
      const col = row.column_name.toLowerCase();
      if (col.includes('last') && col.includes('complet')) {
        lastCompletedCol = row.column_name;
      } else if (col.includes('complet') && col.includes('count')) {
        completionCountCol = row.column_name;
      }
    }
    
    // 步骤3：执行UPDATE
    const updateQuery = `
      UPDATE tasks 
      SET 
        "${lastCompletedCol}" = NOW(),
        "${completionCountCol}" = COALESCE("${completionCountCol}", 0) + 1
      WHERE id = $1 AND user_id = $2 AND task_category = 'habit'
      RETURNING *
    `;
    
    const result = await db.execute(sql.raw(updateQuery, [taskId, userId]));
    
    if (result.rows.length > 0) {
      return res.json({
        success: true,
        task: result.rows[0],
        debug: {
          lastCompletedCol,
          completionCountCol
        }
      });
    }
    
    res.status(404).json({ message: 'Habit not found' });
    
  } catch (error: any) {
    console.error('Smart complete error:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      detail: error.detail 
    });
  }
});
```

### 方案 B：使用存储过程

在数据库中创建一个存储过程来处理习惯完成：

```sql
CREATE OR REPLACE FUNCTION complete_habit(
  p_task_id INTEGER,
  p_user_id VARCHAR
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- 尝试多种可能的列名组合
  BEGIN
    UPDATE tasks 
    SET last_completed_at = NOW(),
        completion_count = COALESCE(completion_count, 0) + 1
    WHERE id = p_task_id 
      AND user_id = p_user_id 
      AND task_category = 'habit'
    RETURNING row_to_json(tasks.*) INTO v_result;
  EXCEPTION WHEN undefined_column THEN
    -- 尝试其他列名
    UPDATE tasks 
    SET "lastCompletedAt" = NOW(),
        "completionCount" = COALESCE("completionCount", 0) + 1
    WHERE id = p_task_id 
      AND "userId" = p_user_id 
      AND "taskCategory" = 'habit'
    RETURNING row_to_json(tasks.*) INTO v_result;
  END;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

然后在 Node.js 中调用：
```javascript
const result = await db.execute(sql`
  SELECT complete_habit(${taskId}, ${userId})
`);
```

### 方案 C：创建视图统一列名

创建一个视图来标准化列名：

```sql
CREATE OR REPLACE VIEW v_tasks AS
SELECT 
  id,
  COALESCE(user_id, "userId", userid) as user_id,
  title,
  COALESCE(task_category, "taskCategory", taskcategory) as task_category,
  COALESCE(
    last_completed_at, 
    "lastCompletedAt", 
    lastcompletedAt,
    last_completed_date,
    "lastCompletedDate"
  ) as last_completed_at,
  COALESCE(
    completion_count,
    "completionCount",
    completioncount,
    completions
  ) as completion_count
FROM tasks;
```

### 方案 D：Railway 环境变量解决方案

添加这些环境变量来指定实际的列名：

```bash
# 在 Railway 中设置
DB_COLUMN_LAST_COMPLETED=lastCompletedAt
DB_COLUMN_COMPLETION_COUNT=completionCount
DB_COLUMN_USER_ID=userId
DB_COLUMN_TASK_CATEGORY=taskCategory
```

然后在代码中使用：
```javascript
const cols = {
  lastCompleted: process.env.DB_COLUMN_LAST_COMPLETED || 'last_completed_at',
  completionCount: process.env.DB_COLUMN_COMPLETION_COUNT || 'completion_count',
  userId: process.env.DB_COLUMN_USER_ID || 'user_id',
  taskCategory: process.env.DB_COLUMN_TASK_CATEGORY || 'task_category'
};

const updateQuery = `
  UPDATE tasks 
  SET 
    "${cols.lastCompleted}" = NOW(),
    "${cols.completionCount}" = COALESCE("${cols.completionCount}", 0) + 1
  WHERE id = $1 
    AND "${cols.userId}" = $2 
    AND "${cols.taskCategory}" = 'habit'
`;
```

## 立即可用的临时方案

### 1. 使用 activity_logs 表代替

如果 tasks 表的列有问题，可以将完成记录保存到 activity_logs 表：

```javascript
// 记录习惯完成到活动日志
await db.execute(sql`
  INSERT INTO activity_logs (user_id, task_id, action, exp_gained, created_at)
  VALUES (${userId}, ${taskId}, 'habit_completed', 20, NOW())
`);
```

### 2. 使用 JSONB 列存储额外数据

如果表结构无法修改，可以使用 JSONB 列：

```sql
UPDATE tasks 
SET details = jsonb_set(
  COALESCE(details, '{}'),
  '{lastCompletedAt,completionCount}',
  jsonb_build_object(
    'lastCompletedAt', NOW(),
    'completionCount', COALESCE(details->>'completionCount', '0')::int + 1
  )
)
WHERE id = $1;
```

## 调试步骤

1. **先测试基础连接**：
   ```
   https://www.levelupsolo.net/api/health
   ```

2. **检查表结构**（使用 SQL 客户端）：
   ```sql
   \d tasks
   -- 或
   SELECT * FROM tasks LIMIT 0;
   ```

3. **尝试最简单的更新**：
   ```sql
   UPDATE tasks SET title = title WHERE id = 140;
   ```

4. **逐步增加复杂度**：
   ```sql
   UPDATE tasks SET updated_at = NOW() WHERE id = 140;
   ```

## 结论

问题的根本原因很可能是：
1. 列名实际形式与代码中的不匹配
2. 表不在预期的 schema 中
3. 列根本不存在

建议先通过 Supabase 控制台直接查看表结构，确认实际的列名和数据类型。