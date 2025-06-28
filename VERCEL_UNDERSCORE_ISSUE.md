# Vercel 下划线目录问题

## 🚨 重要发现

**Vercel 不会部署以下划线 `_` 开头的目录！**

这是导致所有 API 500 错误的根本原因。

## 问题描述

我们的 API 函数都依赖于 `api/_lib` 目录中的处理器，但是：
- Vercel 默认忽略所有以 `_` 开头的目录
- 这导致 `_lib` 目录没有被部署
- API 函数在运行时无法找到这些模块，返回 500 错误

## 错误信息

```
Cannot find module '/var/task/api/_lib/auth-handlers' imported from /var/task/api/auth/simple-login.js
```

## 解决方案

将 `_lib` 重命名为 `lib`：

```bash
# 重命名目录
mv api/_lib api/lib

# 更新所有导入路径
find api -name "*.ts" -type f -exec sed -i '' 's/_lib/lib/g' {} \;
```

## 教训

1. **避免使用下划线开头的目录名** - 特别是在 Vercel 项目中
2. **使用诊断端点** - 它们帮助我们快速定位问题
3. **查看完整的错误信息** - 错误信息明确指出了模块找不到

## Vercel 的特殊目录

Vercel 会忽略以下目录/文件：
- `_*` - 所有以下划线开头的
- `.*` - 所有以点开头的（除了 `.vercel`）
- `node_modules`
- 在 `.vercelignore` 中列出的

## 验证修复

部署后访问：
1. `/api/auth/test-simple` - 应该返回成功
2. `/api/db-test` - 应该能导入 db 模块
3. `/api/auth/test-login` - 应该能导入 auth-handlers

然后测试实际登录功能。