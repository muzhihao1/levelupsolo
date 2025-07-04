# 快速修复：集成快速任务创建模式

## 方案：在现有界面添加快速创建选项

### 1. 导入新组件

在 `client/src/components/unified-rpg-task-manager.tsx` 顶部添加：

```typescript
import { QuickTaskCreate } from "./quick-task-create";
import { CompactModeToggle } from "./task-creation-mode-toggle";
```

### 2. 添加状态控制

在组件中添加状态：

```typescript
const [useAIMode, setUseAIMode] = useState(() => {
  const saved = localStorage.getItem("taskCreationMode");
  return saved !== null ? saved === "ai" : true;
});
```

### 3. 修改任务创建区域

找到 AI 任务创建的输入框部分（大约在第 1200-1300 行），添加切换：

```typescript
{/* 任务创建区域 */}
<div className="space-y-4">
  {/* 模式切换 */}
  <div className="flex justify-end">
    <CompactModeToggle onModeChange={setUseAIMode} />
  </div>
  
  {/* 根据模式显示不同的创建组件 */}
  {useAIMode ? (
    // 原有的 AI 创建输入框
    <div className="existing-ai-input">
      {/* 保持原有代码不变 */}
    </div>
  ) : (
    // 快速创建组件
    <QuickTaskCreate />
  )}
</div>
```

### 4. 或者更简单的方案：始终显示快速创建

在 AI 输入框上方添加快速创建选项：

```typescript
{/* 快速创建选项（始终显示） */}
<QuickTaskCreate />

{/* 分隔线 */}
<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-border"></div>
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">或使用 AI 智能创建</span>
  </div>
</div>

{/* 原有的 AI 创建输入框 */}
<div className="existing-ai-input">
  {/* 保持原有代码 */}
</div>
```

## 预期效果

1. **快速模式**：任务创建 < 0.1 秒
2. **AI 模式**：保持原有功能，2-3 秒
3. **用户选择**：可根据需求选择模式
4. **记住偏好**：下次访问自动使用上次选择的模式

## 最小化修改

如果不想修改太多代码，可以只添加一个快捷键：

```typescript
// 在 handleCreateTask 函数附近添加
const handleQuickCreate = async (e: KeyboardEvent) => {
  // 按住 Ctrl/Cmd + Enter 快速创建
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    
    // 使用 CRUD 端点直接创建，跳过 AI
    const response = await apiRequest("POST", "/api/crud?resource=tasks", {
      title: newTask.title,
      description: newTask.description || "",
      taskCategory: "todo",
      taskType: "simple",
      estimatedDuration: 30,
      difficulty: "medium",
      expReward: 20,
      requiredEnergyBalls: 2,
      completed: false,
      userId: ""
    });
    
    // 清空表单并刷新
    setNewTask({ title: "", description: "", category: "todo", difficulty: "medium" });
    invalidateAllData();
    
    toast({
      title: "快速创建成功",
      description: "任务已创建（无 AI 分析）",
    });
  }
};

// 在输入框添加事件监听
<Input
  onKeyDown={handleQuickCreate}
  placeholder="输入任务描述... (Ctrl+Enter 快速创建)"
  // ... 其他属性
/>
```

这样用户可以：
- **普通回车**：使用 AI 智能创建（2-3秒）
- **Ctrl+回车**：快速创建，跳过 AI（立即）