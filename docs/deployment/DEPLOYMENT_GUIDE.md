# Level Up Solo 部署指南

## 🚀 快速开始

您的开发环境已经完全配置好了！以下是启动应用的步骤：

### 1. 本地开发

```bash
# 重启开发服务器以应用新配置
npm run dev
```

应用将在 http://localhost:3000 启动

### 2. 已配置的功能

✅ **数据库连接** - Supabase PostgreSQL数据库已连接
✅ **AI功能** - OpenAI API已启用，支持智能任务分析
✅ **认证系统** - JWT和会话密钥已配置
✅ **安全保护** - 所有敏感信息已安全存储

### 3. 测试功能

启动后，您可以测试以下功能：

1. **用户注册/登录**
2. **创建任务** - 现在支持AI智能分析
3. **技能系统** - 六大核心技能追踪
4. **专注模式** - 番茄钟和能量球系统

## 🌐 生产环境部署（Vercel）

### 环境变量配置

在Vercel项目设置中添加以下环境变量：

#### 必需的环境变量

1. **DATABASE_URL**
   ```
   postgresql://postgres:zbrGHpuON0CNfZBt@db.ooepnnsbmtyrcqlqykkr.supabase.co:5432/postgres
   ```

2. **SUPABASE_DATABASE_URL**（与DATABASE_URL相同）
   ```
   postgresql://postgres:zbrGHpuON0CNfZBt@db.ooepnnsbmtyrcqlqykkr.supabase.co:5432/postgres
   ```

3. **OPENAI_API_KEY**
   ```
   您的OpenAI API Key（从.env文件中获取）
   ```

4. **SESSION_SECRET**
   ```
   xK8mP9nQ3vB5wY2tL6hF4jR7sE1cA0dG
   ```

5. **JWT_SECRET**
   ```
   qW3eR5tY7uI9oP0aS2dF4gH6jK8lZ1xC
   ```

⚠️ **重要**：请确保添加 SUPABASE_DATABASE_URL 环境变量，它应该与 DATABASE_URL 的值相同。

### 配置步骤

1. **登录Vercel控制台**
   - 访问 https://vercel.com/dashboard
   - 选择您的项目 levelupsolo

2. **设置环境变量**
   - 进入项目设置 (Settings)
   - 选择 Environment Variables
   - 添加上述所有变量
   - 确保选择所有环境（Production, Preview, Development）

3. **重新部署**
   - 配置环境变量后，点击 "Redeploy"
   - 或推送代码触发自动部署

## 📱 iOS开发准备

基于您的iOS开发计划，当前的Web版本可以作为：

1. **API后端** - 所有API已经就绪，可供iOS应用调用
2. **功能参考** - Web版本的所有功能可以在iOS中复现
3. **设计规范** - UI/UX可以作为iOS版本的参考

### API端点示例

```
基础URL: https://www.levelupsolo.net/api

认证相关：
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/user

任务管理：
GET  /api/tasks
POST /api/tasks
POST /api/tasks/analyze-task
POST /api/tasks/intelligent-create

技能系统：
GET  /api/skills
POST /api/skills/initialize-core

用户统计：
GET  /api/user-stats
```

## 🔧 故障排除

### 常见问题

**Q: 看到 "FUNCTION_INVOCATION_FAILED" 错误？**

A: 这通常是因为：
- 环境变量未在Vercel中配置
- API Key无效或格式错误
- 检查Vercel函数日志获取详细错误

**Q: 数据库连接失败？**

A: 确保：
- DATABASE_URL格式正确
- 数据库密码正确
- Supabase项目处于活跃状态

**Q: AI功能不工作？**

A: 验证：
- OpenAI API Key有效
- API Key有足够的额度
- 检查服务器日志中的错误信息

## 🔒 安全最佳实践

1. **环境变量管理**
   - 永远不要在代码中硬编码密钥
   - 使用`.env`文件进行本地开发
   - 生产环境使用Vercel环境变量

2. **定期维护**
   - 定期更新API密钥
   - 监控API使用情况
   - 检查数据库连接日志

3. **备份策略**
   - 定期备份数据库
   - 保存环境变量的安全副本
   - 使用版本控制管理代码

## 📞 需要帮助？

如果遇到问题：

1. **检查日志**
   - 本地：查看终端输出
   - 生产：查看Vercel函数日志

2. **验证配置**
   - 确保所有环境变量已设置
   - 测试API端点：`/api/health`

3. **调试步骤**
   - 清除浏览器缓存
   - 检查网络请求
   - 查看浏览器控制台错误

祝您开发顺利！🎉