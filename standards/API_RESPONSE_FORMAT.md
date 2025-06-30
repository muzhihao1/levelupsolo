# API Response Format Standard
# API 响应格式标准 v1.0

## 概述
本标准定义了 Level Up Solo 项目统一的 API 响应格式，确保 Web 端和 iOS 端获得一致的数据结构。

## 核心原则
1. **一致性**: 所有 API 端点使用相同的响应结构
2. **可预测性**: 客户端总是知道期望的响应格式
3. **错误友好**: 提供清晰、可操作的错误信息
4. **扩展性**: 支持未来功能扩展而不破坏现有结构

## 标准响应格式

### 基础结构
```typescript
interface ApiResponse<T = any> {
  success: boolean;          // 请求是否成功
  data?: T;                  // 响应数据（成功时）
  error?: ApiError;          // 错误信息（失败时）
  meta?: ApiMeta;            // 元数据（可选）
  timestamp: string;         // ISO 8601 时间戳
}

interface ApiError {
  code: string;              // 错误代码（如 "AUTH_FAILED"）
  message: string;           // 用户友好的错误消息
  details?: any;             // 详细错误信息（开发环境）
  field?: string;            // 字段级错误（验证错误）
}

interface ApiMeta {
  page?: number;             // 当前页码
  limit?: number;            // 每页数量
  total?: number;            // 总数量
  hasMore?: boolean;         // 是否有更多数据
  version?: string;          // API 版本
  requestId?: string;        // 请求追踪 ID
}
```

## 响应示例

### 成功响应

#### 单个资源
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Complete project",
    "completed": false,
    "priority": 3
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 资源列表
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Task 1" },
    { "id": 2, "name": "Task 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasMore": true
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 空数据
```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "hasMore": false
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 错误响应

#### 验证错误
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "输入数据验证失败",
    "details": [
      {
        "field": "title",
        "message": "标题不能为空"
      },
      {
        "field": "priority",
        "message": "优先级必须在 0-5 之间"
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 认证错误
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "认证失败，请重新登录"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 资源未找到
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "请求的资源不存在"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 服务器错误
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "服务器内部错误，请稍后重试"
  },
  "meta": {
    "requestId": "req_123456"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 错误代码规范

### 认证相关 (AUTH_*)
- `AUTH_FAILED`: 认证失败
- `AUTH_EXPIRED`: 认证过期
- `AUTH_INVALID_TOKEN`: 无效的令牌
- `AUTH_NO_PERMISSION`: 无权限

### 验证相关 (VALIDATION_*)
- `VALIDATION_ERROR`: 通用验证错误
- `VALIDATION_REQUIRED`: 必填字段缺失
- `VALIDATION_FORMAT`: 格式错误
- `VALIDATION_RANGE`: 超出范围

### 资源相关 (RESOURCE_*)
- `RESOURCE_NOT_FOUND`: 资源不存在
- `RESOURCE_CONFLICT`: 资源冲突
- `RESOURCE_LOCKED`: 资源被锁定
- `RESOURCE_EXPIRED`: 资源已过期

### 业务逻辑 (BIZ_*)
- `BIZ_LIMIT_EXCEEDED`: 超出限制
- `BIZ_INSUFFICIENT_BALANCE`: 余额不足
- `BIZ_INVALID_STATE`: 无效状态
- `BIZ_DUPLICATE`: 重复操作

### 系统相关 (SYSTEM_*)
- `SYSTEM_ERROR`: 系统错误
- `SYSTEM_MAINTENANCE`: 系统维护
- `SYSTEM_OVERLOAD`: 系统过载
- `SYSTEM_TIMEOUT`: 请求超时

## HTTP 状态码映射

| 状态码 | 使用场景 | 错误代码示例 |
|--------|----------|--------------|
| 200 | 成功 | - |
| 201 | 创建成功 | - |
| 204 | 删除成功 | - |
| 400 | 客户端错误 | VALIDATION_* |
| 401 | 未认证 | AUTH_FAILED |
| 403 | 无权限 | AUTH_NO_PERMISSION |
| 404 | 资源不存在 | RESOURCE_NOT_FOUND |
| 409 | 资源冲突 | RESOURCE_CONFLICT |
| 429 | 请求过多 | BIZ_LIMIT_EXCEEDED |
| 500 | 服务器错误 | SYSTEM_ERROR |
| 503 | 服务不可用 | SYSTEM_MAINTENANCE |

## 特殊情况处理

### 批量操作
```json
{
  "success": true,
  "data": {
    "succeeded": [1, 2, 3],
    "failed": [
      {
        "id": 4,
        "error": {
          "code": "RESOURCE_LOCKED",
          "message": "任务被锁定"
        }
      }
    ]
  },
  "meta": {
    "total": 4,
    "succeeded": 3,
    "failed": 1
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 分页数据
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true,
    "hasPrev": true
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 文件上传
```json
{
  "success": true,
  "data": {
    "fileId": "file_123",
    "filename": "avatar.png",
    "size": 102400,
    "mimeType": "image/png",
    "url": "https://cdn.example.com/file_123"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 客户端处理建议

### TypeScript 类型定义
```typescript
// 通用响应处理
async function apiRequest<T>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  const result: ApiResponse<T> = await response.json();
  
  if (!result.success) {
    throw new ApiException(result.error);
  }
  
  return result.data;
}

// 错误处理
class ApiException extends Error {
  constructor(public error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
  }
}
```

### Swift 处理示例
```swift
struct ApiResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: ApiError?
    let meta: ApiMeta?
    let timestamp: String
}

// 使用示例
let response = try decoder.decode(
    ApiResponse<[Task]>.self, 
    from: data
)

if response.success, let tasks = response.data {
    // 处理成功数据
} else if let error = response.error {
    // 处理错误
}
```

## 迁移指南

### 第一阶段：新端点采用
- 所有新创建的 API 端点使用新格式
- 保持旧端点不变，避免破坏现有功能

### 第二阶段：渐进迁移
- 为旧端点创建 v2 版本
- 使用版本控制：`/api/v2/tasks`
- 客户端逐步迁移到新版本

### 第三阶段：统一切换
- 设置迁移截止日期
- 提供迁移工具和脚本
- 废弃旧版本 API

## 版本控制

### URL 版本控制
```
/api/v1/tasks  (旧版本)
/api/v2/tasks  (新版本)
```

### Header 版本控制
```
X-API-Version: 2
```

## 监控和日志

### 请求追踪
每个请求生成唯一的 requestId：
```typescript
const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### 错误日志格式
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "requestId": "req_123456",
  "userId": "user_789",
  "method": "POST",
  "path": "/api/tasks",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "stack": "..."
  }
}
```

## 最佳实践

1. **一致性检查**: 使用中间件自动格式化响应
2. **错误处理**: 集中处理错误，避免敏感信息泄露
3. **版本管理**: 明确标注 API 版本
4. **文档同步**: 保持文档与实际实现一致
5. **性能考虑**: 避免过度嵌套，保持响应简洁

## 工具支持

- 响应格式化中间件：`server/middleware/response-formatter.ts`
- 类型定义：`shared/types/api-response.ts`
- 验证工具：`tools/api-response-validator.ts`
- 迁移脚本：`scripts/migrate-api-responses.ts`