# 验证列名修复步骤

## 立即验证（部署后）

### 1. 检查实际列名
访问：
```
https://www.levelupsolo.net/api/debug/check-columns
```

这会显示 `tasks` 表的实际列名。查看是 camelCase 还是 snake_case。

### 2. 测试习惯完成
1. 在应用中尝试完成"八段锦"习惯
2. 查看浏览器控制台是否有错误
3. 检查 Railway 日志中的输出：
   - `[Simple Complete] Success with camelCase columns` - 表示使用 camelCase
   - `[Simple Complete] Success with snake_case columns` - 表示使用 snake_case

### 3. 使用调试页面
如果还有问题，访问：
```
https://www.levelupsolo.net/debug-habits.html
```

点击"直接完成习惯"并输入习惯 ID（如 140）。

## 修复原理

1. **问题**：PostgreSQL 对列名大小写敏感
   - `"lastCompletedAt"` ≠ `lastcompletedAt` ≠ `last_completed_at`

2. **解决方案**：尝试两种命名约定
   - 首先尝试 camelCase（带引号）
   - 失败则尝试 snake_case（不带引号）

3. **优势**：
   - 自动适应生产环境的实际列名
   - 无需手动修改数据库
   - 提供详细日志便于调试

## 预期结果

成功后：
- ✅ 习惯完成响应 < 2秒
- ✅ 不再出现 500 错误
- ✅ 正确更新完成时间和连击数
- ✅ Railway 日志显示成功信息

## 后续优化

根据检查结果，可以：
1. 统一使用发现的命名约定
2. 移除不必要的 try-catch
3. 优化查询性能

## 紧急回退

如果新代码导致问题：
1. 在 Railway 回退到上一个部署
2. 或者手动修改为只使用一种命名约定