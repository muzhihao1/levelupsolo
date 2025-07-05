# 修复生产环境错误指南

## 问题描述
- 战报API返回500错误
- 页面加载时间过长

## 原因
生产环境数据库缺少`daily_battle_reports`和`pomodoro_sessions`表

## 解决方案

### 方法1：使用Railway数据库控制台（推荐）
1. 登录Railway项目
2. 进入PostgreSQL服务
3. 点击"Connect" → "Query"
4. 复制并执行 `scripts/quick-fix-battle-reports.sql` 文件内容

### 方法2：使用Railway CLI
```bash
# 连接到Railway项目
railway link

# 运行修复脚本
railway run npm run db:fix-battle-reports
```

### 方法3：手动运行SQL
在Railway PostgreSQL查询界面执行以下SQL：

```sql
-- 创建战报表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_daily_battle_reports_user_id ON daily_battle_reports(user_id);
```

## 已优化的功能
1. **缓存策略**：添加了5分钟的数据缓存，减少重复请求
2. **加载状态**：显示加载提示，改善用户体验
3. **错误处理**：战报组件在错误时返回空数据而不是无限重试
4. **性能优化**：减少API请求次数

执行修复后，刷新页面即可正常使用。