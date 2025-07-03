# 🔤 TYPO FIX: 域名缺少连字符

## 发现的错误

从 Railway 日志可以看出域名有打字错误：

### ❌ 错误（当前设置）：
```
aws-0-ap-northeast1.pooler.supabase.com
                   ↑ 缺少连字符
```

### ✅ 正确格式：
```
aws-0-ap-northeast-1.pooler.supabase.com
                    ↑ 需要连字符
```

## 立即修复

在 Railway Variables 中，将 DATABASE_URL 更正为：

```
postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**关键修正**：
- `ap-northeast1` → `ap-northeast-1`

## 预期结果

修正后应该看到：
- 连接成功
- 数据库状态 "connected"
- 注册和登录功能正常

这是一个简单的打字错误，修正后问题应该立即解决！