# Level Up Solo (个人成长RPG系统)

一个将个人成长转化为沉浸式RPG冒险体验的智能化平台，通过游戏化机制激发持续学习和自我提升的动力。

## 🎯 核心特色

### 🎮 RPG游戏化体系
- **能量球系统**: 每个能量球代表15分钟专注时间，替代传统HP概念
- **六大核心技能**: 身体掌控力、情绪稳定力、心智成长力、关系经营力、财富掌控力、意志执行力
- **技能升级**: 通过完成任务获得经验值，技能等级真实反映成长进度
- **成就系统**: 解锁里程碑成就，获得稀有徽章和奖励

### 🤖 AI智能化功能
- **智能任务创建**: GPT-4o自动识别任务类型并分配相应技能
- **目标智能规划**: AI自动生成可行的里程碑和执行步骤
- **任务分类**: 自动区分习惯任务vs支线任务，优化工作流程

### 📊 任务管理体系
- **三类任务系统**: 
  - 🎯 主线任务 (Main Quests): 长期核心目标
  - ✅ 支线任务 (Side Quests): 一次性完成任务  
  - 🔄 习惯任务 (Habits): 每日可重复习惯培养
- **自动习惯重置**: 每日自动重置已完成习惯，无需手动操作
- **番茄钟战斗**: 沉浸式专注体验，化学习为RPG战斗

### 📈 数据驱动洞察
- **技能雷达图**: 六维技能发展可视化分析
- **成长轨迹**: 详细记录每日进步和经验获取
- **智能统计**: 实时追踪完成率、连续天数、总体成长趋势

## 🛠 技术架构

### 前端技术栈
- **React 18** + **TypeScript**: 现代化组件开发
- **Vite**: 极速热重载开发体验
- **Tailwind CSS**: 响应式设计和暗黑主题
- **TanStack React Query**: 智能数据缓存和状态管理
- **Radix UI**: 无障碍访问的高质量组件库
- **Wouter**: 轻量级前端路由
- **Framer Motion**: 流畅的动画和交互效果

### 后端技术栈
- **Node.js** + **Express**: 高性能API服务
- **PostgreSQL**: 企业级关系数据库
- **Drizzle ORM**: 类型安全的数据库操作
- **Replit Auth**: 基于OpenID Connect的安全认证
- **OpenAI GPT-4o**: 最新AI模型集成

### 数据库设计
```sql
核心表结构:
├── users (用户基础信息)
├── user_stats (用户游戏统计)
├── skills (六大核心技能)
├── tasks (任务管理)
├── goals (目标规划)
├── achievements (成就系统)
└── activity_logs (活动记录)
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- OpenAI API Key

### 安装步骤
```bash
# 1. 克隆项目
git clone [repository-url]
cd level-up-solo

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加必要的API密钥

# 4. 数据库迁移
npm run db:push

# 5. 启动开发服务器
npm run dev
```

### 环境变量配置
```env
DATABASE_URL=postgresql://username:password@localhost:5432/levelupsolo
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_session_secret
REPL_ID=your_replit_id
ISSUER_URL=https://replit.com/oidc
```

## 📱 功能模块

### 1. 仪表板 (Dashboard)
- 个人成长概览和关键指标
- 今日任务完成情况
- 技能进度可视化
- 连续天数和成就展示

### 2. 任务管理 (Task Manager)
- 统一的RPG风格任务界面
- 智能AI任务创建
- 番茄钟专注战斗模式
- 自动习惯重置系统

### 3. 技能树 (Skill Tree)
- 六大核心技能详细展示
- 技能等级和经验值追踪
- 技能点分配和天赋系统
- 技能间关联性分析

### 4. 目标规划 (Goals)
- AI辅助目标创建
- 智能里程碑分解
- 进度追踪和完成率统计
- 目标与任务的关联管理

### 5. 成长日志 (Growth Log)
- 详细的活动记录
- 经验值获取历史
- 技能提升轨迹
- 个人成长insights

## 🎨 设计理念

### 游戏化心理学
- **自主性**: 用户完全掌控自己的成长路径
- **胜任感**: 通过技能升级获得真实的能力提升感
- **关联性**: 技能间的协同效应增强整体发展

### 用户体验原则
- **简洁直观**: 复杂功能简单化，减少认知负担
- **即时反馈**: 每个操作都有明确的视觉和数据反馈
- **沉浸体验**: RPG元素营造身临其境的成长感受

## 🔧 开发指南

### 项目结构
```
level-up-solo/
├── client/src/           # React前端源码
│   ├── components/       # 可复用组件
│   ├── pages/           # 页面组件
│   ├── hooks/           # 自定义React hooks
│   └── lib/             # 工具函数和配置
├── server/              # Express后端源码
│   ├── routes.ts        # API路由定义
│   ├── storage.ts       # 数据访问层
│   └── db.ts            # 数据库连接
├── shared/              # 前后端共享代码
│   └── schema.ts        # 数据模型定义
└── docs/                # 项目文档
```

### 关键设计模式
- **Repository Pattern**: 数据访问抽象化
- **Component Composition**: React组件组合设计
- **Query-First API**: 基于React Query的数据流
- **Type-Driven Development**: TypeScript完整类型覆盖

### 代码质量
- ESLint + Prettier 代码格式化
- TypeScript 严格模式
- React Query 智能缓存策略
- 组件级错误边界

## 📊 系统特色

### 能量球机制
创新的时间管理概念，每个能量球代表15分钟的专注时间：
- 每日默认18个能量球（4.5小时有效工作时间）
- 能量高峰时间段效率加成
- 任务完成消耗对应能量球数量

### 六大核心技能体系
科学的个人发展维度划分：
1. **身体掌控力**: 健康、运动、体能相关
2. **情绪稳定力**: 情绪管理、心理健康
3. **心智成长力**: 学习、思考、创新能力
4. **关系经营力**: 社交、沟通、团队协作
5. **财富掌控力**: 理财、投资、资源管理
6. **意志执行力**: 目标达成、时间管理、自律

### AI智能辅助
- 任务描述自动技能识别
- 目标可行性智能评估
- 个性化成长建议生成
- 学习路径智能优化

## 🚦 版本历程

### v2.0 当前版本
- ✅ 完整的能量球系统
- ✅ 六大核心技能体系
- ✅ 自动习惯重置功能
- ✅ AI智能任务创建
- ✅ 沉浸式番茄钟体验
- ✅ 暗黑主题UI设计

### v1.0 基础版本
- 基础任务管理
- 简单技能追踪
- 目标创建功能

## 🤝 贡献指南

我们欢迎社区贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 开发流程
1. Fork项目仓库
2. 创建功能分支
3. 提交代码变更
4. 发起Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- **OpenAI**: 提供强大的GPT-4o AI能力
- **Replit**: 优秀的开发和部署平台
- **开源社区**: 众多优秀的开源项目支持

---

**Level Up Solo** - 将每一天都变成升级打怪的冒险之旅！