# Railway 部署文档

## 核心文档

1. **[Railway 部署指南](./RAILWAY_DEPLOYMENT_GUIDE.md)** - 完整的部署步骤
2. **[Railway 部署检查清单](./RAILWAY_DEPLOYMENT_CHECKLIST.md)** - 部署前检查项
3. **[Railway 环境配置](./RAILWAY_ENV_CONFIG.md)** - 环境变量说明

## 问题解决

- **[登录问题修复](./DEPLOYMENT_LOGIN_FIX.md)** - 认证相关问题
- **[故障排除指南](../RAILWAY_DEPLOYMENT_TROUBLESHOOTING.md)** - 常见问题解决

## 快速开始

```bash
# 1. Fork/Clone 项目
git clone https://github.com/muzhihao1/levelupsolo.git

# 2. 在 Railway 创建项目
# 3. 配置环境变量
# 4. 等待自动部署
```

## 环境变量

- `DATABASE_URL` - Supabase PostgreSQL 连接
- `JWT_SECRET` - JWT 签名密钥
- `JWT_REFRESH_SECRET` - 刷新 token 密钥
- `OPENAI_API_KEY` - OpenAI API 密钥