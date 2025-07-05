# 番茄钟 500 错误修复指南

## 问题描述
用户反馈在点击"挑战Boss"按钮后，出现 500 错误，无法获取可用任务列表。

## 已实施的修复

### 1. 增强了 API 错误日志记录
在 `/server/routes.ts` 的 `available-tasks` 端点添加了详细的日志：
- 记录请求用户信息
- 记录存储类型（DatabaseStorage 或 MockStorage）
- 记录获取的数据数量
- 为每个数据获取操作添加 try-catch

### 2. 改进了数据验证
- 添加 `Array.isArray()` 检查，防止 filter 操作失败
- 为所有数据操作添加空值检查
- 提供默认值防止前端错误

### 3. 添加了认证调试组件
创建了 `AuthDebug` 组件，可以在仪表板页面显示：
- localStorage 中的 token 状态
- 认证 API 的响应
- available-tasks API 的响应

### 4. 创建了测试脚本
创建了 `test-pomodoro-auth.ts` 脚本，可以：
- 测试登录流程
- 测试 available-tasks 端点
- 验证认证是否正常工作

## 如何调试

### 方法 1：使用认证调试组件（推荐）

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问仪表板页面，在"挑战Boss"按钮下方会看到"显示认证调试信息"按钮（仅在开发环境显示）

3. 点击该按钮，然后点击"检查认证状态"

4. 查看返回的 JSON 信息，特别关注：
   - `localStorage` - 是否有 accessToken
   - `authUser` - 用户信息是否正确
   - `availableTasks` - 是否成功获取任务

### 方法 2：使用测试脚本

1. 先注册测试用户（如果还没有）：
   ```bash
   npm run test:register-user
   ```

2. 运行认证测试：
   ```bash
   npm run test:pomodoro-auth
   ```

3. 查看输出的详细信息

### 方法 3：查看服务器日志

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 在浏览器中点击"挑战Boss"按钮

3. 查看终端中的服务器日志，应该能看到：
   - "Pomodoro available tasks endpoint hit"
   - 用户 ID
   - 获取的任务数量
   - 任何错误信息

## 常见问题和解决方案

### 1. 401 Unauthorized 错误
**原因**：用户未登录或 token 过期
**解决**：
- 清除 localStorage：`localStorage.clear()`
- 重新登录

### 2. 500 错误但没有详细信息
**原因**：可能是数据库连接问题
**解决**：
- 检查 DATABASE_URL 环境变量
- 运行 `npm run db:test-activity-logs` 测试数据库连接

### 3. 获取到空的任务列表
**原因**：用户没有创建任何任务
**解决**：
- 创建一些测试任务
- 或运行 `npm run seed:test` 添加测试数据

### 4. MockStorage vs DatabaseStorage
- 如果在开发环境且没有设置 DATABASE_URL，会使用 MockStorage
- MockStorage 已经添加了示例数据
- 如果使用数据库，确保数据库中有任务数据

## 下一步行动

1. **首先**：使用认证调试组件查看具体错误信息
2. **其次**：根据错误信息采取相应的修复措施
3. **最后**：如果问题持续，查看服务器日志获取更多信息

## 相关文件
- `/client/src/components/auth-debug.tsx` - 认证调试组件
- `/server/routes.ts` - API 端点实现
- `/scripts/test-pomodoro-auth.ts` - 测试脚本
- `/client/src/components/task-selector.tsx` - 任务选择器组件