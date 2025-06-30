# Database Schema Sync Analysis

## 概述
本文档分析数据库schema定义（shared/schema.ts）与实际存储实现（server/storage.ts）之间的同步情况。

## 检查结果

### ✅ 良好同步的部分

1. **基础表结构**
   - 所有在schema.ts中定义的表都在storage.ts中有对应的操作方法
   - 类型定义（InsertXXX, XXX）正确导入和使用

2. **核心CRUD操作**
   - Users: getUser, getUserByEmail, upsertUser ✅
   - Skills: getSkills, createSkill, updateSkill ✅
   - Tasks: getTasks, createTask, updateTask, deleteTask ✅
   - Goals: getGoals, createGoal, updateGoal, deleteGoal ✅
   - UserProfiles: getUserProfile, upsertUserProfile ✅
   - UserStats: getUserStats, createUserStats, updateUserStats ✅

3. **类型安全**
   - 所有方法都使用了正确的TypeScript类型
   - Drizzle ORM的类型推断正常工作

### ⚠️ 需要注意的问题

1. **缺失字段同步**
   ```typescript
   // schema.ts中tasks表有但storage实现可能未完全处理的字段：
   - dueDate: 未在iOS模型中定义，但Web端可能需要
   - priority: 未在schema中定义，但iOS已实现
   ```

2. **返回类型不一致**
   ```typescript
   // storage.ts第49行
   getGoals(userId: string): Promise<any[]>; // 使用了any类型
   // 应该是：
   getGoals(userId: string): Promise<Goal[]>;
   ```

3. **特殊方法实现**
   - `initializeCoreSkills`: 不在接口中定义，但在实现中存在
   - `findOrCreateSkill`: 在routes.ts中使用但未在接口中定义

### 🔧 建议的改进

#### 1. 添加缺失的schema字段

```sql
-- 添加tasks表缺失字段
ALTER TABLE tasks ADD COLUMN due_date TIMESTAMP;
ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 1;
```

对应的schema.ts更新：
```typescript
export const tasks = pgTable("tasks", {
  // ... 现有字段
  dueDate: timestamp("due_date"),
  priority: integer("priority").notNull().default(1),
});
```

#### 2. 修复storage接口定义

```typescript
// 在IStorage接口中添加：
interface IStorage {
  // ... 现有方法
  
  // 核心技能管理
  initializeCoreSkills(userId: string): Promise<void>;
  findOrCreateSkill(skillName: string, userId: string): Promise<Skill | undefined>;
  
  // 修复返回类型
  getGoals(userId: string): Promise<Goal[]>; // 不使用any
}
```

#### 3. 添加数据验证层

```typescript
// 在创建/更新数据前验证
function validateTaskData(task: InsertTask): void {
  if (task.requiredEnergyBalls < 1 || task.requiredEnergyBalls > 18) {
    throw new Error("Energy balls must be between 1 and 18");
  }
  
  if (task.expReward < 0) {
    throw new Error("Experience reward cannot be negative");
  }
}
```

### 📊 同步状态总结

| 组件 | 同步状态 | 问题数量 | 严重程度 |
|------|---------|----------|----------|
| Schema定义 | ⚠️ 部分同步 | 2 | 中等 |
| Storage接口 | ⚠️ 需要更新 | 3 | 中等 |
| 类型定义 | ✅ 良好 | 0 | - |
| CRUD操作 | ✅ 完整 | 0 | - |
| 特殊功能 | ⚠️ 未标准化 | 2 | 低 |

### 🚀 行动计划

1. **立即修复（高优先级）**
   - 在schema.ts中添加dueDate和priority字段
   - 运行`npm run db:push`更新数据库
   - 修复storage.ts中的any类型使用

2. **短期改进（中优先级）**
   - 标准化特殊方法（initializeCoreSkills等）
   - 添加数据验证层
   - 创建数据库迁移脚本

3. **长期优化（低优先级）**
   - 实现数据库事务支持
   - 添加查询优化（索引）
   - 实现软删除功能

### 🔍 验证脚本

创建以下脚本验证同步状态：

```typescript
// scripts/check-db-sync.ts
import { db } from '../server/db';
import * as schema from '../shared/schema';

async function checkSync() {
  // 检查所有表是否存在
  // 检查所有字段是否匹配
  // 检查约束是否正确
}
```

### 📝 维护建议

1. **每次schema修改后**：
   - 运行类型检查：`npm run check`
   - 更新数据库：`npm run db:push`
   - 更新文档：记录变更

2. **定期检查**：
   - 每周运行同步验证脚本
   - 检查iOS和Web端的类型一致性
   - 审查API响应格式

3. **版本控制**：
   - 使用数据库迁移跟踪schema变化
   - 在git commit中说明schema修改
   - 保持CHANGELOG更新