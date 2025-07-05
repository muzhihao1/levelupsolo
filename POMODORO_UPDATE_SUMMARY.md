# 番茄钟功能更新总结

## 实现的功能

### 1. 自动工作-休息循环
- 25分钟工作时间自动转入5分钟休息
- 休息结束后等待用户选择继续或结束
- 支持多轮循环，记录完成轮数

### 2. 实际能量球计算
- 根据实际战斗时间计算能量球消耗（每15分钟1个）
- 不再使用预估值，而是实际消耗
- 任务完成时更新实际能量球数据

### 3. 每日战报系统
- 记录每天的战斗总时长
- 统计能量球消耗、完成任务数、番茄钟轮数
- 在主页显示今日战报卡片
- 支持历史战报查询（周/月汇总）

## 技术实现

### 数据库更新
1. 新增表：
   - `daily_battle_reports` - 每日战报记录
   - `pomodoro_sessions` - 番茄钟会话记录

2. 更新任务表字段：
   - `actual_energy_balls` - 实际消耗能量球
   - `pomodoro_cycles` - 完成的番茄钟周期数
   - `battle_start_time` - 战斗开始时间
   - `battle_end_time` - 战斗结束时间

### API路由
- `POST /api/tasks/:id/start-pomodoro` - 开始番茄钟
- `POST /api/tasks/:id/complete-pomodoro` - 完成番茄钟
- `GET /api/battle-reports/daily` - 获取每日战报
- `GET /api/battle-reports/summary` - 获取战报汇总

### 前端组件
1. 更新 `pomodoro-timer.tsx`：
   - 新增状态管理：idle/working/resting/waiting
   - 自动状态转换逻辑
   - 改进的UI显示

2. 新增 `daily-battle-report.tsx`：
   - 显示今日战斗统计
   - 任务详情列表
   - 响应式设计

3. 更新 `dashboard.tsx`：
   - 集成每日战报卡片
   - 调整布局为3列网格

## 使用说明

1. 运行数据库迁移：
   ```bash
   npm run db:run-migrations
   ```

2. 开始使用：
   - 点击任务的"挑战Boss"按钮
   - 自动进入25分钟工作状态
   - 工作结束自动进入5分钟休息
   - 休息结束可选择继续或击败Boss
   - 主页查看今日战报

## 后续优化建议

1. 添加声音提醒选项开关
2. 支持自定义工作/休息时长
3. 添加周/月战报图表展示
4. 实现长休息机制（每4个番茄钟后）
5. 添加番茄钟历史记录页面