# 🚨 重要：Supabase 连接字符串问题诊断

## 发现的问题

你提供的信息有**关键矛盾**：

1. **端口号错误**：
   - 你说的 "Session Pooler" 字符串用了端口 `5432` ❌
   - Session Pooler 必须使用端口 `6543` ✅
   - 端口 `5432` 是 Direct Connection 使用的

2. **区域不一致**：
   - 你提供的：`ap-northeast-1`（东京）
   - 截图显示：`ap-southeast-1`（新加坡）

## 正确获取 Session Pooler 连接字符串

### 步骤 1：确认正确的标签页

![Supabase Database Settings](https://supabase.com/docs/img/guides/database/connection-pooler-config.png)

在 Supabase Dashboard 中：
1. Settings → Database
2. 你会看到两个标签：
   - **Direct connection** - 端口 5432 ❌ 不要用这个
   - **Session pooler** - 端口 6543 ✅ 用这个

### 步骤 2：验证连接字符串格式

Session Pooler 的正确格式：
```
postgresql://postgres.项目引用:密码@aws-0-区域.pooler.supabase.com:6543/postgres
                                                                      ↑ 必须是 6543
```

Direct Connection 的格式（不要用）：
```
postgresql://postgres:密码@db.项目引用.supabase.co:5432/postgres
                                                    ↑ 这是 5432
```

### 步骤 3：检查你的项目区域

你的项目可能在以下区域之一：
- `ap-southeast-1` - 新加坡
- `ap-northeast-1` - 东京
- `us-east-1` - 美国东部
- `us-west-1` - 美国西部
- 其他...

在 Supabase Dashboard 的项目主页可以看到区域信息。

## 🔧 立即修复

基于你的截图，正确的连接字符串应该是：
```
postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

在 Railway 中更新 `DATABASE_URL` 为上面的值（如果你的区域确实是 ap-southeast-1）。

## ⚠️ 常见错误

1. **混淆了 Direct Connection 和 Session Pooler**
   - Direct Connection：端口 5432，不支持 IPv6 环境
   - Session Pooler：端口 6543，支持更多环境

2. **复制了错误的连接字符串**
   - 确保从正确的标签页复制

3. **多个 Supabase 项目**
   - 确保使用的是正确项目的连接字符串

## 验证命令

更新后运行：
```bash
node test-connection-simple.js
```

这会立即告诉你连接是否正确。