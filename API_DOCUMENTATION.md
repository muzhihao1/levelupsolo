# Level Up Solo API Documentation

## 概述
Level Up Solo API 是一个 RESTful API，为 Web 和 iOS 客户端提供统一的后端服务。所有 API 端点都需要认证（除了 health check 和 auth 端点）。

**Base URL**: 
- Production: `https://www.levelupsolo.net/api`
- Local: `http://localhost:5000/api`

## 认证

### 认证方式
- **Web**: Session-based authentication with cookies
- **Mobile**: JWT token authentication

### 认证头部
```
Authorization: Bearer <jwt_token>  // for mobile
Cookie: connect.sid=<session_id>  // for web
```

## API 端点

### Health & Diagnostics

#### GET /api/health
健康检查端点，无需认证

**Response**:
```json
{
  "status": "ok" | "degraded",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "environment": "production",
  "database": {
    "status": "connected" | "error" | "no_tables",
    "error": null,
    "tablesExist": true,
    "userCount": 10
  }
}
```

#### GET /api/test/db-check
数据库架构检查（开发环境）

#### GET /api/security/status
安全配置状态检查

### Authentication 认证

#### POST /api/auth/login
用户登录

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "jwt_token_here" // Only for mobile
}
```

#### POST /api/auth/register
用户注册

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST /api/auth/logout
用户登出

#### GET /api/auth/user
获取当前用户信息（需要认证）

**Response**:
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Skills 技能系统

#### GET /api/skills
获取用户所有技能（自动初始化核心技能）

**Response**:
```json
[
  {
    "id": 1,
    "userId": "user_123",
    "name": "身体掌控力",
    "level": 1,
    "exp": 0,
    "maxExp": 100,
    "color": "#EF4444",
    "icon": "fas fa-running",
    "skillType": "basic",
    "category": "physical",
    "talentPoints": 0,
    "prestige": 0,
    "unlocked": true,
    "prerequisites": []
  }
]
```

#### POST /api/skills
创建新技能

**Request Body**:
```json
{
  "name": "新技能",
  "color": "#6366F1",
  "icon": "fas fa-star",
  "category": "general"
}
```

#### PATCH /api/skills/:id
更新技能信息

**Request Body**:
```json
{
  "exp": 50,
  "level": 2
}
```

#### POST /api/skills/initialize-core
初始化六大核心技能

### Tasks 任务管理

#### GET /api/tasks
获取用户所有任务

**Query Parameters**:
- `category`: Filter by task category (habit, daily, todo)
- `completed`: Filter by completion status (true/false)

**Response**:
```json
[
  {
    "id": 1,
    "userId": "user_123",
    "title": "晨跑30分钟",
    "description": "每天早上跑步锻炼",
    "completed": false,
    "skillId": 1,
    "goalId": null,
    "expReward": 20,
    "estimatedDuration": 30,
    "taskCategory": "habit",
    "taskType": "daily",
    "difficulty": "medium",
    "requiredEnergyBalls": 2,
    "tags": ["健康", "运动"],
    "skills": ["身体掌控力"],
    "habitStreak": 5,
    "lastCompletedDate": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### POST /api/tasks
创建新任务

**Request Body**:
```json
{
  "title": "学习新技术",
  "description": "学习 React Native",
  "taskCategory": "todo",
  "difficulty": "hard",
  "expReward": 50,
  "requiredEnergyBalls": 4,
  "skillId": 2,
  "tags": ["学习", "技术"]
}
```

#### PATCH /api/tasks/:id
更新任务

**Request Body**:
```json
{
  "completed": true,
  "actualDuration": 45
}
```

**Special Rules**:
- Habits: 每天只能完成一次，完成后增加连续天数
- Daily tasks: 每天重置完成状态
- Energy balls: 完成任务消耗能量球，取消完成恢复能量球

#### DELETE /api/tasks/:id
删除任务

#### POST /api/tasks/intelligent-create
智能创建任务（使用 AI）

**Request Body**:
```json
{
  "description": "每天坚持阅读30分钟"
}
```

**Response**:
```json
{
  "task": { /* 创建的任务对象 */ },
  "analysis": {
    "category": "habit",
    "title": "每日阅读",
    "difficulty": "medium",
    "skillName": "心智成长力",
    "energyBalls": 2
  }
}
```

#### POST /api/tasks/auto-assign-skills
为现有任务自动分配技能

#### POST /api/tasks/reset-daily-habits
重置每日习惯任务

#### POST /api/tasks/analyze-task
分析任务并提供建议

**Request Body**:
```json
{
  "title": "完成项目报告",
  "description": "编写季度项目总结报告"
}
```

### Goals 目标管理

#### GET /api/goals
获取用户所有目标

**Response**:
```json
[
  {
    "id": 1,
    "userId": "user_123",
    "title": "成为全栈开发者",
    "description": "学习前后端技术，完成个人项目",
    "completed": false,
    "progress": 0.3,
    "targetDate": "2024-12-31T00:00:00.000Z",
    "expReward": 100,
    "pomodoroExpReward": 10,
    "requiredEnergyBalls": 4,
    "skillTags": ["心智成长力", "意志执行力"],
    "relatedSkillIds": [2, 3],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### POST /api/goals
创建新目标

**Request Body**:
```json
{
  "title": "学习机器学习",
  "description": "完成机器学习课程并实现项目",
  "targetDate": "2024-12-31",
  "expReward": 150,
  "relatedSkillIds": [2]
}
```

#### PATCH /api/goals/:id
更新目标

#### DELETE /api/goals/:id
删除目标

#### POST /api/goals/generate-milestones
AI 生成里程碑

**Request Body**:
```json
{
  "title": "成为全栈开发者",
  "description": "学习前后端技术"
}
```

**Response**:
```json
[
  "掌握前端基础（HTML/CSS/JS）",
  "完成第一个全栈项目",
  "部署应用到生产环境"
]
```

#### POST /api/goals/intelligent-create
智能创建目标（使用 AI）

**Request Body**:
```json
{
  "description": "我想在6个月内成为一名优秀的前端开发者"
}
```

### Milestones 里程碑

#### GET /api/goals/:goalId/milestones
获取目标的里程碑

#### POST /api/goals/:goalId/milestones
创建里程碑

**Request Body**:
```json
{
  "title": "完成基础课程",
  "description": "学习 HTML、CSS 和 JavaScript 基础",
  "order": 1
}
```

#### PATCH /api/milestones/:id
更新里程碑

#### DELETE /api/milestones/:id
删除里程碑

### MicroTasks 微任务

#### GET /api/tasks/:taskId/microtasks
获取任务的微任务

#### POST /api/tasks/:taskId/microtasks
创建微任务

**Request Body**:
```json
{
  "title": "阅读第一章",
  "duration": 15,
  "difficulty": "easy",
  "expReward": 5
}
```

### User Stats 用户统计

#### GET /api/users/stats
获取用户游戏统计数据

**Response**:
```json
{
  "level": 5,
  "experience": 450,
  "experienceToNext": 600,
  "energyBalls": 15,
  "maxEnergyBalls": 18,
  "streak": 7,
  "totalTasksCompleted": 123
}
```

#### POST /api/users/consume-energy
消耗能量球

**Request Body**:
```json
{
  "amount": 2
}
```

### AI Features AI功能

#### POST /api/ai/categorize-task
AI 任务分类

#### POST /api/ai/generate-subtasks
AI 生成子任务

#### POST /api/ai/analyze-goal
AI 分析目标

### Mobile-specific 移动端专用

#### POST /api/mobile/auth/register
移动端注册（返回 JWT）

#### POST /api/mobile/auth/login
移动端登录（返回 JWT）

#### GET /api/mobile/sync
获取同步数据

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "message": "错误描述",
  "error": "错误代码（可选）",
  "errors": [] // 验证错误详情（可选）
}
```

### 常见错误码

- `400` - Bad Request: 请求参数错误
- `401` - Unauthorized: 未认证或认证失效
- `403` - Forbidden: 无权限访问
- `404` - Not Found: 资源不存在
- `409` - Conflict: 资源冲突（如邮箱已存在）
- `429` - Too Many Requests: 请求过于频繁
- `500` - Internal Server Error: 服务器内部错误
- `503` - Service Unavailable: 服务暂时不可用

## 数据类型说明

### TaskCategory 任务分类
- `habit` - 习惯（每日重复）
- `daily` - 每日任务
- `todo` - 待办事项

### TaskType 任务类型
- `main` - 主线任务
- `stage` - 阶段任务
- `daily` - 每日任务
- `simple` - 简单任务

### Difficulty 难度等级
- `trivial` - 琐碎（0.5x 经验）
- `easy` - 简单（0.75x 经验）
- `medium` - 中等（1x 经验）
- `hard` - 困难（1.5x 经验）

### Core Skills 核心技能
1. 身体掌控力 (Physical)
2. 心智成长力 (Mental)
3. 意志执行力 (Willpower)
4. 关系经营力 (Relationship)
5. 财富掌控力 (Financial)
6. 情绪稳定力 (Emotional)

## 最佳实践

1. **分页**: 对于列表端点，使用 `?page=1&limit=20` 进行分页
2. **过滤**: 使用查询参数过滤结果，如 `?completed=false&category=habit`
3. **错误处理**: 始终检查响应状态码并妥善处理错误
4. **认证**: 在请求头中包含正确的认证信息
5. **时区**: 所有时间戳使用 UTC 时间
6. **批量操作**: 尽可能使用批量端点减少请求次数

## 版本控制

当前 API 版本: v1（隐式）

未来版本将通过 URL 路径指定：`/api/v2/...`

## Rate Limiting

- 认证用户: 1000 请求/小时
- 未认证用户: 100 请求/小时
- AI 相关端点: 100 请求/小时

超出限制将返回 `429 Too Many Requests` 错误。