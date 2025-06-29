# Railway 登录问题诊断指南

## 1. 检查服务状态

访问以下端点查看详细的服务状态：
```
https://levelupsolo-production.up.railway.app/api/health
```

这将显示：
- 数据库连接状态
- 环境变量配置
- 错误信息（如果有）

## 2. 可能的原因

### A. 数据库未连接
如果 health 端点显示 `database.status: "error"`：
- 确认在 Railway 中设置了 `DATABASE_URL`
- 格式应该是：`postgresql://user:password@host:port/database`

### B. 数据库表未创建
如果数据库连接正常但登录失败：
- 需要运行数据库迁移
- 在本地运行：`npm run db:push`

### C. 没有用户数据
如果数据库正常但没有用户：
1. 使用测试端点创建测试用户：
   ```bash
   curl -X POST https://levelupsolo-production.up.railway.app/api/test/create-user
   ```
2. 使用返回的凭据登录：
   - Email: test@example.com
   - Password: password123

## 3. 查看 Railway 日志

在 Railway 控制台中查看实时日志，登录时会显示：
- "Login attempt for: [email]"
- "User not found" 或 "No password found" 等错误信息
- 详细的错误堆栈

## 4. 手动创建用户

如果测试端点也失败，可以：
1. 使用注册功能创建新用户
2. 访问：https://levelupsolo-production.up.railway.app/auth
3. 点击"注册"标签页创建账户

## 5. 环境变量检查清单

确保在 Railway 中设置了：
- [x] `DATABASE_URL` - PostgreSQL 连接字符串
- [x] `JWT_SECRET` - 随机密钥（用于令牌签名）
- [x] `OPENAI_API_KEY` - OpenAI API 密钥
- [ ] `NODE_ENV=production` (可选，但推荐)

## 6. 数据库架构

确保数据库有以下表：
- `users` - 包含 `hashedPassword` 字段
- `user_profiles`
- `user_stats`
- `skills`
- `tasks`
- `goals`

## 7. 紧急修复

如果需要快速修复，可以：
1. 在 Railway 控制台中重启服务
2. 清除浏览器缓存和 cookies
3. 使用隐私模式测试登录

## 注意事项

⚠️ **安全警告**：`/api/test/create-user` 端点仅供调试使用，生产环境应该删除。