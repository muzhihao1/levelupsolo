# Supabase 数据库迁移指南

## 修复战报功能 500 错误

### 方法 1: 使用 Supabase Dashboard SQL 编辑器（推荐）

1. **登录 Supabase Dashboard**
   - 访问 https://app.supabase.com
   - 选择项目: `ooepnnsbmtyrcqlqykkr`

2. **打开 SQL 编辑器**
   - 在左侧菜单中点击 "SQL Editor"
   - 点击 "New query" 创建新查询

3. **运行迁移脚本**
   - 复制以下 SQL 并粘贴到编辑器中：

```sql
-- 修复战报功能的数据库表
-- 1. 创建每日战报表
CREATE TABLE IF NOT EXISTS daily_battle_reports (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    date TIMESTAMP NOT NULL,
    total_battle_time INTEGER DEFAULT 0,
    energy_balls_consumed INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    pomodoro_cycles INTEGER DEFAULT 0,
    task_details JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 创建唯一约束
ALTER TABLE daily_battle_reports 
ADD CONSTRAINT daily_battle_reports_user_date_unique 
UNIQUE(user_id, date);

-- 3. 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_user_id ON daily_battle_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_date ON daily_battle_reports(date DESC);

-- 4. 创建番茄钟会话表
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    task_id INTEGER,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP DEFAULT NULL,
    work_duration INTEGER DEFAULT 0,
    rest_duration INTEGER DEFAULT 0,
    cycles_completed INTEGER DEFAULT 0,
    actual_energy_balls INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 创建番茄钟会话的索引
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);

-- 6. 为任务表添加缺失的列（如果不存在）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_energy_balls INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pomodoro_cycles INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS battle_start_time TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS battle_end_time TIMESTAMP;

-- 7. 创建更新时间戳的触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. 为 daily_battle_reports 表添加更新时间戳触发器
DROP TRIGGER IF EXISTS update_daily_battle_reports_updated_at ON daily_battle_reports;
CREATE TRIGGER update_daily_battle_reports_updated_at 
BEFORE UPDATE ON daily_battle_reports 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 验证表已创建
SELECT 'Tables created successfully!' as status;
```

4. **执行脚本**
   - 点击 "Run" 按钮执行 SQL
   - 等待执行完成，确认看到 "Tables created successfully!" 消息

### 方法 2: 使用 Drizzle Kit 迁移

如果您想使用项目的 Drizzle 迁移系统：

```bash
# 1. 确保环境变量设置正确
export DATABASE_URL="postgresql://postgres.ooepnnsbmtyrcqlqykkr:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# 2. 运行 Drizzle 迁移
npm run db:push

# 3. 或者运行特定的修复脚本
npm run db:fix-battle-reports
```

### 验证迁移成功

1. **在 Supabase Dashboard 验证**
   - 在 "Table Editor" 中查看是否有以下表：
     - `daily_battle_reports`
     - `pomodoro_sessions`
   - 检查 `tasks` 表是否有新列

2. **测试应用**
   - 刷新您的应用页面
   - 战报功能应该正常工作，不再出现 500 错误

### 注意事项

- Supabase 项目 ID: `ooepnnsbmtyrcqlqykkr`
- 区域: Tokyo (ap-northeast-1)
- 使用 Session Pooler 连接以避免连接限制
- 如果遇到权限问题，确保您使用的是具有创建表权限的数据库用户

### 故障排除

如果迁移后仍有问题：

1. **检查日志**
   - 在 Supabase Dashboard 的 "Logs" → "Postgres" 查看错误日志

2. **验证连接**
   ```bash
   # 测试数据库连接
   npm run db:studio
   ```

3. **清理缓存**
   - 清除浏览器缓存
   - 重启应用服务器

迁移完成后，您的战报功能应该可以正常使用了！