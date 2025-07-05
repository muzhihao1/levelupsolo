# Railway 数据库连接问题解决方案

## 问题描述

错误信息：`connect ENETUNREACH 2406:da14:271:9902:a7ce:2612:e959:6295:5432`

这是一个 IPv6 连接问题。Railway 环境可能不支持 IPv6 连接到外部数据库。

## 解决方案

### 方案 1：使用 IPv4 地址（推荐）

1. 获取数据库的 IPv4 地址或主机名
2. 更新 DATABASE_URL 格式：
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```

### 方案 2：使用 Railway 内部数据库

如果您的数据库也在 Railway 上：
1. 使用内部连接字符串：
   ```
   postgresql://user:password@postgres.railway.internal:5432/database
   ```
2. 确保数据库和应用在同一个 Railway 项目中

### 方案 3：使用支持的数据库服务

推荐的 PostgreSQL 提供商：

1. **Supabase** (推荐)
   - 访问 https://supabase.com
   - 创建免费项目
   - 获取连接字符串（Settings > Database）
   - 使用 "Connection string" 而不是 "Connection pooling"

2. **Neon**
   - 访问 https://neon.tech
   - 创建免费数据库
   - 使用提供的连接字符串

3. **Railway PostgreSQL**
   - 在 Railway 项目中添加 PostgreSQL 插件
   - 使用自动生成的 DATABASE_URL

## 更新环境变量

在 Railway 中更新 DATABASE_URL：

1. 进入 Railway 项目
2. 点击 "Variables" 标签
3. 更新 DATABASE_URL 为新的连接字符串
4. 确保格式正确：
   ```
   postgresql://username:password@hostname:5432/database?sslmode=require
   ```

## 验证修复

1. 等待部署完成
2. 访问：`https://levelupsolo-production.up.railway.app/api/health`
3. 确认 `database.status` 显示 "connected"

## 注意事项

- 确保使用 IPv4 地址或域名，而不是 IPv6 地址
- 生产环境始终使用 SSL 连接（`?sslmode=require`）
- 某些云平台可能需要添加 Railway 的 IP 到允许列表