# Level Up Solo - 代码审查检查清单

## **🔐 认证与安全检查**

### **1. 认证中间件验证**
- [ ] **isAuthenticated 中间件正确导入**
  ```typescript
  import { isAuthenticated } from "./simpleAuth";
  ```
- [ ] **所有敏感API都使用认证中间件**
  ```typescript
  app.post('/api/sensitive-endpoint', isAuthenticated, handler);
  ```
- [ ] **用户ID从认证上下文正确获取**
  ```typescript
  const userId = (req.user as any)?.claims?.sub; // ✅ 正确
  const userId = req.body.userId; // ❌ 错误 - 可能被伪造
  ```

### **2. 输入验证和清理**
- [ ] **使用Zod schema验证所有输入**
  ```typescript
  const taskData = insertTaskSchema.parse(req.body);
  ```
- [ ] **敏感数据不在客户端处理**
- [ ] **SQL注入防护** (使用参数化查询)
- [ ] **XSS防护** (输入清理和输出编码)

## **🛣️ 路由配置检查**

### **1. 路由挂载验证**
- [ ] **AI路由正确挂载**
  ```typescript
  // ✅ 正确挂载
  const aiRoutes = require('./ai').default;
  app.use('/api/ai', aiRoutes);
  
  // ❌ 错误 - 只有中间件没有路由
  app.use('/api/ai', (req, res, next) => { ... });
  ```

### **2. 避免重复路由定义**
- [ ] **检查是否有重复的路由定义**
  - 在routes.ts中定义了 `/api/ai/chat`
  - 在ai.ts中也定义了相同路由
- [ ] **确保路由优先级正确**

### **3. 错误处理**
- [ ] **统一错误响应格式**
  ```typescript
  res.status(500).json({ 
    message: "用户友好的错误信息",
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
  ```
- [ ] **避免泄露敏感错误信息**

## **📊 数据处理检查**

### **1. 数据库操作**
- [ ] **使用事务处理复杂操作**
- [ ] **正确的错误处理和回滚**
- [ ] **防止N+1查询问题**
- [ ] **SQL fallback策略** (针对schema不匹配)

### **2. 类型安全**
- [ ] **前后端共享类型定义**
- [ ] **避免any类型** (除非必要)
- [ ] **正确的类型导入**
  ```typescript
  import { InsertTask } from "@shared/schema"; // ✅
  ```

## **🧪 测试覆盖检查**

### **1. 关键路径测试**
- [ ] **认证流程测试**
- [ ] **CRUD操作测试**
- [ ] **错误场景测试**
- [ ] **边界条件测试**

### **2. 集成测试**
- [ ] **API端点集成测试**
- [ ] **数据库交互测试**
- [ ] **认证中间件测试**

## **📱 前端特定检查**

### **1. API调用**
- [ ] **使用apiRequest工具** (包含认证)
  ```typescript
  // ✅ 正确
  const response = await apiRequest('POST', '/api/tasks', taskData);
  
  // ❌ 错误 - 缺少认证
  const response = await fetch('/api/tasks', { ... });
  ```

### **2. 错误处理**
- [ ] **网络错误处理**
- [ ] **用户友好的错误提示**
- [ ] **加载状态管理**

## **🚀 部署前检查**

### **1. 环境变量**
- [ ] **所有必需的环境变量已设置**
- [ ] **敏感信息不在代码中硬编码**
- [ ] **不同环境的配置隔离**

### **2. 构建验证**
- [ ] **TypeScript编译无错误**
- [ ] **测试通过**
- [ ] **静态分析通过**

## **自动化检查命令**

在每次PR前运行：
```bash
# 1. 路由健康检查
npm run health-check

# 2. 完整的部署前检查
npm run pre-deploy

# 3. 测试覆盖率检查
npm run test:coverage
```

## **代码审查模板**

```markdown
## 认证安全 ✅/❌
- [ ] 认证中间件正确使用
- [ ] 用户ID从认证上下文获取
- [ ] 输入验证完整

## 路由配置 ✅/❌  
- [ ] 路由正确挂载
- [ ] 无重复定义
- [ ] 错误处理完善

## 数据安全 ✅/❌
- [ ] SQL注入防护
- [ ] XSS防护  
- [ ] 数据验证

## 测试覆盖 ✅/❌
- [ ] 单元测试
- [ ] 集成测试
- [ ] 错误场景测试

## 部署就绪 ✅/❌
- [ ] 构建成功
- [ ] 健康检查通过
- [ ] 环境变量配置正确
```

## **常见问题和解决方案**

### **问题1: AI路由401错误**
**原因**: 路由未正确挂载
**解决**: 确保使用 `app.use('/api/ai', aiRoutes)`

### **问题2: 任务创建500错误**  
**原因**: 前端发送空userId覆盖后端认证
**解决**: 移除前端userId字段，让后端处理

### **问题3: 认证中间件不生效**
**原因**: 中间件顺序错误或缺少导入
**解决**: 检查中间件导入和应用顺序

### **问题4: 数据库schema不匹配**
**原因**: 数据库和代码schema不同步
**解决**: 实现SQL fallback或使用db:push同步