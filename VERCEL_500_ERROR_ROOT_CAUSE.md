# Vercel 500 错误根本原因分析

## 问题总结
经过多次尝试修复，我发现了几个被忽略的关键问题：

## 根本原因

### 1. Vercel 函数路由机制
**问题**：我尝试使用查询参数路由（如 `/api/auth?action=login`），但 Vercel 不支持这种方式。

**原因**：
- Vercel 期望每个 `.ts` 文件是一个独立的 serverless 函数
- 它不会将查询参数传递给统一的处理器来进行内部路由
- 当访问 `/api/auth?action=user` 时，Vercel 寻找 `api/auth.ts` 或 `api/auth/index.ts`

### 2. 函数导入错误
**问题**：在 `api/ai.ts` 中导入了不存在的函数名：
- `generateSuggestions` → 应该是 `handleSuggestions`
- `parseUserInput` → 应该是 `handleParseInput`

### 3. 环境变量可能未设置
**怀疑**：即使修复了上述问题，如果环境变量未在 Vercel 设置，仍会出现 500 错误。

## 解决方案

### 1. 恢复独立函数结构
```
api/
├── auth/
│   ├── simple-login.ts
│   ├── user.ts
│   └── refresh.ts
├── ai/
│   ├── suggestions.ts
│   ├── parse-input.ts
│   └── chat.ts
└── debug-env.ts
```

### 2. 验证环境变量
访问 `https://www.levelupsolo.net/api/debug-env` 来检查：
- DATABASE_URL 是否设置
- SUPABASE_DATABASE_URL 是否设置
- JWT_SECRET 是否设置
- 两个数据库 URL 是否相同

### 3. 确保在 Vercel Dashboard 设置所有环境变量
```
DATABASE_URL=postgresql://...
SUPABASE_DATABASE_URL=postgresql://... (必须与 DATABASE_URL 相同)
JWT_SECRET=...
SESSION_SECRET=...
OPENAI_API_KEY=...
```

## 关键教训

1. **不要假设 Vercel 支持所有 Node.js 路由模式**
   - Vercel Functions 有自己的路由规则
   - 每个文件 = 一个端点

2. **先验证基础设施**
   - 环境变量
   - 函数导入
   - 路由结构

3. **使用调试端点**
   - 创建简单的测试端点来验证环境
   - 不要只依赖复杂的业务逻辑端点

## 下一步

1. 部署后立即访问 `/api/debug-env` 验证环境变量
2. 如果环境变量正确，测试 `/api/test` 端点
3. 最后测试实际的认证端点