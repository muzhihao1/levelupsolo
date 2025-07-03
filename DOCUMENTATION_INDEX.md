# 📚 Level Up Solo 文档索引

> 文档已重新整理，便于查找和维护

## 🎯 核心文档（根目录）

| 文档 | 说明 |
|------|------|
| [README.md](./README.md) | 项目介绍和基本信息 |
| [CLAUDE.md](./CLAUDE.md) | AI 开发助手使用指南 |
| [QUICK_START.md](./QUICK_START.md) | 快速开始指南 |
| [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) | 安全实践指南 |
| [TEST_PLAN.md](./TEST_PLAN.md) | 测试计划和策略 |

## 📁 分类文档

### 🚀 部署文档 (`docs/deployment/`)
- **Railway 部署系列** - Railway 平台部署相关
- **Vercel 部署系列** - Vercel 平台部署相关
- **环境配置** - 各种环境变量设置

### 🗄️ 数据库文档 (`docs/database/`)
- **数据库架构** - 表结构和关系
- **SQL 脚本** - 各种修复和迁移脚本
- **Supabase 配置** - Supabase 相关设置

### 🔧 问题修复 (`docs/fixes/`)
- **习惯完成修复** - 解决习惯功能的各种问题
- **认证修复** - 登录和认证相关修复
- **其他修复** - 活动日志等其他功能修复

### 🏗️ 架构设计 (`docs/architecture/`)
- **系统架构** - 整体架构设计
- **API 文档** - 接口说明和规范
- **技术债务** - 需要重构的部分
- **性能优化** - 优化建议和实践

### 📱 开发计划 (`docs/development/`)
- **iOS 开发** - iOS 应用开发计划
- **Web 开发** - Web 应用优化计划
- **项目进度** - 当前状态和下一步

### 🗂️ 归档文档 (`docs/archive/`)
- 包含旧版本文档和已过期的内容

## 🔍 快速查找

### 遇到习惯完成问题？
→ 查看 `docs/fixes/HABIT_COMPLETION_SOLUTION.md`

### 需要部署到 Railway？
→ 查看 `docs/deployment/RAILWAY_DEPLOYMENT_GUIDE.md`

### 想了解数据库结构？
→ 查看 `docs/database/DATABASE_SCHEMA.md`

### 开始 iOS 开发？
→ 查看 `docs/development/iOS_APP_DEVELOPMENT_PLAN.md`

## 📝 文档维护建议

1. **新文档** - 请放到对应的子目录中
2. **更新文档** - 更新日期和版本号
3. **废弃文档** - 移动到 `archive` 目录
4. **命名规范** - 使用大写字母和下划线

## 🎨 文档模板

创建新文档时，请使用以下模板：

```markdown
# 文档标题

> 最后更新：2025-07-03
> 版本：1.0

## 概述
简要说明文档目的

## 详细内容
...

## 相关文档
- [相关文档1](link)
- [相关文档2](link)
```

---

💡 **提示**：使用 `docs/README.md` 作为文档导航的起点。