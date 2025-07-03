# Activity Logs 500错误修复指南

## 问题诊断

### 根本原因
1. **activity_logs表不存在**：生产数据库中缺少activity_logs表
2. **自动创建失败**：虽然代码中有自动创建逻辑，但由于以下原因失败：
   - 动态require导入在生产环境可能失败
   - 错误处理逻辑在已有错误的上下文中创建表
   - 可能缺少CREATE TABLE权限

### 具体问题分析

#### 1. 代码结构问题
- 原代码在错误处理块内使用动态require
- 在数据库连接已经出错的情况下尝试创建表
- 错误消息匹配不够可靠

#### 2. Railway环境特殊性
- 可能限制了DDL权限
- 连接池可能已经耗尽
- SSL连接配置问题

## 解决方案

### 1. 立即修复（手动创建表）

在Railway控制台运行：
```bash
npm run db:create-activity-logs
```

或者直接在Railway的数据库控制台执行：
```sql
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT NOW(),
    task_id INTEGER,
    skill_id INTEGER,
    exp_gained INTEGER NOT NULL DEFAULT 0,
    action TEXT NOT NULL,
    description TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, date DESC);

-- 添加外键（如果需要）
ALTER TABLE activity_logs 
ADD CONSTRAINT fk_activity_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE;
```

### 2. 长期解决方案（已实施）

#### a) 创建了专门的错误处理模块
- `server/fix-activity-logs.ts` - 安全的activity logs获取函数
- 包含完整的错误处理和表创建逻辑
- 使用事务确保原子性

#### b) 启动时自动迁移
- `server/startup-migrations.ts` - 启动时运行的迁移脚本
- 在`server/index.ts`中集成，应用启动时自动运行
- 即使迁移失败也不会阻止应用启动

#### c) 改进的API端点
- 使用新的`safeGetActivityLogs`函数
- 更好的错误处理和用户友好的错误消息
- 权限错误单独处理（403状态码）

### 3. 验证修复

1. **检查表是否存在**：
```bash
curl https://levelupsolo-production.up.railway.app/api/debug/activity-logs
```

2. **测试API端点**：
```bash
curl -H "Cookie: your-auth-cookie" https://levelupsolo-production.up.railway.app/api/activity-logs
```

3. **查看服务器日志**：
- 查找"Activity logs table created successfully"
- 查找"Database permission error"等错误消息

### 4. 预防措施

1. **使用数据库迁移工具**：
   - 考虑使用Drizzle Kit的迁移功能
   - 在部署前运行迁移脚本

2. **监控和告警**：
   - 设置数据库错误监控
   - 为500错误设置告警

3. **权限检查**：
   - 确保数据库用户有CREATE TABLE权限
   - 或者使用管理员账户预先创建所有表

## 环境变量检查

确保Railway环境中设置了：
- `DATABASE_URL` 或 `SUPABASE_DATABASE_URL`
- 正确的SSL配置（生产环境应该是`require`）

## 回滚计划

如果新的修复导致问题：
1. 恢复`server/routes.ts`中的原始代码
2. 删除`server/fix-activity-logs.ts`
3. 从`server/index.ts`中移除迁移调用

## 测试命令

```bash
# 本地测试
npm run dev
curl http://localhost:3000/api/activity-logs

# 生产测试
curl https://levelupsolo-production.up.railway.app/api/activity-logs

# 手动创建表
npm run db:create-activity-logs

# 运行所有迁移
npm run db:migrate
```