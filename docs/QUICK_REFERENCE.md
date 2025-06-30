# Level Up Solo - Quick Reference Guide
# 快速参考指南

## 🚀 快速启动

### 本地开发（5分钟）
```bash
# 1. 克隆并进入项目
git clone https://github.com/levelupsolo/levelupsolo.git && cd levelupsolo

# 2. 安装依赖
npm install

# 3. 设置环境变量
cp .env.example .env
# 编辑 .env，至少设置 DATABASE_URL 和 SESSION_SECRET

# 4. 初始化数据库
npm run db:push

# 5. 启动开发服务器
npm run dev

# 访问 http://localhost:5000
```

### 生产部署（Railway）
```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
railway init

# 4. 添加环境变量
railway variables set DATABASE_URL="your-db-url"
railway variables set SESSION_SECRET="your-secret-key"
railway variables set JWT_SECRET="your-jwt-secret"
railway variables set NODE_ENV="production"

# 5. 部署
railway up
```

## 📝 常用命令一览表

| 命令 | 描述 | 使用场景 |
|------|------|----------|
| `npm run dev` | 启动开发服务器 | 日常开发 |
| `npm run build` | 构建生产版本 | 部署前 |
| `npm start` | 运行生产服务器 | 生产环境 |
| `npm run check` | TypeScript 检查 | 提交前 |
| `npm run db:push` | 同步数据库 schema | 修改 schema 后 |
| `npm run db:studio` | 数据库管理界面 | 查看/修改数据 |
| `npm test` | 运行测试 | 开发/CI |
| `npm run health:check` | 健康检查 | 日常监控 |
| `npm run quality:check` | 代码质量检查 | 代码审查 |
| `npm run perf:check` | 性能检查 | 性能调优 |

## 🔧 环境变量速查

### 必需变量
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db  # PostgreSQL 连接
SESSION_SECRET=your-very-long-random-secret-key   # 至少32字符
JWT_SECRET=another-very-long-random-secret-key    # 至少32字符
```

### 可选变量
```bash
# AI 功能
OPENAI_API_KEY=sk-...

# 环境
NODE_ENV=production|development
PORT=5000

# OAuth（可选）
REPLIT_CLIENT_ID=...
REPLIT_CLIENT_SECRET=...

# 监控（可选）
SENTRY_DSN=https://...
```

## 🏗️ 项目结构速览

```
levelupsolo/
├── client/src/          # React 前端
│   ├── components/      # UI 组件
│   ├── hooks/          # 自定义 Hooks
│   ├── pages/          # 页面组件
│   └── lib/            # 工具函数
├── server/             # Express 后端
│   ├── routes.ts       # API 路由定义
│   ├── storage.ts      # 数据访问层
│   └── index.ts        # 服务器入口
├── shared/             # 共享代码
│   ├── schema.ts       # 数据库模型
│   └── types/          # 类型定义
└── docs/              # 项目文档
```

## 🌐 API 快速参考

### 认证 API
```typescript
POST /api/auth/register   { email, username, password }
POST /api/auth/login      { email, password }
POST /api/auth/logout     
GET  /api/auth/me         
```

### 任务 API
```typescript
GET    /api/tasks         ?type=main|side|habit&completed=true|false
POST   /api/tasks         { title, description, type, skillId, xpReward }
PUT    /api/tasks/:id     { title, description, ... }
DELETE /api/tasks/:id     
POST   /api/tasks/:id/complete
```

### 技能 API
```typescript
GET    /api/skills        
PUT    /api/skills/:id    { currentXP, level }
```

### 目标 API
```typescript
GET    /api/goals         ?completed=true|false
POST   /api/goals         { title, description, targetDate }
PUT    /api/goals/:id     { title, description, ... }
DELETE /api/goals/:id     
```

## 💾 数据库模型速查

### 核心表结构
```sql
-- 用户系统
users          (id, email, username, passwordHash)
userProfiles   (userId, displayName, avatar, preferences)
userStats      (userId, totalXP, level, currentEnergy, streakDays)

-- 游戏系统
skills         (id, userId, name, currentXP, level)
tasks          (id, userId, title, type, completed, xpReward, skillId, priority)
goals          (id, userId, title, targetDate, completed, progress)
achievements   (id, userId, type, unlockedAt)

-- 日志系统
activityLogs   (id, userId, action, timestamp, metadata)
```

## 🎮 游戏机制速查

### 经验值系统
```typescript
// 升级所需 XP
level 1-10:   100 XP/级
level 11-20:  200 XP/级
level 21-30:  400 XP/级
level 31-40:  800 XP/级
...每10级翻倍
```

### 能量球系统
```typescript
总数: 18个/天
时长: 15分钟/个
重置: 每天凌晨4点
恢复: 不可恢复，需合理分配
```

### 任务奖励参考
```typescript
简单任务: 10-25 XP (1个能量球)
中等任务: 30-50 XP (2个能量球)
困难任务: 60-100 XP (3个能量球)
史诗任务: 150+ XP (4+个能量球)
```

## 🐛 常见问题快速解决

### 开发环境问题
```bash
# 端口被占用
lsof -i :5000 && kill -9 $(lsof -t -i :5000)

# 依赖问题
rm -rf node_modules package-lock.json && npm install

# TypeScript 错误
npm run check -- --noEmit

# 数据库连接失败
psql $DATABASE_URL -c "SELECT 1"
```

### 生产环境问题
```bash
# 检查日志
railway logs

# 重启服务
railway restart

# 环境变量检查
railway variables

# 健康检查
curl https://your-app.railway.app/api/health
```

## 🛠️ 开发小技巧

### VS Code 推荐插件
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Prisma
- GitLens
- Thunder Client (API 测试)

### 调试技巧
```typescript
// React 组件调试
console.log('Render:', { props, state });
React.useEffect(() => {
  console.log('Effect triggered');
  return () => console.log('Cleanup');
});

// API 调试
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// 数据库查询调试
const result = await db.query('...').debug();
```

### Git 别名设置
```bash
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
```

## 📱 iOS 开发速查

### 环境要求
- Xcode 15+
- iOS 15.0+
- Swift 5.9+

### 关键文件
```
Level up solo-ios/
├── Models/          # 数据模型
├── Views/           # SwiftUI 视图
├── ViewModels/      # MVVM 视图模型
├── Services/        # API 服务
└── Resources/       # 资源文件
```

### 常用调试命令
```swift
// 打印网络请求
print("🌐 API Request: \(request.url?.absoluteString ?? "")")

// 查看内存使用
print("💾 Memory: \(ProcessInfo.processInfo.physicalMemory / 1024 / 1024) MB")

// 性能计时
let start = CFAbsoluteTimeGetCurrent()
// ... 代码 ...
print("⏱ Time: \(CFAbsoluteTimeGetCurrent() - start)s")
```

## 🚨 紧急联系方式

### 生产问题
1. 检查 Railway 状态页
2. 查看 Sentry 错误报告
3. 检查数据库连接
4. 回滚到上一个稳定版本

### 回滚命令
```bash
# Railway 回滚
railway deployments list
railway deployments rollback <deployment-id>

# Git 回滚
git revert HEAD
git push origin main
```

## 📊 监控仪表板链接

- **Railway Dashboard**: https://railway.app/dashboard
- **数据库管理**: 运行 `npm run db:studio`
- **健康检查**: http://localhost:3001 (运行 `npm run health:dashboard`)
- **性能监控**: 运行 `npm run perf:watch`

---

💡 **提示**: 将此文档打印或保存为 PDF，方便离线查阅！

📌 **更新**: 此文档最后更新于 2024-01-xx。如有变更，请查看最新版本。