# Railway 快速修复检查清单

## 🚨 紧急诊断（2 分钟内）

### 1. 快速状态检查
```bash
# 健康检查
curl https://levelupsolo-production.up.railway.app/api/health | jq '.database.status'

# 前端检查  
curl -I https://levelupsolo-production.up.railway.app | head -1
```

### 2. 问题分类
| 症状 | 可能原因 | 快速修复 |
|------|----------|----------|
| `"status": "demo-only"` | 错误的服务器文件 | 检查 package.json start 脚本 |
| `"database": "disabled"` | 无数据库版本运行 | 删除 railway-server-simple.js |
| `HTTP/1.1 404` | 前端文件缺失 | 检查 server/public/ 目录 |
| `"Tenant or user not found"` | 数据库连接字符串错误 | 验证 DATABASE_URL |

## ⚡ 一键修复命令

### 数据库连接问题
```bash
# 验证连接字符串格式
node validate-database-url.js

# 正确的 DATABASE_URL 格式
postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

### 前端 404 问题
```bash
# 本地构建测试
npm run build:railway && ls -la server/public/index.html

# 强制 Railway 重建
git commit --allow-empty -m "Force rebuild" && git push
```

### 服务器文件问题
```bash
# 检查启动脚本
grep "start.*node" package.json
# 应该是: "start": "NODE_ENV=production node server/railway-server.js"

# 删除简化服务器（如果存在）
rm -f server/railway-server-simple.js
```

## 🔧 常见错误速查

### DATABASE_URL 格式错误
| 错误 | 正确 |
|------|------|
| `ap-southeast-1` | `ap-northeast-1` |
| `ap-northeast1` | `ap-northeast-1` |
| `:6543` | `:5432` |
| `postgres:password` | `postgres.ooepnnsbmtyrcqlqykkr:password` |

### 文件路径问题
| 问题 | 解决 |
|------|------|
| 构建到 `dist/` | 修改构建脚本复制到 `server/public/` |
| 启动 `dist/railway-server.js` | 改为 `server/railway-server.js` |
| 缺少 `index.html` | 运行 `node server/build-frontend-simple.js` |

## 📋 部署前检查清单

- [ ] `package.json` start 脚本指向 `server/railway-server.js`
- [ ] 不存在 `server/railway-server-simple.js`
- [ ] `DATABASE_URL` 格式验证通过
- [ ] 本地 `npm run build:railway` 成功
- [ ] `server/public/index.html` 存在
- [ ] Railway 环境变量已设置

## 🎯 5 分钟完整修复流程

```bash
# 1. 验证本地构建
npm run build:railway
ls -la server/public/index.html

# 2. 验证数据库连接
node validate-database-url.js

# 3. 检查启动脚本
grep "start.*node" package.json

# 4. 清理简化文件
rm -f server/railway-server-simple.js

# 5. 推送修复
git add -A
git commit -m "Fix Railway deployment issues"
git push

# 6. 等待部署（2-3分钟）后验证
curl https://levelupsolo-production.up.railway.app/api/health
```

## 🚑 紧急联系信息

- **文档位置**: `docs/RAILWAY_DEPLOYMENT_TROUBLESHOOTING.md`
- **诊断工具**: `validate-database-url.js`, `test-connection-simple.js`
- **构建脚本**: `server/build-frontend-simple.js`
- **Railway 项目**: levelupsolo-production.up.railway.app

---
**保存此页面到书签以便紧急使用** 🔖