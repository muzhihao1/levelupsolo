# 快速修复步骤

## 第1步：复制这段SQL

```sql
-- 一键修复习惯完成问题
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0;

-- 验证是否成功
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
    AND column_name IN ('last_completed_at', 'completion_count');
```

## 第2步：在Supabase执行

1. 打开 https://app.supabase.com
2. 选择你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 粘贴上面的SQL代码
5. 点击 **RUN** 按钮

## 第3步：看到结果

执行后应该看到：
```
column_name        | data_type
-------------------|---------------------------
completion_count   | integer
last_completed_at  | timestamp without time zone
```

## 第4步：测试

回到你的应用，点击完成任何习惯，应该成功了！

---

如果还有问题，运行这个检查：

```sql
-- 检查所有列
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;
```

把结果截图发给我。