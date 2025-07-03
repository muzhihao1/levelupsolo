# Level Up Solo 数据库架构文档

## 概述

Level Up Solo 使用 PostgreSQL 作为主数据库，通过 Drizzle ORM 进行数据管理。数据库设计遵循游戏化个人成长系统的核心理念，将用户的日常任务、技能成长和目标管理融合在一起。

## 数据库技术栈

- **数据库**: PostgreSQL 15+
- **ORM**: Drizzle ORM
- **连接池**: pg (node-postgres)
- **迁移工具**: drizzle-kit
- **托管服务**: Railway / Supabase / Neon

## 核心设计原则

1. **游戏化机制**: 所有表都包含游戏化元素（经验值、等级、能量球等）
2. **关系完整性**: 使用外键确保数据一致性
3. **扩展性**: 预留字段和灵活的JSON存储
4. **性能优化**: 适当的索引和查询优化
5. **审计追踪**: 关键表包含创建和更新时间戳

## 数据库架构图

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   sessions  │     │      users      │     │ userProfiles │
└─────────────┘     └────────┬────────┘     └──────┬───────┘
                             │                      │
                    ┌────────┴────────┬─────────────┤
                    │                 │             │
              ┌─────▼─────┐    ┌─────▼─────┐ ┌────▼─────┐
              │ userStats │    │   skills  │ │  tasks   │
              └───────────┘    └───────────┘ └────┬─────┘
                                                  │
                             ┌────────────────────┼─────────────┐
                             │                    │             │
                       ┌─────▼─────┐       ┌─────▼─────┐ ┌────▼──────┐
                       │   goals   │       │microTasks │ │activityLogs│
                       └─────┬─────┘       └───────────┘ └────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼──────┐   ┌─────▼─────┐
              │ milestones │   │ goalTasks │
              └────────────┘   └───────────┘
```

## 表结构详细说明

### 1. sessions (会话管理)
用于Web端的session认证存储

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| sid | varchar | Session ID | PRIMARY KEY |
| sess | jsonb | Session数据 | NOT NULL |
| expire | timestamp | 过期时间 | NOT NULL, INDEX |

### 2. users (用户表)
存储用户基本信息和认证数据

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | varchar | 用户唯一ID | PRIMARY KEY |
| email | varchar | 邮箱地址 | UNIQUE |
| firstName | varchar | 名 | |
| lastName | varchar | 姓 | |
| profileImageUrl | varchar | 头像URL | |
| hashedPassword | text | 加密密码 | |
| createdAt | timestamp | 创建时间 | DEFAULT NOW() |
| updatedAt | timestamp | 更新时间 | DEFAULT NOW() |

### 3. userProfiles (用户档案)
存储用户详细信息和个性化设置

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | serial | 自增ID | PRIMARY KEY |
| userId | varchar | 用户ID | NOT NULL, REFERENCES users(id) |
| name | text | 显示名称 | NOT NULL |
| age | text | 年龄 | |
| occupation | text | 职业 | |
| mission | text | 人生使命 | |
| hasCompletedOnboarding | boolean | 是否完成引导 | DEFAULT false |
| hasCompletedTutorial | boolean | 是否完成教程 | DEFAULT false |
| createdAt | timestamp | 创建时间 | DEFAULT NOW() |
| updatedAt | timestamp | 更新时间 | DEFAULT NOW() |

### 4. userStats (用户游戏统计)
Habitica风格的游戏化统计数据

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | serial | 自增ID | PRIMARY KEY |
| userId | varchar | 用户ID | NOT NULL, UNIQUE, REFERENCES users(id) |
| level | integer | 等级 | DEFAULT 1 |
| experience | integer | 当前经验值 | DEFAULT 0 |
| experienceToNext | integer | 升级所需经验 | DEFAULT 100 |
| energyBalls | integer | 当前能量球数 | DEFAULT 18 |
| maxEnergyBalls | integer | 每日最大能量球 | DEFAULT 18 |
| energyBallDuration | integer | 单个能量球时长(分钟) | DEFAULT 15 |
| energyPeakStart | integer | 能量高峰开始时间 | DEFAULT 9 |
| energyPeakEnd | integer | 能量高峰结束时间 | DEFAULT 12 |
| streak | integer | 连续完成天数 | DEFAULT 0 |
| totalTasksCompleted | integer | 总完成任务数 | DEFAULT 0 |
| lastEnergyReset | timestamp | 上次能量重置时间 | DEFAULT NOW() |
| createdAt | timestamp | 创建时间 | DEFAULT NOW() |
| updatedAt | timestamp | 更新时间 | DEFAULT NOW() |

### 5. skills (技能表)
六大核心技能及扩展技能系统

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | serial | 自增ID | PRIMARY KEY |
| userId | varchar | 用户ID | NOT NULL, REFERENCES users(id) |
| name | text | 技能名称 | NOT NULL |
| level | integer | 技能等级 | DEFAULT 1 |
| exp | integer | 当前经验值 | DEFAULT 0 |
| maxExp | integer | 升级所需经验 | DEFAULT 100 |
| color | text | 显示颜色 | DEFAULT '#6366F1' |
| icon | text | 图标类名 | DEFAULT 'fas fa-star' |
| skillType | text | 技能类型 | DEFAULT 'basic' |
| category | text | 技能分类 | DEFAULT 'general' |
| talentPoints | integer | 天赋点数 | DEFAULT 0 |
| prestige | integer | 声望等级 | DEFAULT 0 |
| unlocked | boolean | 是否已解锁 | DEFAULT true |
| prerequisites | integer[] | 前置技能ID数组 | |

**核心技能分类**:
- 身体掌控力 (Physical)
- 心智成长力 (Mental)
- 意志执行力 (Willpower)
- 关系经营力 (Relationship)
- 财富掌控力 (Financial)
- 情绪稳定力 (Emotional)

### 6. tasks (任务表)
所有类型任务的统一存储

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | serial | 自增ID | PRIMARY KEY |
| userId | varchar | 用户ID | NOT NULL, REFERENCES users(id) |
| title | text | 任务标题 | NOT NULL |
| description | text | 任务描述 | |
| completed | boolean | 是否完成 | DEFAULT false |
| skillId | integer | 关联技能ID | REFERENCES skills(id) |
| goalId | integer | 关联目标ID | REFERENCES goals(id) |
| goalTags | text[] | 目标标签数组 | |
| expReward | integer | 经验奖励 | DEFAULT 0 |
| estimatedDuration | integer | 预估时长(分钟) | DEFAULT 25 |
| actualDuration | integer | 实际耗时(分钟) | |
| accumulatedTime | integer | 累积时间(分钟) | DEFAULT 0 |
| pomodoroSessionId | text | 番茄钟会话ID | |
| startedAt | timestamp | 开始时间 | |
| createdAt | timestamp | 创建时间 | DEFAULT NOW() |
| completedAt | timestamp | 完成时间 | |
| taskCategory | text | 任务分类 | DEFAULT 'todo' |
| taskType | text | 任务类型 | DEFAULT 'simple' |
| parentTaskId | integer | 父任务ID | |
| order | integer | 排序顺序 | DEFAULT 0 |
| tags | text[] | 任务标签 | DEFAULT '{}' |
| skills | text[] | 关联技能名称 | DEFAULT '{}' |
| habitDirection | text | 习惯方向 | DEFAULT 'positive' |
| habitStreak | integer | 习惯连续天数 | DEFAULT 0 |
| habitValue | real | 习惯强度值 | DEFAULT 0 |
| isDailyTask | boolean | 是否每日任务 | DEFAULT false |
| dailyStreak | integer | 每日连续天数 | DEFAULT 0 |
| isRecurring | boolean | 是否重复任务 | DEFAULT false |
| recurringPattern | text | 重复模式 | |
| lastCompletedDate | timestamp | 最后完成日期 | |
| difficulty | text | 难度等级 | DEFAULT 'medium' |
| requiredEnergyBalls | integer | 所需能量球数 | DEFAULT 1 |

**任务分类 (taskCategory)**:
- `habit`: 习惯养成
- `daily`: 每日任务
- `todo`: 待办事项

**任务类型 (taskType)**:
- `main`: 主线任务
- `stage`: 阶段任务
- `daily`: 每日任务
- `simple`: 简单任务

### 7. goals (目标表)
长期目标管理

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | serial | 自增ID | PRIMARY KEY |
| userId | varchar | 用户ID | NOT NULL, REFERENCES users(id) |
| title | text | 目标标题 | NOT NULL |
| description | text | 目标描述 | |
| completed | boolean | 是否完成 | DEFAULT false |
| progress | real | 完成进度(0-1) | DEFAULT 0 |
| targetDate | timestamp | 目标日期 | |
| expReward | integer | 完成经验奖励 | DEFAULT 50 |
| pomodoroExpReward | integer | 番茄钟经验奖励 | DEFAULT 10 |
| requiredEnergyBalls | integer | 所需能量球数 | DEFAULT 4 |
| skillTags | text[] | 技能标签 | |
| relatedSkillIds | integer[] | 关联技能ID | |
| createdAt | timestamp | 创建时间 | DEFAULT NOW() |
| completedAt | timestamp | 完成时间 | |

### 8. milestones (里程碑表)
目标的阶段性成果

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | serial | 自增ID | PRIMARY KEY |
| userId | varchar | 用户ID | NOT NULL, REFERENCES users(id) |
| goalId | integer | 目标ID | NOT NULL, REFERENCES goals(id) |
| title | text | 里程碑标题 | NOT NULL |
| description | text | 里程碑描述 | |
| completed | boolean | 是否完成 | DEFAULT false |
| order | integer | 排序顺序 | DEFAULT 0 |
| createdAt | timestamp | 创建时间 | DEFAULT NOW() |
| completedAt | timestamp | 完成时间 | |

### 9. microTasks (微任务表)
任务的细分子任务

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | serial | 自增ID | PRIMARY KEY |
| userId | varchar | 用户ID | NOT NULL, REFERENCES users(id) |
| taskId | integer | 父任务ID | NOT NULL, REFERENCES tasks(id) |
| title | text | 微任务标题 | NOT NULL |
| description | text | 微任务描述 | |
| completed | boolean | 是否完成 | DEFAULT false |
| duration | integer | 预计时长(分钟) | DEFAULT 5 |
| expReward | integer | 经验奖励 | DEFAULT 5 |
| difficulty | text | 难度等级 | DEFAULT 'easy' |
| order | integer | 排序顺序 | DEFAULT 0 |
| createdAt | timestamp | 创建时间 | DEFAULT NOW() |
| completedAt | timestamp | 完成时间 | |

### 10. goalTasks (目标任务表)
目标相关的具体任务

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | serial | 自增ID | PRIMARY KEY |
| goalId | integer | 目标ID | NOT NULL, REFERENCES goals(id) |
| title | text | 任务标题 | NOT NULL |
| completed | boolean | 是否完成 | DEFAULT false |
| expReward | integer | 经验奖励 | DEFAULT 0 |

### 11. activityLogs (活动日志表)
用户活动记录和经验获取历史

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | serial | 自增ID | PRIMARY KEY |
| userId | varchar | 用户ID | NOT NULL, REFERENCES users(id) |
| date | timestamp | 活动时间 | DEFAULT NOW() |
| taskId | integer | 任务ID | REFERENCES tasks(id) |
| skillId | integer | 技能ID | REFERENCES skills(id) |
| expGained | integer | 获得经验值 | DEFAULT 0 |
| action | text | 动作类型 | NOT NULL |
| description | text | 活动描述 | |

**动作类型 (action)**:
- `task_completed`: 任务完成
- `skill_levelup`: 技能升级
- `goal_completed`: 目标达成
- `habit_complete`: 习惯打卡
- `milestone_reached`: 里程碑达成

## 索引策略

### 现有索引
1. `IDX_session_expire` - sessions表的过期时间索引
2. 所有主键自动创建索引
3. 所有外键自动创建索引

### 建议添加的索引
```sql
-- 用户相关查询优化
CREATE INDEX idx_skills_user_id ON skills(userId);
CREATE INDEX idx_tasks_user_id ON tasks(userId);
CREATE INDEX idx_goals_user_id ON goals(userId);

-- 任务查询优化
CREATE INDEX idx_tasks_category ON tasks(taskCategory);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_goal_id ON tasks(goalId);

-- 活动日志查询优化
CREATE INDEX idx_activity_logs_user_date ON activityLogs(userId, date DESC);
```

## 数据库维护

### 备份策略
1. **自动备份**: 每日凌晨3点自动备份
2. **保留策略**: 保留最近7天的每日备份，最近4周的每周备份
3. **异地备份**: 备份文件同步到云存储

### 性能优化
1. **连接池**: 最小5个连接，最大20个连接
2. **查询优化**: 使用EXPLAIN分析慢查询
3. **定期维护**: 每周运行VACUUM和ANALYZE

### 数据清理
1. **会话清理**: 定期清理过期session
2. **日志归档**: 超过90天的活动日志归档
3. **软删除**: 考虑实现软删除机制

## 迁移指南

### 创建新迁移
```bash
# 修改schema.ts后生成迁移
npm run db:push

# 或使用drizzle-kit生成SQL
drizzle-kit generate:pg
```

### 回滚策略
1. 保留所有迁移脚本
2. 每次迁移前备份数据库
3. 准备回滚脚本

## 安全考虑

1. **加密**: 敏感数据使用加密存储
2. **访问控制**: 使用行级安全策略(RLS)
3. **审计**: 关键操作记录到activityLogs
4. **SQL注入**: 使用参数化查询防止注入

## 未来扩展

1. **社交功能**: 添加friends表和teams表
2. **成就系统**: 添加achievements表和userAchievements表
3. **商城系统**: 添加items表和inventory表
4. **通知系统**: 添加notifications表
5. **数据分析**: 添加analytics相关表