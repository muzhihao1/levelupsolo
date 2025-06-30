# Level Up Solo 工具使用指南

## 概述
本文档介绍新创建的支持工具，这些工具旨在帮助诊断和解决项目中的配置、类型一致性和数据验证问题。

## 工具清单

### 1. 🔧 环境变量配置检查工具
**文件**: `scripts/check-env-config.ts`
**用途**: 诊断部署环境的配置问题，特别是Railway部署

#### 使用方法
```bash
# 检查当前环境配置
npm run check:env

# 直接运行
tsx scripts/check-env-config.ts
```

#### 功能特点
- ✅ 检查所有必需的环境变量
- ✅ 验证变量格式（如数据库URL、密钥长度）
- ✅ 测试数据库连接
- ✅ 检测Railway平台环境
- ✅ 生成安全的密钥示例
- ✅ 提供修复建议

#### 输出示例
```
🔧 Level Up Solo - Environment Configuration Check

Environment Variable Check Results:
============================================================

✅ Valid Variables:
   ✓ Database URL: postgresql://user:****@host:5432/db
   ✓ Node Environment: production

❌ Missing Variables:
   ✗ Session Secret
     Description: Secret key for session encryption
     Example: your-very-long-random-session-secret-key

⚠️  Action Required:
1. Add missing environment variables to Railway
2. Fix any invalid variable formats
3. Re-deploy your application
```

### 2. 📊 类型一致性修复方案
**文件**: 
- `scripts/fix-type-inconsistency.sql` - 数据库迁移脚本
- `shared/types/unified-models.ts` - 统一类型定义
- `TYPE_CONSISTENCY_FIX_GUIDE.md` - 修复指南

#### 使用方法
```bash
# 1. 备份数据库
pg_dump $DATABASE_URL > backup.sql

# 2. 执行迁移
psql $DATABASE_URL < scripts/fix-type-inconsistency.sql

# 3. 验证结果
SELECT * FROM check_type_consistency();
```

#### 修复内容
- 添加 `tasks.due_date` 字段
- 添加 `tasks.priority` 字段
- 更新枚举类型约束
- 创建必要的索引

### 3. 🔍 跨平台数据验证工具
**文件**: `tools/cross-platform-validator.ts`
**用途**: 验证Web端和iOS端之间的数据格式一致性

#### 使用方法
```bash
# 使用示例数据测试
npm run validate:data

# 验证数据库中的实际数据
npm run validate:db

# 指定验证类型
tsx tools/cross-platform-validator.ts --type=task

# 未来功能：自动修复
tsx tools/cross-platform-validator.ts --db --fix
```

#### 验证内容
- ✅ 字段存在性检查
- ✅ 数据类型验证
- ✅ 枚举值合法性
- ✅ 数值范围验证
- ✅ 日期格式一致性

#### 输出示例
```
📊 Testing with sample data...

Testing Task Validation:
❌ Validation failed

Errors:
  - priority: iOS requires priority field
    Current value: "undefined"

Warnings:
  - dueDate: iOS expects dueDate field, but it's missing
    Suggestion: Add migration to include dueDate in tasks table
  - createdAt: Date is in string format, iOS expects Date object
    Suggestion: Ensure proper date parsing in API responses

Suggestions:
  - Run database migration to add missing fields
```

## 快速诊断流程

### 1. Railway登录问题诊断
```bash
# Step 1: 检查环境配置
npm run check:env

# Step 2: 查看缺失的变量
# 根据输出添加到Railway环境变量

# Step 3: 验证数据库连接
# 工具会自动测试
```

### 2. 数据同步问题诊断
```bash
# Step 1: 验证数据格式
npm run validate:db

# Step 2: 如果有类型错误，执行迁移
psql $DATABASE_URL < scripts/fix-type-inconsistency.sql

# Step 3: 重新验证
npm run validate:db
```

## 常见问题解决

### Q1: Railway部署后无法登录
**解决步骤**:
1. 运行 `npm run check:env`
2. 确认以下变量已设置：
   - `SESSION_SECRET` (至少32字符)
   - `JWT_SECRET` (至少32字符)
   - `DATABASE_URL` (正确格式)
   - `NODE_ENV=production`

### Q2: iOS端同步失败
**解决步骤**:
1. 运行 `npm run validate:data`
2. 检查是否有字段缺失警告
3. 执行类型一致性修复
4. 确认API返回正确的日期格式

### Q3: 数据库连接失败
**解决步骤**:
1. 运行 `npm run check:env`
2. 验证 `DATABASE_URL` 格式
3. 检查数据库服务是否运行
4. 确认网络连接

## 工具维护

### 添加新的验证规则
在 `shared/types/unified-models.ts` 中添加：
```typescript
export const NewValidationRule = {
  // 定义新规则
};
```

### 扩展环境检查
在 `scripts/check-env-config.ts` 的 `ENV_CHECKS` 数组中添加：
```typescript
{
  name: 'New Variable',
  key: 'NEW_VAR',
  required: true,
  validator: (value) => /* 验证逻辑 */,
  description: '描述',
  example: '示例值'
}
```

## 最佳实践

1. **定期运行检查**
   - 每次部署前运行 `npm run check:env`
   - 每周运行 `npm run validate:db` 检查数据一致性

2. **版本控制**
   - 提交代码前运行 `npm run check`
   - 确保类型定义同步更新

3. **监控告警**
   - 在CI/CD中集成这些工具
   - 设置数据验证失败的告警

## 未来改进计划

1. **自动修复功能**
   - 自动修正简单的类型不匹配
   - 生成迁移脚本

2. **可视化界面**
   - Web界面查看验证结果
   - 实时监控数据一致性

3. **性能优化**
   - 批量验证优化
   - 缓存验证结果

## 联系支持

遇到问题时：
1. 查看相关文档
2. 运行诊断工具
3. 检查日志输出
4. 参考技术债务分析文档

---

**记住**: 这些工具是为了帮助快速定位和解决问题，定期使用可以预防潜在问题的发生。