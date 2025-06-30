# 解决Supabase "Tenant or user not found"错误

## 问题诊断

你的DATABASE_URL格式正确（Session Pooler），但仍然出现"Tenant or user not found"错误。

## 可能的原因和解决方案

### 1. 密码包含特殊字符

如果你的数据库密码包含特殊字符（如 `@`, `#`, `%`, `&`等），需要进行URL编码：

| 字符 | 编码后 |
|-----|--------|
| @   | %40    |
| #   | %23    |
| %   | %25    |
| &   | %26    |
| +   | %2B    |

**示例**：
```
密码: MyPass@123#
编码后: MyPass%40123%23
```

### 2. 检查Supabase项目状态

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 确认项目：
   - ✅ 状态为"Active"（不是Paused）
   - ✅ 没有超出免费层限制
   - ✅ 项目没有被暂停

### 3. 重新生成连接字符串

1. 在Supabase Dashboard中：
   - Settings → Database
   - 点击"Reset database password"
   - 设置一个**不包含特殊字符**的新密码
   - 等待密码重置完成（约30秒）

2. 获取新的连接字符串：
   - 选择"Session pooler"标签
   - 复制完整的连接字符串

3. 在Railway更新DATABASE_URL

### 4. 临时解决方案

目前我已经部署了一个不依赖数据库的简化版本，你可以：

1. 使用Demo账户登录：
   - Email: `demo@levelupsolo.net`
   - Password: `demo1234`

2. 或者注册新账户（数据仅存储在内存中）

### 5. 验证连接（本地测试）

创建 `.env.local` 文件：
```env
DATABASE_URL=你的新连接字符串
```

运行测试脚本：
```bash
node test-supabase-connection.js
```

### 6. 使用Supabase客户端（替代方案）

如果postgres直连一直有问题，可以考虑使用Supabase JS客户端：

1. 在Supabase获取：
   - Project URL (https://xxx.supabase.co)
   - Anon Key

2. 在Railway设置：
   ```
   SUPABASE_URL=你的项目URL
   SUPABASE_ANON_KEY=你的Anon Key
   ```

## 下一步

1. **先使用Demo账户**确保应用功能正常
2. **解决数据库连接**按上述步骤操作
3. **如果还有问题**，可以：
   - 使用Railway自带的PostgreSQL
   - 或使用其他PostgreSQL服务（如Neon）

## 需要帮助？

如果按上述步骤操作后还有问题，请提供：
- 密码是否包含特殊字符
- Supabase项目的区域（如us-west-1）
- 项目创建时间（新项目可能需要时间初始化）