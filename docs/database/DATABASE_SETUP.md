# 数据库设置指南

## 问题诊断

当前502错误是因为服务器启动时数据库未正确初始化。请按以下步骤解决：

## 1. 检查环境变量

在 Railway 中确认以下环境变量已设置：

```
DATABASE_URL=postgresql://postgres.[项目ID]:[密码]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
JWT_SECRET=[你的密钥]
OPENAI_API_KEY=[你的OpenAI密钥]
```

注意：
- 使用 Supabase 的 **Session Pooler** 连接字符串（端口6543）
- 不要使用 Direct Connection（端口5432）- 它使用IPv6会导致连接失败

## 2. 本地运行数据库迁移

在本地环境执行以下命令创建数据库表：

```bash
# 1. 设置环境变量
export DATABASE_URL="你的Supabase Session Pooler连接字符串"

# 2. 运行数据库迁移
npm run db:push

# 3. 验证表已创建
npm run db:studio
```

## 3. 验证部署

推送代码后，访问以下端点验证：

1. **健康检查**: `https://levelupsolo-production.up.railway.app/api/health`
   - 应该显示 `database.status: "connected"`

2. **数据库检查**: `https://levelupsolo-production.up.railway.app/api/test/db-check`
   - 应该显示所有表已创建
   - `hasPasswordColumn` 应为 `true`

3. **创建测试用户**: 
   ```bash
   curl -X POST https://levelupsolo-production.up.railway.app/api/test/create-user
   ```

4. **测试登录**:
   - Email: `test@example.com`
   - Password: `password123`

## 4. 如果仍有问题

查看 Railway 日志中的启动诊断信息：

```
🔍 Running startup diagnostics...
1️⃣ Environment Variables:
2️⃣ Database Connection:
3️⃣ Module Imports:
```

根据诊断结果：
- ❌ DATABASE_URL Not set → 在 Railway 设置环境变量
- ❌ Database NOT initialized → 检查连接字符串格式
- ❌ Module failed → 查看具体错误信息

## 5. 常见错误

| 错误信息 | 原因 | 解决方法 |
|---------|------|----------|
| connect ENETUNREACH | IPv6连接失败 | 使用Session Pooler |
| relation "users" does not exist | 表未创建 | 运行 npm run db:push |
| JWT_SECRET undefined | 环境变量未设置 | 在Railway设置JWT_SECRET |
| 502 Bad Gateway | 服务器崩溃 | 查看日志诊断信息 |

## 安全提醒

部署生产环境前必须：
1. 删除所有 `/api/test/*` 端点
2. 设置强密码的 JWT_SECRET
3. 启用 Supabase 的行级安全策略