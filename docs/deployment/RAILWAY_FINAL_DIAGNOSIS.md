# Railway 部署最终诊断指南

## 已修复的问题

1. **数据库连接** ✅
   - 问题：IPv6 地址连接失败
   - 解决：需要使用 IPv4 地址或域名

2. **JWT 配置** ✅
   - 问题：JWT_SECRET 未定义导致崩溃
   - 解决：添加了默认值（生产环境必须设置）

3. **路由缺失** ✅
   - 问题：/api/auth/simple-login 不存在
   - 解决：添加了该端点

## 诊断步骤

### 1. 检查数据库架构
访问：`https://levelupsolo-production.up.railway.app/api/test/db-check`

应该看到：
```json
{
  "success": true,
  "results": {
    "tables": ["users", "skills", "tasks", ...],
    "hasPasswordColumn": true,
    "userCount": "0",
    "storageWorking": true
  }
}
```

### 2. 创建测试用户
```bash
curl -X POST https://levelupsolo-production.up.railway.app/api/test/create-user
```

### 3. 尝试登录
使用创建的测试账户：
- Email: test@example.com
- Password: password123

## 环境变量清单

确保在 Railway 中设置了：

| 变量名 | 必需 | 示例值 | 说明 |
|--------|------|--------|------|
| DATABASE_URL | ✅ | postgresql://user:pass@host:5432/db | 使用 IPv4 或域名 |
| JWT_SECRET | ✅ | your-secret-key-here | 随机生成的密钥 |
| JWT_REFRESH_SECRET | ❌ | another-secret-key | 刷新令牌密钥 |
| OPENAI_API_KEY | ✅ | sk-... | OpenAI API 密钥 |
| NODE_ENV | ❌ | production | 环境标识 |

## 如果还有问题

1. **查看 Railway 日志**
   - 登录时会显示详细的步骤日志
   - 找到具体失败的位置

2. **数据库迁移**
   如果 db-check 显示没有 users 表：
   ```bash
   # 本地运行
   npm run db:push
   ```

3. **清理和重建**
   ```bash
   # 本地
   rm -rf node_modules
   npm install
   npm run build
   ```

## 常见错误及解决

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 500 at login | JWT_SECRET 未设置 | 在 Railway 设置 JWT_SECRET |
| Database error | IPv6 连接问题 | 使用 IPv4 DATABASE_URL |
| 404 not found | 路由不存在 | 等待部署完成 |
| CORS error | 跨域问题 | 检查前端 URL 配置 |

## 验证部署成功

依次访问：
1. `/api/health` - 服务器健康状态
2. `/api/test/db-check` - 数据库连接和表结构
3. 创建测试用户并登录

## 安全提醒

⚠️ 生产环境部署前：
- 删除所有 `/api/test/*` 端点
- 设置强密码的 JWT_SECRET
- 使用 SSL 数据库连接
- 启用日志监控