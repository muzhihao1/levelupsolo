# Railway 部署故障排除指南

## 📋 问题总览

**问题描述**：Railway 部署后出现数据库连接失败和前端 404 错误
**解决时间**：2025-06-30
**影响范围**：完整的 Web 应用功能
**最终状态**：✅ 完全解决

**🚨 重大更新 (2025-06-30)**：发现并解决关键问题 - Railway 运行错误的服务器文件 ✅  
**更新 (2024-01-30)**：登录认证问题也已成功解决 ✅

## 🚨 问题现象

### 0. 🔥 CRITICAL: 错误的服务器文件（2025-06-30 发现）
```bash
# 症状：API 端点返回 HTML 而非 JSON
curl https://levelupsolo-production.up.railway.app/api/skills
# 返回 HTML 页面而不是技能数据

# 但健康检查正常
curl https://levelupsolo-production.up.railway.app/api/health
# 正常返回 JSON
```

**前端错误**：
```javascript
// 浏览器控制台错误
GlobalFloatingTimer: not rendering because Object
Cannot read properties of undefined (reading 'filter')
// 技能树组件无法正常工作
```

### 1. 数据库相关
```json
{
  "mode": "demo-only",
  "database": {
    "status": "disabled",
    "reason": "Using in-memory storage for demo"
  }
}
```

### 2. 前端相关
```
{"error":"Application not built. Run 'npm run build:client'"}
levelupsolo-production.up.railway.app/:1 Failed to load resource: 404
```

### 3. 用户体验
- ✅ Demo 账户可以登录
- ❌ 注册的账户无法登录
- ❌ 前端界面完全不可访问

## 🔍 根本原因分析

### 🔥 问题 0：CRITICAL - Railway 运行错误的服务器文件（新发现）
**原因**：Railway 运行 `server/railway-server.js`（简化版）而非 `server/index.ts`（完整版）
```bash
# 简化服务器只有基础端点
server/railway-server.js:
- /api/health ✅ (存在)
- /api/auth/* ✅ (存在)
- /api/skills ❌ (不存在)
- /api/tasks ❌ (不存在)
- /api/goals ❌ (不存在)

# 完整服务器有所有端点
server/index.ts + routes.ts:
- /api/health ✅
- /api/skills ✅
- /api/tasks ✅
- /api/goals ✅
- 所有其他API端点 ✅
```

**影响**：前端调用不存在的API端点，导致JavaScript运行时错误

### 问题 1：错误的服务器文件
**原因**：Railway 启动脚本指向错误的文件
```json
// package.json - 错误配置
"start": "NODE_ENV=production node dist/railway-server.js"
```
**影响**：运行了不存在或过时的服务器文件

### 问题 2：简化服务器覆盖
**原因**：构建脚本优先使用 `railway-server-simple.js`（无数据库版本）
```javascript
// scripts/build-railway-simple.js - 问题代码
const serverPath = path.join(__dirname, '../server/railway-server-simple.js');
if (fs.existsSync(serverPath)) {
  // 使用简化版本（无数据库）
}
```

### 问题 3：数据库连接字符串错误
**原因**：多个配置错误
- ❌ 区域错误：`ap-southeast-1` → 应该是 `ap-northeast-1`
- ❌ 端口错误：`6543` → 应该是 `5432`
- ❌ 域名错误：`ap-northeast1` → 应该是 `ap-northeast-1`（缺少连字符）

### 问题 4：前端文件路径不匹配
**原因**：构建和服务路径不一致
- 构建输出：`dist/public/`
- 服务器期望：`server/public/`

## ✅ 解决方案

### 🔥 0. CRITICAL: 强制使用完整服务器（2025-06-30）
```bash
# 步骤 1: 删除简化服务器文件
rm server/railway-server.js
# 或重命名备份
mv server/railway-server.js server/railway-server.js.backup

# 步骤 2: 确保正确的启动脚本
# package.json
"start": "NODE_ENV=production tsx server/index.ts"

# 步骤 3: 验证部署
curl https://your-app.up.railway.app/api/server-info
# 应该返回: {"server": "complete-server-routes-ts", ...}

# 步骤 4: 测试关键端点
curl https://your-app.up.railway.app/api/skills
# 应该返回技能数据 JSON，不是 HTML
```

**重要提示**：删除或重命名 `server/railway-server.js` 是关键，否则 Railway 可能会继续使用简化版本。

### 1. 修复服务器启动路径
```json
// package.json - 正确配置
"start": "NODE_ENV=production node server/railway-server.js"
```

### 2. 删除简化服务器文件
```bash
rm server/railway-server-simple.js
```

### 3. 修正数据库连接字符串
```
# 正确的 DATABASE_URL
postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**关键检查点**：
- ✅ 用户名：`postgres.ooepnnsbmtyrcqlqykkr`（不是 `postgres`）
- ✅ 区域：`ap-northeast-1`（东京，不是新加坡）
- ✅ 端口：`5432`（Session Pooler，不是 6543）
- ✅ 域名：有连字符的正确格式

### 4. 修复前端构建路径
```javascript
// scripts/build-railway-simple.js - 修复后
const distPublicPath = path.join(distPath, 'public');
const serverPublicPath = path.join(__dirname, '../server/public');
// 复制 dist/public/* 到 server/public/
```

### 5. 添加自动构建机制
```javascript
// server/railway-server.js - 备用构建
if (!fs.existsSync(clientPath)) {
  console.log("Running simplified build script...");
  execSync(`node ${simpleBuildScript}`, { stdio: 'inherit' });
}
```

## 🛠️ 预防措施

### 1. 环境变量验证脚本
```bash
# 创建验证脚本
npm run check:env
```

### 2. 构建验证步骤
```bash
# 本地验证构建
npm run build:railway
ls -la server/public/  # 确认文件存在
```

### 3. 部署前检查清单
- [ ] 环境变量格式正确（使用验证脚本）
- [ ] 构建脚本在本地工作
- [ ] `server/public/index.html` 存在
- [ ] `package.json` 启动脚本正确

### 4. Railway 配置标准化
```json
// railway.json - 推荐配置
{
  "build": {
    "buildCommand": "npm run build:railway"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health"
  }
}
```

## 🔧 快速诊断工具

### 🔥 0. CRITICAL: 服务器版本检查（最重要）
```bash
# 检查运行的服务器版本
curl https://your-app.up.railway.app/api/server-info | jq

# 正确输出（完整服务器）:
{
  "server": "complete-server-routes-ts",
  "version": "2.0-debug",
  "routes": "loaded-from-routes-ts"
}

# 错误输出（简化服务器）:
{"message":"Not found"}

# 如果是错误输出，立即删除 server/railway-server.js 并重新部署
```

### 1. 健康检查
```bash
curl https://your-app.up.railway.app/api/health | jq
```

**正常输出**：
```json
{
  "status": "ok",
  "database": {
    "status": "connected",
    "tableCheck": "users table exists"
  }
}
```

### 2. 前端检查
```bash
curl -I https://your-app.up.railway.app
# 应该返回 HTTP/2 200，不是 404
```

### 3. 数据库连接测试
```javascript
// 使用 test-connection-simple.js
node test-connection-simple.js
```

## 📊 故障排除流程

### Step 1: 识别问题类型
```bash
# 检查健康状态
curl https://your-app.up.railway.app/api/health

# 检查前端
curl -I https://your-app.up.railway.app
```

### Step 2: 数据库问题诊断
如果 `database.status !== "connected"`：

1. **检查环境变量格式**
   ```bash
   node validate-database-url.js
   ```

2. **常见错误排查**
   - "Tenant or user not found" → 检查用户名格式和区域
   - "ENOTFOUND" → 检查域名拼写（连字符）
   - "Invalid URL" → 检查特殊字符和空格

### Step 3: 前端问题诊断
如果返回 404 或构建错误：

1. **检查 Railway 日志**
   - 查找 "Client build directory not found"
   - 确认构建脚本是否执行

2. **验证文件结构**
   ```bash
   # 在 Railway 容器中应该存在
   /app/server/public/index.html
   /app/server/public/assets/
   ```

### Step 4: 强制重建
```bash
# 推送空 commit 触发重建
git commit --allow-empty -m "Trigger rebuild"
git push
```

## 📝 经验教训

### 1. 环境变量细节很重要
- **连字符位置**：`ap-northeast-1` vs `ap-northeast1`
- **端口选择**：Session Pooler 使用 5432，不是 6543
- **用户名格式**：必须是 `postgres.xxxx` 格式

### 2. 构建脚本的优先级问题
- 删除不需要的 `-simple` 版本文件
- 确保构建脚本的执行顺序正确

### 3. 路径匹配的重要性
- 构建输出路径必须与服务器期望路径一致
- 使用绝对路径而非相对路径

### 4. 多层备用机制的价值
- Railway 构建 → 服务器启动构建 → 简化构建 → 后备页面
- 确保在任何情况下都有基本功能

## 🎯 快速修复命令

```bash
# 1. 验证环境变量
node validate-database-url.js

# 2. 本地测试构建
npm run build:railway

# 3. 验证构建结果
ls -la server/public/index.html

# 4. 测试数据库连接
node test-connection-simple.js

# 5. 强制 Railway 重建
git commit --allow-empty -m "Force rebuild" && git push
```

## 📚 相关文档

- [Railway 部署配置](./RAILWAY_DEPLOYMENT_GUIDE.md)
- [Supabase 连接指南](./SUPABASE_CONNECTION_GUIDE.md)
- [环境变量配置](./ENVIRONMENT_SETUP.md)
- [构建脚本说明](./BUILD_SCRIPTS.md)

---

**创建日期**: 2025-06-30  
**最后更新**: 2025-06-30  
**适用版本**: Railway + Supabase 部署