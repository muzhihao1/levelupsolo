# Supabase连接配置指南

## 问题：Tenant or user not found

这个错误表示你使用了错误的Supabase连接字符串格式。

## 解决方案

### 1. 获取正确的连接字符串

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** → **Database**
4. 在 **Connection String** 部分，选择 **Session pooler** 标签（不是URI或Direct）
5. 复制连接字符串

### 2. 连接字符串格式对比

**错误格式（Direct Connection）：**
```
postgresql://postgres.xxxxx:password@db.xxxxx.supabase.co:5432/postgres
```

**正确格式（Session Pooler）：**
```
postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

关键区别：
- 域名包含 `.pooler.supabase.com`
- 端口是 `6543`（不是 5432）
- 包含区域信息（如 aws-0-us-west-1）

### 3. 在Railway设置

1. 打开Railway项目
2. 进入 Variables 标签
3. 添加或更新：
   ```
   DATABASE_URL = [你的Session Pooler连接字符串]
   JWT_SECRET = [任意随机字符串]
   ```

### 4. 验证连接

部署后访问：
```
https://levelupsolo-production.up.railway.app/api/health
```

应该看到：
```json
{
  "database": {
    "status": "connected",
    "tableCheck": "users table exists"
  }
}
```

## 常见错误

| 错误信息 | 原因 | 解决方法 |
|---------|------|----------|
| Tenant or user not found | 使用了Direct Connection URL | 改用Session Pooler URL |
| ENETUNREACH | 使用了IPv6地址 | 使用Session Pooler（IPv4） |
| Connection timeout | 网络问题或URL错误 | 检查URL格式和网络 |

## 为什么需要Session Pooler？

1. **无服务器兼容**：Railway等平台需要连接池
2. **IPv4支持**：避免IPv6连接问题
3. **性能优化**：减少连接开销
4. **自动管理**：处理连接生命周期