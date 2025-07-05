# 🚨 URGENT: Railway 环境变量错误

## 问题发现

从 Railway 日志可以看出，DATABASE_URL 设置错误：

### 当前错误设置（从日志）：
```
Host: aws-0-ap-southeast-1.pooler.supabase.com
Port: 6543
```

### 正确设置（已测试验证）：
```
Host: aws-0-ap-northeast-1.pooler.supabase.com
Port: 5432
```

## 立即修复步骤

### 1. 登录 Railway Dashboard
前往：https://railway.app

### 2. 找到项目环境变量
- 点击你的项目
- 进入 Variables 或 Environment 设置

### 3. 更新 DATABASE_URL
将现有的 DATABASE_URL 替换为：
```
postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**关键修改**：
- `ap-southeast-1` → `ap-northeast-1`
- `6543` → `5432`

### 4. 保存并重新部署
- 保存环境变量
- Railway 会自动触发重新部署

## 预期结果

更新后，健康检查应该显示：
```json
{
  "database": {
    "status": "connected",
    "hasUrl": true
  }
}
```

而不是当前的 "Tenant or user not found" 错误。

## 验证命令

部署完成后运行：
```bash
curl https://levelupsolo-production.up.railway.app/api/health
```

应该看到数据库状态为 "connected"。