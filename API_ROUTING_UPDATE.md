# API 路由更新说明

为了解决 Vercel Hobby 计划的 12 个函数限制，我们合并了一些 API 端点。

## 更新的 API 路由

### 认证相关 (原 /api/auth/*)
- `/api/auth?action=login` 或 `/api/auth?action=simple-login` - 登录
- `/api/auth?action=user` - 获取用户信息
- `/api/auth?action=refresh` - 刷新 token

### AI 相关 (原 /api/ai/*)
- `/api/ai?action=suggestions` - 获取 AI 建议
- `/api/ai?action=parse-input` - 解析用户输入
- `/api/ai?action=chat` - AI 聊天

### 调试相关 (原 /api/debug/*)
- `/api/debug?action=env` 或 `/api/debug?action=env-check` - 检查环境变量
- `/api/debug?action=db-test` - 测试数据库连接

## 客户端更新

所有客户端代码已更新为使用新的 API 路由格式。主要更改：

1. **认证钩子** (`useAuth.ts`)
   - 更新了 token 刷新和用户信息获取

2. **登录页面** (`auth.tsx`)
   - 更新了登录 API 调用

3. **API 工具** (`api.ts`)
   - 更新了 token 刷新逻辑

## 函数数量

从 14 个函数减少到 8 个：
- 合并了 3 个认证函数为 1 个
- 合并了 3 个 AI 函数为 1 个
- 合并了 3 个调试函数为 1 个

现在总共 8 个函数，在 Vercel Hobby 计划的 12 个限制内。