# Type Consistency Analysis - Level Up Solo

## 概述
本文档分析了Web端（TypeScript/Drizzle）和iOS端（Swift）之间的数据类型一致性，确保跨平台数据同步的准确性。

## 主要发现

### 1. Task/UserTask 模型差异

#### Web端 (schema.ts) vs iOS端 (UserTask.swift)

| 字段 | Web端类型 | iOS端类型 | 差异说明 |
|------|----------|-----------|----------|
| dueDate | ❌ 不存在 | ✅ Date? | iOS端添加了截止日期 |
| priority | ❌ 不存在 | ✅ Int (default: 1) | iOS端添加了优先级 |
| taskCategory | text (string) | TaskCategory (enum) | iOS使用强类型枚举 |
| difficulty | text | Difficulty (enum) | iOS使用强类型枚举 |
| lastCompletedDate | timestamp | Date? | 类型一致但命名不同 |

#### 枚举类型差异

**TaskCategory:**
- Web端：'habit', 'daily', 'todo'
- iOS端：habit, daily, todo, mainQuest, sideQuest（扩展了类型）

**Difficulty:**
- Web端：'trivial', 'easy', 'medium', 'hard'
- iOS端：相同，但添加了expMultiplier和color属性

### 2. Skill 模型差异

| 字段 | Web端类型 | iOS端类型 | 差异说明 |
|------|----------|-----------|----------|
| skillType | text | ❌ 不存在 | iOS端未实现技能类型 |
| category | text | ❌ 不存在 | iOS端未实现技能分类 |
| talentPoints | integer | ❌ 不存在 | iOS端未实现天赋点 |
| prestige | integer | ❌ 不存在 | iOS端未实现声望等级 |
| prerequisites | integer[] | ❌ 不存在 | iOS端未实现前置技能 |

### 3. 数据类型映射问题

1. **日期处理**：
   - Web端：timestamp (PostgreSQL)
   - iOS端：Date (Swift)
   - 需要确保时区一致性

2. **数组类型**：
   - Web端：text("field").array()
   - iOS端：[String]
   - 序列化/反序列化需要特别处理

3. **可选值**：
   - Web端：字段默认可为null
   - iOS端：使用Optional (?)
   - 需要正确处理null值

## 建议改进

### 1. 立即修复（高优先级）

```typescript
// 在schema.ts中添加缺失字段
export const tasks = pgTable("tasks", {
  // ... 现有字段
  dueDate: timestamp("due_date"), // 添加截止日期
  priority: integer("priority").notNull().default(1), // 添加优先级
});
```

### 2. 统一枚举定义

创建共享的类型定义文件：

```typescript
// shared/types.ts
export const TaskCategory = {
  HABIT: 'habit',
  DAILY: 'daily',
  TODO: 'todo',
  MAIN_QUEST: 'mainQuest',
  SIDE_QUEST: 'sideQuest'
} as const;

export const Difficulty = {
  TRIVIAL: 'trivial',
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
} as const;
```

### 3. API响应标准化

确保API响应格式一致：

```typescript
// API响应接口
interface TaskResponse {
  id: number;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string; // ISO 8601格式
  priority: number;
  // ... 其他字段
}
```

### 4. iOS端模型补充

需要在iOS端添加缺失的Skill模型字段：

```swift
struct Skill: Codable {
    // ... 现有字段
    let skillType: String?
    let category: String?
    let talentPoints: Int
    let prestige: Int
    let prerequisites: [Int]?
}
```

## 技术债务清单

1. **数据库迁移**：
   - 添加tasks表的dueDate和priority字段
   - 确保所有枚举值在数据库中有约束

2. **API版本控制**：
   - 实现API版本管理
   - 为不同客户端版本提供兼容性

3. **类型验证**：
   - 在API层添加严格的类型验证
   - 使用Zod schemas验证请求和响应

4. **文档更新**：
   - 创建API字段映射文档
   - 维护数据字典

## 下一步行动

1. **Phase 1**：修复关键字段缺失（dueDate, priority）
2. **Phase 2**：统一枚举类型定义
3. **Phase 3**：完善iOS端Skill模型
4. **Phase 4**：建立自动化类型检查机制

## 监控建议

- 设置类型不匹配的日志警告
- 定期运行类型一致性检查脚本
- 在CI/CD中添加类型兼容性测试