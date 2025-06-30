# Railway Deployment Guide for Level Up Solo

## 概述
本指南详细说明如何在 Railway 平台部署 Level Up Solo 应用。Railway 是一个现代化的云平台，提供简单的部署流程和自动扩展功能。

## 前置要求

- Railway 账号 (https://railway.app)
- GitHub 账号（用于连接仓库）
- PostgreSQL 数据库（Railway 提供）
- 环境变量准备完毕

## 部署步骤

### 1. 创建 Railway 项目

1. 登录 Railway Dashboard
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权 Railway 访问你的 GitHub
5. 选择 `level-up-solo` 仓库

### 2. 配置数据库

#### 添加 PostgreSQL 服务
```bash
# 在 Railway 项目中
1. 点击 "New" -> "Database" -> "Add PostgreSQL"
2. Railway 会自动创建数据库并生成 DATABASE_URL
```

#### 初始化数据库结构
```bash
# 本地运行，使用 Railway 的 DATABASE_URL
DATABASE_URL="your-railway-database-url" npm run db:push
```

### 3. 环境变量配置

在 Railway 项目设置中添加以下环境变量：

```env
# 数据库（自动生成）
DATABASE_URL=postgresql://user:password@host:port/database

# 认证相关
SESSION_SECRET=your-session-secret-min-32-chars
JWT_SECRET=your-jwt-secret-min-32-chars

# OpenAI API
OPENAI_API_KEY=sk-...

# 应用配置
NODE_ENV=production
PORT=3000

# 域名配置（如果有自定义域名）
APP_URL=https://www.levelupsolo.net
```

#### 生成安全的密钥
```bash
# 生成 SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 构建配置

确保 `railway.json` 文件正确配置：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build:railway"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 5. 部署设置

#### 自动部署
1. 在 Railway 项目设置中启用 "Auto Deploy"
2. 选择要监听的分支（通常是 `main` 或 `production`）
3. 每次推送到该分支时会自动部署

#### 手动部署
```bash
# 使用 Railway CLI
railway up

# 或在 Dashboard 中点击 "Deploy"
```

### 6. 自定义域名配置

1. 在 Railway 项目的 "Settings" -> "Domains"
2. 点击 "Add Custom Domain"
3. 输入你的域名（如 `www.levelupsolo.net`）
4. 在你的 DNS 提供商添加 CNAME 记录：
   ```
   Type: CNAME
   Name: www
   Value: your-app.up.railway.app
   ```

### 7. 健康检查

部署完成后，验证应用状态：

```bash
# 检查健康端点
curl https://your-app.railway.app/api/health

# 期望响应
{
  "status": "ok",
  "database": {
    "status": "connected"
  }
}
```

## 故障排除

### 常见问题

#### 1. 登录功能失效
**症状**: 用户无法登录，返回 401 或 500 错误
**解决方案**:
- 检查 `SESSION_SECRET` 是否设置
- 验证 `JWT_SECRET` 是否设置
- 确保 `NODE_ENV=production`
- 检查 CORS 设置是否包含你的域名

#### 2. 数据库连接失败
**症状**: 500 错误，日志显示 "Database not initialized"
**解决方案**:
- 验证 `DATABASE_URL` 格式正确
- 运行 `npm run db:push` 创建表结构
- 检查数据库服务是否正常运行

#### 3. 构建失败
**症状**: 部署时构建步骤失败
**解决方案**:
- 检查 Node.js 版本要求 (>=18.0.0)
- 确保所有依赖都在 `package.json` 中
- 查看构建日志找出具体错误

#### 4. 内存不足
**症状**: 应用崩溃，显示 "JavaScript heap out of memory"
**解决方案**:
```bash
# 在环境变量中添加
NODE_OPTIONS=--max-old-space-size=2048
```

### 日志查看

```bash
# 使用 Railway CLI
railway logs

# 或在 Dashboard 中查看 "Logs" 标签
```

### 性能监控

1. 在 Railway Dashboard 查看：
   - CPU 使用率
   - 内存使用
   - 网络流量
   - 响应时间

2. 设置告警：
   - 当 CPU > 80% 时
   - 当内存 > 90% 时
   - 当错误率 > 5% 时

## 生产环境最佳实践

### 1. 安全配置
```javascript
// 确保生产环境的安全头
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

### 2. 数据库优化
- 启用连接池
- 设置合理的超时时间
- 定期备份数据

### 3. 缓存策略
- 使用 Redis 缓存频繁查询
- 设置静态资源缓存头
- 实现 API 响应缓存

### 4. 扩展配置
```json
{
  "deploy": {
    "numReplicas": 2,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  }
}
```

## 备份和恢复

### 自动备份
Railway PostgreSQL 自动每日备份，保留 7 天

### 手动备份
```bash
# 导出数据库
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql $DATABASE_URL < backup_20240101.sql
```

## 监控和告警

### 集成监控服务
1. **Sentry**（错误追踪）
   ```javascript
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: "production",
   });
   ```

2. **Datadog/New Relic**（APM）
   - 添加相应的环境变量
   - 安装监控 agent

### 自定义健康检查
```javascript
// 添加详细的健康检查
app.get('/api/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    external_apis: await checkExternalAPIs(),
  };
  
  res.json({
    status: Object.values(checks).every(c => c.healthy) ? 'healthy' : 'degraded',
    checks
  });
});
```

## 更新流程

### 零停机部署
1. Railway 自动使用滚动更新
2. 新版本启动并通过健康检查后才切换流量
3. 旧版本保持运行直到所有请求完成

### 数据库迁移
```bash
# 1. 创建迁移脚本
npm run db:generate

# 2. 在部署前运行迁移
railway run npm run db:migrate

# 3. 部署新代码
railway up
```

## 成本优化

### Railway 定价
- **Hobby Plan**: $5/月（包含 $5 使用额度）
- **Pro Plan**: $20/月（包含 $20 使用额度）

### 优化建议
1. 使用合适的实例大小
2. 实现自动扩展策略
3. 优化数据库查询减少 CPU 使用
4. 使用 CDN 分发静态资源

## 应急预案

### 回滚步骤
1. 在 Railway Dashboard 中找到之前的部署
2. 点击 "Redeploy" 回滚到该版本
3. 或使用 CLI: `railway rollback`

### 紧急联系
- Railway 状态页面: https://status.railway.app
- Railway Discord: https://discord.gg/railway
- 项目维护者: [your-contact]

## 检查清单

部署前检查：
- [ ] 所有环境变量已设置
- [ ] 数据库已初始化
- [ ] 构建脚本测试通过
- [ ] 健康检查端点正常

部署后验证：
- [ ] 应用可访问
- [ ] 登录功能正常
- [ ] API 响应正常
- [ ] 错误率在可接受范围
- [ ] 性能指标正常

## 总结

Railway 提供了简单而强大的部署体验。遵循本指南可以确保 Level Up Solo 在生产环境中稳定运行。记住定期检查日志、监控性能，并保持依赖更新。