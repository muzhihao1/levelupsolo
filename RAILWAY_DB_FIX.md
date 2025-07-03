# Railway 数据库连接问题修复指南

## 问题描述

从 Railway 日志可以看到以下问题：
- 数据库连接被终止 (`_ending: true`, `_queryable: false`)
- 不断创建新连接 ("New client connected to pool")
- API 响应时间过长 (4-5秒)
- 习惯完成时返回 500 错误

## 根本原因

Supabase Pooler 连接有以下限制：
1. 连接数限制（通常为 10-20 个）
2. 连接超时限制
3. 会话模式 vs 事务模式的差异

## 解决方案

### 方案 1：在 Railway 设置环境变量（推荐）

在 Railway 项目设置中添加：

```bash
USE_CONNECTION_POOL=false
```

这会禁用连接池，使用单独的数据库连接。

### 方案 2：更换数据库连接字符串

1. 登录 Supabase Dashboard
2. 进入 Settings → Database
3. 使用 **Direct connection** 而不是 **Session pooler**：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

### 方案 3：临时解决方案

使用调试页面完成习惯：

1. 访问: `https://www.levelupsolo.net/debug-habits.html`
2. 点击"测试连接"检查数据库状态
3. 使用"直接完成习惯"功能（输入习惯ID如 140）

### 方案 4：优化连接池配置

如果必须使用连接池，在 Railway 环境变量中设置：

```bash
# 数据库连接池配置
DB_POOL_MAX=5          # 最大连接数
DB_POOL_MIN=1          # 最小连接数
DB_POOL_IDLE_TIMEOUT=10000  # 空闲超时（毫秒）
```

## 验证步骤

1. **检查数据库连接**：
   ```
   curl https://www.levelupsolo.net/api/debug/db-test
   ```

2. **查看连接池状态**：
   检查返回的 `poolHealth` 对象

3. **测试习惯完成**：
   使用调试页面的"测试完成"功能

## 长期解决方案

1. **使用 Supabase Edge Functions**：
   - 将数据库操作移到 Edge Functions
   - 避免直接从应用连接数据库

2. **使用 Prisma Data Proxy**：
   - 提供更好的连接管理
   - 自动处理连接池

3. **升级 Supabase 计划**：
   - 获得更多连接数
   - 更好的性能

## 监控建议

1. 在 Railway 添加以下环境变量以启用详细日志：
   ```bash
   DEBUG=pg:*
   LOG_LEVEL=debug
   ```

2. 监控以下指标：
   - 数据库连接数
   - API 响应时间
   - 错误率

## 紧急联系

如果问题持续，请检查：
1. Supabase 状态页面: https://status.supabase.com/
2. Railway 状态页面: https://status.railway.app/
3. 查看 Railway 实时日志获取最新错误信息