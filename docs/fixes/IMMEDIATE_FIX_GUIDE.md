# 立即修复习惯完成问题

## 问题根源
数据库中**缺少以下两列**：
- `last_completed_at` - 最后完成时间
- `completion_count` - 完成次数

## 解决方案（两选一）

### 方案 A：添加缺失的列（推荐）

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 运行以下 SQL：

```sql
-- 添加缺失的列
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0;

-- 验证列已添加
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name IN ('last_completed_at', 'completion_count');
```

4. 确认看到两列都存在后，习惯完成应该立即生效

### 方案 B：等待代码部署（约3分钟）

我已经修改了代码，使其能够：
- 动态检查哪些列存在
- 如果缺少 completion tracking 列，使用 `completed_at` 代替
- 适应各种列名变体

部署完成后，即使没有这些列也能完成习惯。

## 验证修复

1. 尝试完成任意习惯
2. 应该立即成功，无 500 错误
3. 查看 Railway 日志确认

## 为什么会发生这个问题？

- 代码期望存在 `last_completed_at` 和 `completion_count` 列
- 但生产数据库中这些列不存在
- PostgreSQL 报错：column does not exist (错误代码 42703)

## 长期建议

运行完整的 `ADD_MISSING_COLUMNS.sql` 脚本，确保所有功能正常：
- 习惯连击计数
- 最后完成时间追踪
- 每日重置检测