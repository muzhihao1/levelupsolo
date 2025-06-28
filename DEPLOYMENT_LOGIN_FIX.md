# Level Up Solo 网页版登录问题分析与解决方案

## 问题分析

### 当前症状
- `/api/auth/user` 返回 500 错误
- `/api/auth/simple-login` 返回 500 错误
- 用户无法登录到生产环境

### 根本原因
通过代码分析，500错误最可能由以下原因导致：

1. **环境变量缺失**
   - 数据库需要 `DATABASE_URL` 或 `SUPABASE_DATABASE_URL`
   - 认证需要 `JWT_SECRET`
   - 代码中有日志显示环境检查状态

2. **数据库连接问题**
   - `api/_lib/db.ts` 使用 Neon PostgreSQL
   - 如果没有数据库URL，会抛出错误
   - Vercel 部署时需要正确配置数据库连接

## 解决步骤

### 1. 立即检查 - 验证部署状态

访问以下URL检查服务状态：
```
https://www.levelupsolo.net/api/health
https://www.levelupsolo.net/api/debug/env-check
https://www.levelupsolo.net/api/debug/db-test
```

### 2. Vercel 环境变量配置

登录 Vercel 控制台，确保以下环境变量已设置：

```bash
# 数据库连接（这两个必须相同）
DATABASE_URL=postgresql://postgres:zbrGHpuON0CNfZBt@db.ooepnnsbmtyrcqlqykkr.supabase.co:5432/postgres
SUPABASE_DATABASE_URL=postgresql://postgres:zbrGHpuON0CNfZBt@db.ooepnnsbmtyrcqlqykkr.supabase.co:5432/postgres

# 认证密钥
JWT_SECRET=qW3eR5tY7uI9oP0aS2dF4gH6jK8lZ1xC
SESSION_SECRET=xK8mP9nQ3vB5wY2tL6hF4jR7sE1cA0dG

# AI功能
OPENAI_API_KEY=<你的OpenAI API密钥>

# 可选：调试密钥（用于访问调试端点）
DEBUG_KEY=<一个随机字符串>
```

### 3. 验证步骤

1. **检查环境变量**
   - 在 Vercel 项目设置中
   - Settings → Environment Variables
   - 确保所有变量都已添加

2. **重新部署**
   - 添加/修改环境变量后
   - 点击 "Redeploy" 按钮
   - 等待部署完成

3. **测试认证**
   - 使用 Demo 账号：`demo@levelupsolo.net` / `demo1234`
   - 或使用真实账号测试

### 4. 故障排除命令

```bash
# 本地测试
npm run dev

# 检查生产环境日志
# 在 Vercel 控制台 → Functions → Logs

# 测试API端点
curl https://www.levelupsolo.net/api/health
curl https://www.levelupsolo.net/api/debug/env-check
```

## iOS App 兼容性考虑

### 认证系统设计
当前认证系统已经为iOS兼容做好准备：

1. **JWT Token 认证**
   - 无状态，适合移动端
   - Access Token: 7天有效期
   - Refresh Token: 30天有效期

2. **API 设计**
   - RESTful 接口
   - JSON 请求/响应
   - CORS 已配置为允许所有源

3. **认证流程**
   ```
   iOS App → POST /api/auth/simple-login → 获取 tokens
   iOS App → 存储 tokens 在 Keychain
   iOS App → 请求时添加 Authorization: Bearer <token>
   iOS App → 401 时使用 refresh token 刷新
   ```

### iOS 开发建议

1. **使用相同的API端点**
   ```swift
   let baseURL = "https://www.levelupsolo.net/api"
   ```

2. **Token 管理**
   - 使用 iOS Keychain 安全存储
   - 实现自动刷新机制
   - 处理401错误并重试

3. **网络层设计**
   - 使用 URLSession 或 Alamofire
   - 统一的错误处理
   - 请求拦截器添加认证头

## 快速修复清单

- [ ] 登录 Vercel 控制台
- [ ] 检查环境变量是否全部设置
- [ ] 特别注意 `SUPABASE_DATABASE_URL`（必须与 `DATABASE_URL` 相同）
- [ ] 重新部署应用
- [ ] 访问 `/api/health` 验证服务运行
- [ ] 访问 `/api/debug/env-check` 验证配置
- [ ] 测试登录功能

## 预期结果

配置正确后，你应该能够：
1. 成功访问 https://www.levelupsolo.net
2. 使用 demo 账号或真实账号登录
3. 正常使用所有功能
4. iOS app 可以使用相同的 API 端点

## 需要进一步帮助？

1. 查看 Vercel Functions 日志
2. 使用调试端点诊断问题
3. 确保数据库连接字符串正确
4. 验证 Supabase 项目是否活跃