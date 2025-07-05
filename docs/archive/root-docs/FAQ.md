# Frequently Asked Questions (FAQ)
# 常见问题解答

## 目录
- [开发环境问题](#开发环境问题)
- [部署问题](#部署问题)
- [数据库问题](#数据库问题)
- [认证问题](#认证问题)
- [性能问题](#性能问题)
- [iOS开发问题](#ios开发问题)
- [功能使用问题](#功能使用问题)
- [错误解决方案](#错误解决方案)

## 开发环境问题

### Q: npm install 失败，提示 node-gyp 错误？
**A:** 这通常是因为缺少编译工具。解决方案：

**Mac:**
```bash
xcode-select --install
```

**Windows:**
```bash
npm install --global windows-build-tools
```

**Linux:**
```bash
sudo apt-get install build-essential
```

---

### Q: 运行 npm run dev 时提示端口 5000 已被占用？
**A:** 查找并终止占用端口的进程：

```bash
# Mac/Linux
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# 或者修改端口
PORT=3000 npm run dev
```

---

### Q: TypeScript 提示找不到模块？
**A:** 尝试以下步骤：

```bash
# 1. 清理缓存
rm -rf node_modules/.cache

# 2. 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 3. 重启 TS 服务器（VS Code）
Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"
```

---

## 部署问题

### Q: Railway 部署失败，提示 "Build failed"？
**A:** 检查以下几点：

1. **确保所有环境变量已设置**
```bash
railway variables
```

2. **检查 Node 版本**
在 `package.json` 中添加：
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

3. **查看详细日志**
```bash
railway logs
```

---

### Q: 部署成功但网站无法访问？
**A:** 常见原因和解决方案：

1. **检查健康端点**
```bash
curl https://your-app.railway.app/api/health
```

2. **确认 PORT 环境变量**
Railway 会自动设置 PORT，确保代码中使用：
```javascript
const PORT = process.env.PORT || 5000;
```

3. **检查 start 脚本**
确保 `package.json` 中的 start 脚本正确：
```json
"start": "NODE_ENV=production node server/railway-server.js"
```

---

## 数据库问题

### Q: 数据库连接超时？
**A:** 可能的原因：

1. **连接字符串格式错误**
正确格式：
```
postgresql://username:password@host:5432/database?sslmode=require
```

2. **连接池配置**
```javascript
// 在 db.ts 中添加
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

3. **防火墙/网络问题**
确保数据库允许从应用服务器的 IP 访问

---

### Q: 数据库迁移失败？
**A:** 步骤化解决：

```bash
# 1. 备份当前数据
pg_dump $DATABASE_URL > backup.sql

# 2. 检查 schema 差异
npm run db:push -- --dry-run

# 3. 如果有冲突，手动解决
psql $DATABASE_URL

# 4. 重新运行迁移
npm run db:push
```

---

## 认证问题

> **✅ 更新 (2024-01-30)**: Railway 部署的登录问题已成功解决。以下内容为通用故障排除参考。

### Q: 登录后立即被踢出？
**A:** 常见原因：

1. **SESSION_SECRET 未设置或太短**
```bash
# 生成安全的密钥
openssl rand -base64 32
```

2. **Cookie 配置问题**
```javascript
// 生产环境需要
app.use(session({
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true,
    sameSite: 'strict'
  }
}));
```

3. **跨域问题**
确保前后端域名在 CORS 白名单中

---

### Q: JWT token 无效？
**A:** 检查：

1. **JWT_SECRET 一致性**
前后端必须使用相同的密钥

2. **Token 过期时间**
```javascript
const token = jwt.sign(payload, secret, { 
  expiresIn: '7d' // 调整过期时间
});
```

3. **时钟同步**
服务器时间不同步会导致 token 验证失败

---

## 性能问题

### Q: 页面加载很慢？
**A:** 优化建议：

1. **启用压缩**
```javascript
import compression from 'compression';
app.use(compression());
```

2. **实现缓存**
```javascript
// API 响应缓存
res.set('Cache-Control', 'public, max-age=300');

// React Query 缓存
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
    }
  }
});
```

3. **懒加载组件**
```javascript
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

---

### Q: 数据库查询很慢？
**A:** 优化方法：

1. **添加索引**
```sql
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
```

2. **使用 EXPLAIN 分析**
```sql
EXPLAIN ANALYZE SELECT * FROM tasks WHERE user_id = 1;
```

3. **避免 N+1 查询**
使用 JOIN 或批量查询

---

## iOS开发问题

### Q: iOS 应用无法连接到本地后端？
**A:** 解决方案：

1. **使用真实 IP 地址**
不要使用 localhost，使用电脑的局域网 IP：
```swift
let baseURL = "http://192.168.1.100:5000"
```

2. **配置 App Transport Security**
在 `Info.plist` 中添加：
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

---

### Q: iOS 应用构建失败？
**A:** 常见解决方案：

1. **清理构建缓存**
```bash
# Xcode 菜单
Product -> Clean Build Folder (Shift+Cmd+K)
```

2. **更新 Pod 依赖**
```bash
cd ios
pod install --repo-update
```

3. **检查证书和配置**
确保开发证书和 Provisioning Profile 正确

---

## 功能使用问题

### Q: 能量球没有重置？
**A:** 检查：

1. **时区设置**
```javascript
// 确保使用用户本地时间
const resetHour = 4; // 凌晨4点
const now = new Date();
const lastReset = new Date(user.lastEnergyReset);
```

2. **手动触发重置**
```bash
# 调用重置 API
curl -X POST http://localhost:5000/api/users/reset-daily
```

---

### Q: AI 功能不工作？
**A:** 确认：

1. **API Key 设置**
```bash
# .env 文件
OPENAI_API_KEY=sk-...
```

2. **余额检查**
登录 OpenAI 平台检查 API 余额

3. **错误日志**
查看服务器日志中的具体错误信息

---

## 错误解决方案

### Error: ECONNREFUSED
**原因**: 无法连接到服务
**解决**: 
- 确保服务正在运行
- 检查端口和地址配置
- 防火墙设置

### Error: Invalid token
**原因**: 认证令牌无效
**解决**:
- 清除本地存储并重新登录
- 检查 token 过期时间
- 确认密钥配置正确

### Error: Database connection failed
**原因**: 数据库连接问题
**解决**:
- 验证连接字符串
- 检查数据库服务状态
- 确认网络连接

### Error: Module not found
**原因**: 依赖缺失
**解决**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: Permission denied
**原因**: 权限不足
**解决**:
- 检查文件权限
- 使用正确的用户运行
- 数据库用户权限设置

---

## 🆘 还是没解决？

1. **搜索 GitHub Issues**
   - 查看是否有类似问题
   - 搜索错误关键词

2. **查看日志**
   ```bash
   # 服务器日志
   railway logs --tail 100
   
   # 本地日志
   npm run dev 2>&1 | tee debug.log
   ```

3. **创建详细的 Issue**
   包含以下信息：
   - 错误截图/日志
   - 复现步骤
   - 环境信息（OS, Node版本等）
   - 已尝试的解决方案

4. **寻求社区帮助**
   - Discord 服务器（即将推出）
   - Stack Overflow 标签：`levelupsolo`

---

💡 **提示**: 大多数问题都可以通过仔细阅读错误信息和查看日志来解决。保持耐心，一步步排查！