# 诊断端点使用指南

部署完成后，请按以下顺序访问诊断端点：

## 1. 基础依赖测试
```
https://www.levelupsolo.net/api/auth/test-simple
```
这会测试：
- 环境变量是否可访问
- bcryptjs 是否能正常工作
- drizzle-orm 是否能导入
- @neondatabase/serverless 是否能导入

## 2. 数据库连接测试
```
https://www.levelupsolo.net/api/db-test
```
这会测试：
- 能否导入 db 模块
- 能否创建数据库实例
- 能否执行简单查询
- users 表是否存在

## 3. Auth 处理器测试
```
https://www.levelupsolo.net/api/auth/test-login
```
这会测试：
- 能否导入 auth-handlers
- 能否导入 db 模块
- handleLogin 函数是否存在
- 如果用 POST 请求，会尝试调用 handleLogin

## 使用方法

1. **GET 请求** - 只进行导入和基础测试
   ```bash
   curl https://www.levelupsolo.net/api/auth/test-login
   ```

2. **POST 请求** - 会尝试执行 handleLogin
   ```bash
   curl -X POST https://www.levelupsolo.net/api/auth/test-login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test"}'
   ```

## 根据结果诊断

- 如果 test-simple 失败 → 基础依赖问题
- 如果 db-test 失败 → 数据库连接问题
- 如果 test-login 失败 → auth-handlers 导入或执行问题

这些诊断结果会精确指出问题所在。