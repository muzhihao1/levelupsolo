# Level Up Solo - Project Knowledge Base & FAQ
# 项目知识库和常见问题解答

## 目录
1. [项目概述](#项目概述)
2. [核心概念](#核心概念)
3. [开发指南](#开发指南)
4. [常见问题解答](#常见问题解答)
5. [故障排除](#故障排除)
6. [最佳实践](#最佳实践)
7. [快速参考](#快速参考)
8. [资源链接](#资源链接)

## 项目概述

### 什么是 Level Up Solo？
Level Up Solo 是一个将个人成长游戏化的生活管理系统。通过将日常任务转化为游戏任务，帮助用户建立习惯、达成目标、提升六大核心技能。

### 项目架构
```
┌─────────────┐     ┌─────────────┐
│   Web App   │     │   iOS App   │
│  (React)    │     │  (SwiftUI)  │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └───────┬───────────┘
               │
        ┌──────▼──────┐
        │   API       │
        │ (Express)   │
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  Database   │
        │(PostgreSQL) │
        └─────────────┘
```

### 技术栈详解
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Node.js + Express + Drizzle ORM
- **数据库**: PostgreSQL (Supabase/Neon)
- **iOS**: SwiftUI + Swift 5.9+
- **AI**: OpenAI GPT-4o
- **部署**: Railway (后端) + Vercel (前端)

## 核心概念

### 1. 能量球系统 (Energy Balls)
```typescript
interface EnergyBall {
  total: 18;              // 每天18个能量球
  duration: 15;           // 每个15分钟
  totalMinutes: 270;      // 总计270分钟专注时间
  resetTime: "04:00";     // 凌晨4点重置
}
```

**设计理念**：
- 基于番茄工作法的简化版
- 鼓励专注和休息的平衡
- 每天的能量有限，需要合理分配

### 2. 六大技能系统
```typescript
enum Skills {
  PHYSICAL = "physical",       // 🏃 体能 - 运动、健康
  EMOTIONAL = "emotional",     // ❤️ 情感 - 情绪管理、人际关系
  MENTAL = "mental",          // 🧠 智力 - 学习、思考
  RELATIONSHIP = "relationship", // 👥 关系 - 社交、家庭
  FINANCIAL = "financial",    // 💰 财务 - 理财、职业发展
  WILLPOWER = "willpower"     // 💪 意志力 - 自律、习惯养成
}
```

**经验值计算**：
```typescript
// 升级所需经验值遵循指数增长
function getRequiredXP(level: number): number {
  return 100 * Math.pow(2, Math.floor((level - 1) / 10));
}
```

### 3. 任务类型
| 类型 | 描述 | 特点 |
|-----|------|------|
| **主线任务** | 长期目标的子任务 | 有截止日期，高优先级 |
| **支线任务** | 一次性任务 | 灵活安排，中等优先级 |
| **日常任务** | 每日习惯 | 每天重置，建立习惯 |

### 4. 成就系统
- **连续签到**: 3天、7天、30天、100天、365天
- **技能大师**: 单项技能达到10级、25级、50级、100级
- **全面发展**: 所有技能达到特定等级
- **任务达人**: 完成特定数量的任务

## 开发指南

### 环境搭建
```bash
# 1. 克隆项目
git clone https://github.com/levelupsolo/levelupsolo.git
cd levelupsolo

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置

# 4. 初始化数据库
npm run db:push

# 5. 启动开发服务器
npm run dev
```

### 关键命令速查
```bash
# 开发
npm run dev              # 启动开发服务器
npm run build           # 构建生产版本
npm run check           # TypeScript 类型检查

# 数据库
npm run db:push         # 推送 schema 变更
npm run db:studio       # 打开数据库管理界面

# 测试
npm test                # 运行测试
npm run test:coverage   # 生成覆盖率报告

# 工具
npm run health:check    # 健康检查
npm run quality:check   # 代码质量检查
npm run perf:check      # 性能检查

# 部署
npm run deploy          # 部署到生产环境
```

### 代码组织结构
```
levelupsolo/
├── client/              # React 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── hooks/      # 自定义 Hooks
│   │   ├── pages/      # 页面组件
│   │   └── lib/        # 工具函数
│   └── public/         # 静态资源
├── server/             # Express 后端
│   ├── routes.ts       # API 路由
│   ├── storage.ts      # 数据访问层
│   └── auth.ts         # 认证逻辑
├── shared/             # 共享代码
│   ├── schema.ts       # 数据库 Schema
│   └── types/          # TypeScript 类型
├── Level up solo-ios/  # iOS 应用
└── docs/              # 文档
```

### Git 工作流
```bash
# 功能开发
git checkout -b feature/feature-name
# 进行开发...
git add .
git commit -m "feat: add new feature"
git push origin feature/feature-name
# 创建 Pull Request

# 提交规范
feat:     # 新功能
fix:      # 修复 bug
docs:     # 文档更新
style:    # 代码格式调整
refactor: # 重构
test:     # 测试相关
chore:    # 构建/工具相关
```

## 常见问题解答

### 🔐 认证相关

**Q: 为什么登录后很快就需要重新登录？**
A: 检查以下几点：
1. 确保 `SESSION_SECRET` 环境变量已设置且足够长（至少32字符）
2. 生产环境需要配置 `secure: true` 的 cookie
3. 检查 Redis/内存存储是否正常工作

**Q: iOS 应用无法连接到后端？**
A: 
1. 确保后端 CORS 配置包含 iOS 应用的域名
2. 检查 JWT_SECRET 是否正确配置
3. 确认 API URL 配置正确（生产环境应该是 HTTPS）

### 📊 数据库相关

**Q: 如何处理数据库迁移？**
A: 
```bash
# 1. 修改 schema
# 编辑 shared/schema.ts

# 2. 生成迁移
npm run db:push

# 3. 在生产环境执行
# 确保先备份数据！
```

**Q: 数据库连接池错误？**
A: 
- 检查 `DATABASE_URL` 格式是否正确
- 确认数据库服务器可访问
- 查看是否超过了连接数限制

### 🎮 游戏机制相关

**Q: 能量球什么时候重置？**
A: 每天凌晨 4:00 AM (用户本地时间) 自动重置为 18 个

**Q: 技能等级如何计算？**
A: 
```typescript
// 根据总经验值计算等级
function calculateLevel(totalXP: number): number {
  let level = 1;
  let required = 100;
  
  while (totalXP >= required) {
    totalXP -= required;
    level++;
    if (level % 10 === 1) {
      required *= 2; // 每10级所需经验翻倍
    }
  }
  
  return level;
}
```

**Q: 任务优先级如何工作？**
A: 
- 优先级 1-5，数字越大优先级越高
- iOS 端必需此字段，Web 端可选（默认为3）
- 影响任务列表的默认排序

### 🚀 部署相关

**Q: Railway 部署失败？**
A: 检查清单：
1. 环境变量是否都已配置
2. `package.json` 中的 build 命令是否正确
3. Node.js 版本是否匹配（需要 >= 18）
4. 查看 Railway 日志找具体错误

**Q: 如何监控生产环境性能？**
A: 
```bash
# 使用内置工具
npm run perf:check -- --api-url https://api.levelupsolo.net

# 查看健康状态
curl https://api.levelupsolo.net/api/health
```

### 🐛 调试相关

**Q: 如何启用详细日志？**
A: 设置环境变量：
```bash
DEBUG=* npm run dev        # 显示所有日志
DEBUG=express:* npm run dev # 只显示 Express 日志
NODE_ENV=development       # 开发模式，更详细的错误信息
```

**Q: React Query 缓存问题？**
A: 
```typescript
// 清除特定查询缓存
queryClient.invalidateQueries(['tasks']);

// 清除所有缓存
queryClient.clear();

// 调试缓存状态
console.log(queryClient.getQueryCache().getAll());
```

## 故障排除

### 启动失败
```bash
# 检查端口占用
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# 检查 Node 版本
node --version  # 应该 >= 18.0.0

# 清理并重装依赖
rm -rf node_modules package-lock.json
npm install

# 检查 TypeScript 错误
npm run check
```

### 数据库连接失败
```sql
-- 测试连接
SELECT NOW();

-- 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- 检查权限
SELECT has_database_privilege('username', 'database', 'CONNECT');
```

### API 错误调试
```javascript
// 在 server/index.ts 添加调试中间件
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  next();
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal Server Error'
  });
});
```

### iOS 应用调试
```swift
// 启用网络日志
URLSession.shared.configuration.urlCache = nil
URLSession.shared.configuration.requestCachePolicy = .reloadIgnoringLocalCacheData

// API 请求调试
struct NetworkLogger {
    static func log(_ request: URLRequest) {
        print("🌐 \(request.httpMethod ?? "") \(request.url?.absoluteString ?? "")")
        if let body = request.httpBody,
           let json = try? JSONSerialization.jsonObject(with: body) {
            print("📦 Body: \(json)")
        }
    }
}
```

## 最佳实践

### 代码质量
1. **始终使用 TypeScript**: 不要使用 `any` 类型
2. **组件化**: 保持组件小而专注
3. **测试优先**: 写代码前先写测试
4. **文档化**: 复杂逻辑必须有注释

### 性能优化
1. **懒加载**: 使用 React.lazy() 和 Suspense
2. **缓存策略**: 合理使用 React Query 缓存
3. **图片优化**: 使用 WebP 格式，实现响应式图片
4. **数据库索引**: 为常用查询字段建立索引

### 安全性
1. **永不信任客户端**: 所有验证在服务器端进行
2. **使用环境变量**: 敏感信息不要硬编码
3. **HTTPS Only**: 生产环境必须使用 HTTPS
4. **定期更新依赖**: 使用 `npm audit` 检查漏洞

### 用户体验
1. **响应式设计**: 支持各种屏幕尺寸
2. **加载状态**: 所有异步操作显示加载指示
3. **错误处理**: 友好的错误提示
4. **可访问性**: 支持键盘导航和屏幕阅读器

## 快速参考

### 环境变量清单
```bash
# 必需
DATABASE_URL=           # PostgreSQL 连接字符串
SESSION_SECRET=         # 会话密钥（至少32字符）
JWT_SECRET=            # JWT 密钥（至少32字符）

# 可选但推荐
OPENAI_API_KEY=        # AI 功能
NODE_ENV=              # production/development
PORT=                  # 服务器端口（默认5000）

# OAuth (可选)
REPLIT_CLIENT_ID=      # Replit OAuth
REPLIT_CLIENT_SECRET=  # Replit OAuth

# 监控 (可选)
SENTRY_DSN=           # 错误追踪
ANALYTICS_ID=         # 分析 ID
```

### API 端点速查
```
认证:
POST   /api/auth/register     # 注册
POST   /api/auth/login        # 登录
POST   /api/auth/logout       # 登出
GET    /api/auth/me          # 当前用户

任务:
GET    /api/tasks            # 任务列表
POST   /api/tasks            # 创建任务
PUT    /api/tasks/:id        # 更新任务
DELETE /api/tasks/:id        # 删除任务
POST   /api/tasks/:id/complete # 完成任务

技能:
GET    /api/skills           # 技能列表
PUT    /api/skills/:id       # 更新技能

目标:
GET    /api/goals            # 目标列表
POST   /api/goals            # 创建目标
PUT    /api/goals/:id        # 更新目标
DELETE /api/goals/:id        # 删除目标
```

### 数据库 Schema 速查
```sql
-- 用户表
users (id, email, username, passwordHash, createdAt)

-- 用户资料
userProfiles (userId, displayName, avatar, bio, preferences)

-- 用户统计
userStats (userId, totalXP, level, currentEnergy, lastEnergyReset, streakDays)

-- 技能
skills (id, userId, name, currentXP, level, color, icon)

-- 任务
tasks (id, userId, goalId, title, description, type, completed, xpReward, skillId, dueDate, priority)

-- 目标
goals (id, userId, title, description, targetDate, completed, progress)

-- 活动日志
activityLogs (id, userId, action, targetType, targetId, metadata, timestamp)
```

### 常用代码片段

**React Query 使用**:
```typescript
// 获取数据
const { data, isLoading, error } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  staleTime: 5 * 60 * 1000, // 5分钟
});

// 修改数据
const mutation = useMutation({
  mutationFn: updateTask,
  onSuccess: () => {
    queryClient.invalidateQueries(['tasks']);
  },
});
```

**错误边界**:
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    // 发送到错误追踪服务
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

**API 请求封装**:
```typescript
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  return response.json();
}
```

## 资源链接

### 官方文档
- [React 文档](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [SwiftUI 教程](https://developer.apple.com/tutorials/swiftui)

### 项目相关
- [GitHub 仓库](https://github.com/levelupsolo/levelupsolo)
- [设计文档](/attached_assets)
- [API 文档](/docs/API_DOCUMENTATION.md)
- [部署指南](/docs/RAILWAY_DEPLOYMENT_GUIDE.md)

### 工具和服务
- [Railway Dashboard](https://railway.app)
- [Supabase Console](https://app.supabase.com)
- [OpenAI Platform](https://platform.openai.com)
- [Vercel Dashboard](https://vercel.com/dashboard)

### 社区资源
- Discord 服务器（即将推出）
- 开发者论坛（计划中）
- YouTube 教程（制作中）

### 学习资源
- [Level Up Solo 开发日志](https://dev.to/levelupsolo)
- [游戏化设计原则](https://yukaichou.com/gamification-examples/octalysis-complete-gamification-framework/)
- [习惯养成科学](https://jamesclear.com/atomic-habits)

---

## 需要更多帮助？

1. **查看其他文档**: 在 `/docs` 目录下有更详细的专题文档
2. **搜索问题**: 使用 GitHub Issues 搜索类似问题
3. **提交 Issue**: 如果找不到答案，欢迎提交新的 Issue
4. **贡献文档**: 发现文档有误或不完整？欢迎提交 PR！

💡 **记住**: 这是一个开源项目，我们都在学习和成长。没有愚蠢的问题，只有共同进步的机会！