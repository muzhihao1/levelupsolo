# Type Consistency Fix Guide
# 类型一致性修复指南

## 概述
本指南说明如何修复 Level Up Solo 项目中 Web 端和 iOS 端的类型不一致问题。

## 问题总结

### 主要不一致
1. **Tasks 表缺失字段**
   - `dueDate` (截止日期) - iOS端有，Web端无
   - `priority` (优先级) - iOS端有，Web端无

2. **枚举类型差异**
   - `TaskCategory` - iOS端有额外的 mainQuest 和 sideQuest

3. **Skill 模型差异**
   - iOS端缺少 skillType, category, talentPoints 等字段

## 修复步骤

### Step 1: 备份数据库
```bash
# 在执行任何修改前，先备份数据库
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: 执行数据库迁移
```bash
# 1. 连接到数据库
psql $DATABASE_URL

# 2. 执行迁移脚本
\i scripts/fix-type-inconsistency.sql

# 3. 验证迁移结果
SELECT * FROM check_type_consistency();
```

### Step 3: 更新 Drizzle Schema
在 `shared/schema.ts` 中添加缺失字段：

```typescript
export const tasks = pgTable("tasks", {
  // ... 现有字段
  
  // 新增字段
  dueDate: timestamp("due_date"),
  priority: integer("priority").notNull().default(1),
});
```

### Step 4: 更新类型定义
1. 导入统一类型：
```typescript
import { 
  TaskCategory, 
  TaskType, 
  Difficulty,
  isValidTaskCategory,
  isValidPriority 
} from '@shared/types/unified-models';
```

2. 在验证逻辑中使用：
```typescript
// 验证任务分类
if (!isValidTaskCategory(taskCategory)) {
  throw new Error('Invalid task category');
}

// 验证优先级
if (!isValidPriority(priority)) {
  throw new Error('Priority must be between 0 and 5');
}
```

### Step 5: 更新 API 端点
在 `server/routes.ts` 中更新任务创建/更新端点：

```typescript
app.post("/api/tasks", async (req, res) => {
  const { dueDate, priority = 1, ...otherFields } = req.body;
  
  // 验证新字段
  if (priority !== undefined && !isValidPriority(priority)) {
    return res.status(400).json({ 
      message: "Priority must be between 0 and 5" 
    });
  }
  
  // 创建任务时包含新字段
  const task = await storage.createTask({
    ...otherFields,
    dueDate: dueDate ? new Date(dueDate) : null,
    priority
  });
  
  res.json(task);
});
```

### Step 6: iOS 端更新
确保 iOS 端的 API 调用包含新字段：

```swift
// UserTask.swift 已包含这些字段
// 确保 API 请求正确序列化这些字段

struct CreateTaskRequest: Codable {
    // ... 其他字段
    let dueDate: Date?
    let priority: Int
}
```

### Step 7: 运行类型检查
```bash
# 运行 TypeScript 类型检查
npm run check

# 运行环境配置检查
npm run check:env
```

## 验证清单

- [ ] 数据库迁移成功执行
- [ ] 所有现有数据正确迁移
- [ ] TypeScript 编译无错误
- [ ] API 端点正确处理新字段
- [ ] iOS 端可以读写新字段
- [ ] 测试用例通过

## 回滚方案

如果需要回滚更改：

```sql
-- 执行回滚脚本（在 fix-type-inconsistency.sql 底部）
ALTER TABLE tasks DROP COLUMN IF EXISTS due_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS priority;
-- ... 其他回滚命令
```

## 注意事项

1. **生产环境部署**
   - 在低峰期执行迁移
   - 准备好回滚方案
   - 监控错误日志

2. **兼容性考虑**
   - 新字段设置合理默认值
   - 保持向后兼容性
   - 分阶段部署

3. **测试要求**
   - 测试所有 CRUD 操作
   - 验证数据同步
   - 检查边界情况

## 后续优化

1. **添加更多验证**
   - 在数据库层面添加更多约束
   - 在 API 层面加强验证

2. **性能优化**
   - 为新字段添加适当索引
   - 优化查询性能

3. **监控告警**
   - 监控类型不匹配错误
   - 设置数据一致性告警

## 问题排查

### 常见错误

1. **"column does not exist"**
   - 确保执行了数据库迁移
   - 检查 DATABASE_URL 是否正确

2. **类型验证失败**
   - 检查是否导入了正确的类型定义
   - 验证枚举值是否匹配

3. **iOS 端同步失败**
   - 确保 API 版本兼容
   - 检查序列化/反序列化逻辑

## 联系支持

如遇到问题，请：
1. 检查错误日志
2. 运行诊断脚本：`npm run check:env`
3. 查看 `TYPE_CONSISTENCY_ANALYSIS.md`