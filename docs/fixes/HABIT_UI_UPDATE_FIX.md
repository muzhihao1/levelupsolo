# 习惯完成后UI不更新问题修复

> 最后更新：2025-07-03
> 版本：1.0

## 问题描述

用户点击习惯完成按钮后：
- 后端API调用成功（能量球减少，说明数据已更新）
- 但UI上习惯仍显示未完成状态
- 需要刷新页面才能看到更新

## 根本原因

1. **React Query缓存问题**
   - `staleTime: 1000` 导致数据在1秒内被认为是新鲜的
   - 即使调用refetch，也可能返回缓存数据

2. **习惯重置逻辑错误**
   - 使用了不存在的字段名 `lastCompletedDate`
   - 正确的字段名是 `completedAt`

3. **缺少乐观更新**
   - UI需要等待服务器响应才更新
   - 造成用户体验延迟

## 解决方案

### 1. 实现乐观更新
```typescript
// 立即更新缓存中的任务状态
queryClient.setQueryData(["/api/data?type=tasks"], (oldData: Task[] | undefined) => {
  if (!oldData) return oldData;
  return oldData.map(t => 
    t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
  );
});
```

### 2. 修复习惯重置逻辑
```typescript
// 使用正确的字段名
const completedDate = habit.completedAt ? new Date(habit.completedAt).toDateString() : null;
```

### 3. 调整缓存策略
```typescript
staleTime: 0, // 总是认为数据是过期的
gcTime: 5 * 60 * 1000, // 缓存保留5分钟
```

### 4. 强制数据刷新
```typescript
// 同时使用invalidate和refetch确保数据更新
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ["/api/data?type=tasks"] }),
  queryClient.refetchQueries({ queryKey: ["/api/data?type=tasks"], exact: true })
]);
```

## 技术细节

- **文件**：`client/src/components/unified-rpg-task-manager.tsx`
- **影响范围**：习惯完成功能
- **测试方法**：点击习惯完成按钮，查看UI是否立即更新

## 相关问题

- [HABIT_COMPLETION_SOLUTION.md](./HABIT_COMPLETION_SOLUTION.md) - 习惯完成API修复
- [ENERGY_RESTORE_FEATURE.md](./ENERGY_RESTORE_FEATURE.md) - 能量球恢复功能