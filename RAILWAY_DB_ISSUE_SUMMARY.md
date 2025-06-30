# Railway 数据库连接问题总结

## 问题现象
1. ✅ 可以注册账户（没有报错）
2. ❌ 用注册的账户登录显示"密码错误"
3. ❌ 注册的数据没有保存到 Supabase 数据库

## 诊断结果

### 本地测试（✅ 一切正常）
```bash
node test-registration-issue.js
```
- 数据库连接成功
- users 表存在且结构正确
- 可以插入和验证用户
- 现有用户：muzhihao1@gmail.com（密码已设置）

### Railway 部署问题分析

**最可能的原因**：Railway 的 `DATABASE_URL` 环境变量没有正确设置或者格式有问题。

## 立即检查步骤

### 1. 运行诊断脚本
```bash
# 方法一：使用 shell 脚本
./test-railway-api.sh

# 方法二：使用 curl 命令
curl https://levelupsolo-production.up.railway.app/api/health
curl https://levelupsolo-production.up.railway.app/api/test/db-connection
curl https://levelupsolo-production.up.railway.app/api/debug/users
```

### 2. 检查 Railway 环境变量

在 Railway Dashboard 中确认 `DATABASE_URL` 是否正确设置为：
```
postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**关键检查点**：
- ✅ 用户名格式：`postgres.ooepnnsbmtyrcqlqykkr`（不是 `postgres`）
- ✅ 区域：`ap-northeast-1`（东京）
- ✅ 端口：`5432`（Session Pooler）
- ✅ 密码：`zbrGHpuON0CNfZBt`

### 3. 查看 Railway 日志

在 Railway Dashboard 中查看部署日志，特别注意：
- 启动时的数据库连接信息
- 是否显示 "Users table accessible, X users found"
- 注册时的日志输出

## 可能的问题和解决方案

### 问题 1：环境变量未设置
**症状**：健康检查显示 `database.status: "not configured"`
**解决**：在 Railway 添加 `DATABASE_URL` 环境变量

### 问题 2：连接字符串格式错误
**症状**：显示 "Tenant or user not found"
**解决**：确保使用正确的 Session Pooler 格式

### 问题 3：连接到了错误的数据库
**症状**：注册成功但数据不在 Supabase 中
**解决**：可能 Railway 使用了自己的内存数据库或其他数据库

### 问题 4：部署没有更新
**症状**：代码改动没有生效
**解决**：在 Railway 触发重新部署

## 临时解决方案

如果数据库连接一直有问题，可以：

1. **使用 Railway PostgreSQL**
   - 在 Railway 创建 PostgreSQL 服务
   - 自动配置连接
   - 运行数据库迁移

2. **使用其他 PostgreSQL 服务**
   - Neon.tech
   - Render PostgreSQL
   - DigitalOcean Managed Database

## 下一步行动

1. 运行 `./test-railway-api.sh` 查看实际状态
2. 根据输出结果采取相应措施
3. 如果确认是环境变量问题，更新 Railway 设置
4. 重新部署并测试