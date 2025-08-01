# 测试新的番茄钟功能

## 1. 运行数据库迁移
```bash
npm run db:run-migrations
```

## 2. 启动开发服务器
```bash
npm run dev
```

## 3. 测试步骤

### 测试番茄钟自动循环
1. 打开任务列表
2. 点击任意任务的"挑战Boss"按钮
3. 应该看到新的界面：
   - 显示"战斗中..."状态
   - 25分钟倒计时
   - 进度条显示
4. 等待25分钟结束（或修改代码为更短时间测试）
5. 应该自动进入"休息中..."状态
   - 5分钟倒计时
   - 蓝色进度条
6. 休息结束后显示"准备下一轮"
   - 显示已完成轮数
   - 可选择继续战斗或击败Boss

### 测试能量球计算
1. 完成不同时长的番茄钟
2. 点击"击败Boss"
3. 应该看到：
   - 实际消耗的能量球数（每15分钟1个）
   - 经验值奖励

### 测试每日战报
1. 完成几个番茄钟任务
2. 返回主页（Dashboard）
3. 应该看到"今日战报"卡片显示：
   - 总战斗时长
   - 能量球消耗
   - 完成任务数
   - 番茄钟周期数
   - 具体任务列表

## 4. 注意事项
- 确保浏览器允许通知权限（用于番茄钟完成提醒）
- 数据库迁移只需运行一次
- 如遇到问题，检查浏览器控制台错误信息