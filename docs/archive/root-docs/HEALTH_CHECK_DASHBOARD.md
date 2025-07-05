# Project Health Check Dashboard

## 概述
Project Health Check Dashboard 是一个独立的监控工具，用于实时监控 Level Up Solo 项目的健康状态。它提供了一个可视化的 Web 界面和命令行界面，可以快速识别项目中的问题。

## 功能特点

### 🔍 10 项全面检查
1. **Environment Variables** - 检查必需的环境变量
2. **Database Connection** - 验证数据库连接状态
3. **Dependencies** - 检查过时的依赖包
4. **TypeScript** - 检测 TypeScript 编译错误
5. **Tests** - 运行测试套件并报告结果
6. **Build Status** - 检查生产构建状态
7. **Security** - 运行安全审计
8. **Git Status** - 检查未提交的更改
9. **Disk Space** - 监控磁盘空间使用
10. **API Server** - 验证 API 服务器响应

### 📊 两种使用模式

#### 1. Web Dashboard 模式
- 实时可视化界面
- WebSocket 实时更新
- 自动每 30 秒刷新
- 手动刷新按钮
- 响应式设计

#### 2. CLI 模式
- 命令行输出
- 支持 watch 模式
- 详细信息选项
- CI/CD 集成友好

## 使用方法

### 安装依赖
```bash
# 确保所有依赖已安装
npm install
```

### Web Dashboard 模式
```bash
# 启动 Dashboard 服务器（默认端口 3001）
npm run health:dashboard

# 使用自定义端口
HEALTH_PORT=3000 npm run health:dashboard
```

然后在浏览器中访问：`http://localhost:3001`

### CLI 模式
```bash
# 运行一次性健康检查
npm run health:check

# Watch 模式（每 30 秒自动刷新）
npm run health:watch

# 显示详细信息
npm run health:check -- --verbose
```

### 直接运行
```bash
# Dashboard 模式
tsx tools/health-check-dashboard.ts --dashboard

# CLI 模式
tsx tools/health-check-dashboard.ts

# CLI Watch 模式
tsx tools/health-check-dashboard.ts --watch
```

## Dashboard 界面说明

### 顶部状态栏
- **Overall Status**: 整体健康状态（Healthy/Warning/Error）
- **Last Updated**: 最后更新时间
- **Refresh Button**: 手动触发刷新

### 摘要卡片
- **Healthy**: 通过的检查数量
- **Warnings**: 警告的检查数量
- **Errors**: 错误的检查数量
- **Total**: 总检查数量

### 检查卡片
每个检查项显示：
- 检查名称和状态
- 所属类别
- 状态消息
- 详细信息（如适用）

### 连接状态
右下角显示 WebSocket 连接状态

## 健康状态说明

### 🟢 Healthy（健康）
- 所有检查都通过
- 系统运行正常
- 无需立即采取行动

### 🟡 Warning（警告）
- 存在潜在问题
- 系统仍可正常运行
- 建议尽快处理

### 🔴 Error（错误）
- 存在严重问题
- 可能影响系统功能
- 需要立即处理

## 集成到 CI/CD

### GitHub Actions 示例
```yaml
- name: Run Health Check
  run: npm run health:check
  continue-on-error: true
  
- name: Upload Health Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: health-report
    path: health-report.json
```

### 生成 JSON 报告
```bash
# 将结果输出为 JSON（未来功能）
npm run health:check -- --json > health-report.json
```

## 配置选项

### 环境变量
- `HEALTH_PORT`: Dashboard 服务器端口（默认 3001）
- `NODE_ENV`: 环境模式，影响 API 检查的 URL

### 自定义检查
可以在 `health-check-dashboard.ts` 中添加自定义检查：

```typescript
private async checkCustom() {
  try {
    // 自定义检查逻辑
    this.addCheck({
      name: 'Custom Check',
      category: 'Custom',
      status: 'healthy',
      message: 'Custom check passed'
    });
  } catch (error) {
    this.addCheck({
      name: 'Custom Check',
      category: 'Custom',
      status: 'error',
      message: 'Custom check failed',
      details: { error: error.message }
    });
  }
}
```

## 故障排除

### Dashboard 无法启动
1. 检查端口是否被占用
2. 确保所有依赖已安装
3. 检查 Node.js 版本 >= 18

### 某些检查失败
1. **Environment Variables**: 检查 `.env` 文件
2. **Database Connection**: 验证 `DATABASE_URL`
3. **Dependencies**: 运行 `npm update`
4. **TypeScript**: 运行 `npm run check`
5. **Tests**: 运行 `npm test`
6. **Security**: 运行 `npm audit fix`

### WebSocket 连接问题
1. 检查防火墙设置
2. 确保使用正确的协议（ws/wss）
3. 检查代理配置

## 最佳实践

### 1. 定期监控
- 开发时保持 Dashboard 开启
- 部署前运行健康检查
- 在 CI/CD 中集成检查

### 2. 处理警告
- 不要忽视警告状态
- 定期更新依赖
- 保持代码库整洁

### 3. 自动化响应
- 设置告警阈值
- 自动触发修复脚本
- 集成到监控系统

## 未来改进计划

### v2.0 功能
- [ ] 历史数据记录
- [ ] 趋势图表
- [ ] 自定义告警规则
- [ ] Email/Slack 通知
- [ ] JSON/CSV 导出
- [ ] 性能基准测试
- [ ] 依赖关系图
- [ ] 自动修复建议

### v3.0 功能
- [ ] 分布式健康检查
- [ ] 多项目支持
- [ ] API 性能监控
- [ ] 用户行为分析
- [ ] 成本分析
- [ ] 安全扫描集成

## 相关工具

- **环境检查**: `npm run check:env`
- **数据验证**: `npm run validate:data`
- **类型检查**: `npm run check`
- **安全审计**: `npm audit`

## 技术栈

- **Backend**: Node.js + TypeScript
- **Frontend**: Vanilla JS + WebSocket
- **Styling**: CSS Grid + Flexbox
- **Real-time**: WebSocket
- **Charts**: 未来将集成 Chart.js

---

💡 **提示**: 这个工具设计为独立运行，不会干扰正在进行的开发工作。它是项目健康监控的第一道防线。