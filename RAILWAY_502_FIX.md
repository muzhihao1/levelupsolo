# Railway 502 错误修复指南

## 问题分析

502 错误通常意味着：
1. 应用未在正确的端口监听
2. 应用启动时崩溃
3. 构建成功但启动失败

## 已实施的解决方案

### 1. 创建简化的服务器 (`server/railway-server.ts`)
- 最小化的Express服务器
- 明确的端口配置：`0.0.0.0:${PORT}`
- 基础的健康检查端点
- Demo登录功能（无需数据库）

### 2. 新的构建脚本
- `scripts/build-railway-simple.js` - 简化的构建流程
- 使用esbuild快速编译
- 生成独立的服务器文件

### 3. 更新的配置
- `railway.json` - 添加健康检查路径
- `package.json` - 更新启动命令

## 部署步骤

1. **提交并推送代码**
```bash
git add -A
git commit -m "fix: simplified Railway deployment for 502 error"
git push
```

2. **在Railway中检查环境变量**
确保设置了：
- `PORT` (Railway会自动设置)
- `NODE_ENV=production`
- `DATABASE_URL` (可选)
- `JWT_SECRET` (可选)

3. **监控部署日志**
查看是否有以下输出：
```
🚀 Starting Railway server...
✅ Server is running on http://0.0.0.0:xxxx
```

4. **测试端点**
- 健康检查: `https://levelupsolo-production.up.railway.app/api/health`
- 测试端点: `https://levelupsolo-production.up.railway.app/api/test`

## 如果仍有问题

1. **检查Railway日志**
   - 查找错误信息
   - 确认服务器启动消息

2. **使用Railway Shell**
   ```bash
   # 在Railway控制台运行
   npm start
   ```

3. **降级到更简单的配置**
   - 删除 `nixpacks.toml`
   - 让Railway自动检测Node.js项目

4. **资源限制**
   - 确保有足够的内存（至少512MB）
   - 检查是否有CPU限制

## 本地测试

运行测试脚本验证构建：
```bash
./test-railway-local.sh
```

然后访问 `http://localhost:3333/api/health`