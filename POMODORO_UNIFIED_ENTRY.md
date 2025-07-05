# 番茄钟统一入口改造

## 概述
将原本分散在各个任务卡片上的"挑战Boss"按钮统一到仪表板页面，提供一个集中的番茄钟入口，并支持习惯类任务使用番茄钟功能。

## 主要改动

### 1. 仪表板页面更新 (`client/src/pages/dashboard.tsx`)
- 添加了统一的"挑战Boss"按钮，位于今日战报下方
- 按钮样式：橙色到红色的渐变背景，带有Swords图标
- 点击按钮打开任务选择器

### 2. 创建任务选择器组件 (`client/src/components/task-selector.tsx`)
- 新增的模态框组件，用于选择要进行番茄钟的任务
- 支持显示所有类型的任务：
  - 主线任务（Goals）
  - 支线任务（Tasks）
  - 习惯（Habits）
- 功能特性：
  - 搜索功能
  - 按类型筛选
  - 显示任务的能量球消耗
  - 点击任务后跳转到番茄钟页面

### 3. API 路由更新 (`server/routes.ts`)
新增了三个API接口：

#### `/api/pomodoro/available-tasks`
- 获取所有可用于番茄钟的任务
- 返回格式化的goals、tasks和habits列表

#### `/api/habits/:id/start-pomodoro`
- 为习惯类任务启动番茄钟
- 创建番茄钟会话记录
- 更新任务的战斗开始时间

#### `/api/habits/:id/complete-pomodoro`
- 完成习惯类任务的番茄钟
- 更新番茄钟会话数据
- 更新任务的番茄钟周期数和实际能量球
- 更新每日战报

### 4. 创建番茄钟页面 (`client/src/pages/pomodoro.tsx`)
- 新的独立页面，通过URL参数接收任务类型和ID
- 支持加载goals、tasks和habits
- 使用现有的PomodoroTimer组件
- 完成后返回仪表板

### 5. 路由配置更新 (`client/src/App.tsx`)
- 添加了 `/pomodoro` 路由
- 支持懒加载

### 6. 移除分散的番茄钟入口
- 从 `unified-rpg-task-manager.tsx` 中移除了"挑战Boss"按钮
- 保留了其他组件中的Timer图标按钮（非主要入口）

## 技术实现细节

### 习惯任务支持
- 习惯任务存储在tasks表中，通过`taskCategory='habit'`区分
- 番茄钟相关字段已添加到tasks表：
  - `actual_energy_balls` - 实际消耗的能量球
  - `pomodoro_cycles` - 番茄钟周期数
  - `battle_start_time` - 战斗开始时间
  - `battle_end_time` - 战斗结束时间

### URL 参数设计
番茄钟页面使用查询参数：
- `type`: 任务类型 (goal/task/habit)
- `id`: 任务ID

示例：`/pomodoro?type=habit&id=123`

## 用户体验改进

1. **统一入口**：用户不再需要在各个任务卡片上寻找番茄钟按钮
2. **全局视图**：可以看到所有可用的任务，方便选择
3. **习惯支持**：习惯任务现在也可以使用番茄钟功能
4. **搜索筛选**：快速找到想要专注的任务

## 后续优化建议

1. 添加最近使用的任务列表
2. 支持任务优先级排序
3. 显示任务的预计完成时间
4. 添加快捷键支持（如 Cmd+P 打开任务选择器）
5. 在任务选择器中显示任务的详细信息（悬浮提示）