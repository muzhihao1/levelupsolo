/**
 * API Response Type Definitions
 * API 响应类型定义
 * 
 * 基于 API_RESPONSE_FORMAT.md 标准
 */

// =====================================================
// Core Types - 核心类型
// =====================================================

/**
 * Standard API Response
 * 标准 API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
  timestamp: string;
}

/**
 * API Error Structure
 * API 错误结构
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}

/**
 * API Meta Information
 * API 元信息
 */
export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
  hasPrev?: boolean;
  version?: string;
  requestId?: string;
}

/**
 * Validation Error Detail
 * 验证错误详情
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

/**
 * Batch Operation Result
 * 批量操作结果
 */
export interface BatchOperationResult<T = number> {
  succeeded: T[];
  failed: Array<{
    id: T;
    error: ApiError;
  }>;
}

// =====================================================
// Error Codes - 错误代码
// =====================================================

/**
 * Authentication Error Codes
 * 认证相关错误代码
 */
export enum AuthErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_NO_PERMISSION = 'AUTH_NO_PERMISSION',
}

/**
 * Validation Error Codes
 * 验证相关错误代码
 */
export enum ValidationErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VALIDATION_REQUIRED = 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT = 'VALIDATION_FORMAT',
  VALIDATION_RANGE = 'VALIDATION_RANGE',
}

/**
 * Resource Error Codes
 * 资源相关错误代码
 */
export enum ResourceErrorCode {
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  RESOURCE_EXPIRED = 'RESOURCE_EXPIRED',
}

/**
 * Business Logic Error Codes
 * 业务逻辑错误代码
 */
export enum BusinessErrorCode {
  BIZ_LIMIT_EXCEEDED = 'BIZ_LIMIT_EXCEEDED',
  BIZ_INSUFFICIENT_BALANCE = 'BIZ_INSUFFICIENT_BALANCE',
  BIZ_INVALID_STATE = 'BIZ_INVALID_STATE',
  BIZ_DUPLICATE = 'BIZ_DUPLICATE',
}

/**
 * System Error Codes
 * 系统相关错误代码
 */
export enum SystemErrorCode {
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_OVERLOAD = 'SYSTEM_OVERLOAD',
  SYSTEM_TIMEOUT = 'SYSTEM_TIMEOUT',
}

/**
 * All Error Codes Union
 * 所有错误代码联合类型
 */
export type ErrorCode = 
  | AuthErrorCode 
  | ValidationErrorCode 
  | ResourceErrorCode 
  | BusinessErrorCode 
  | SystemErrorCode
  | string;

// =====================================================
// Helper Functions - 辅助函数
// =====================================================

/**
 * Create Success Response
 * 创建成功响应
 */
export function successResponse<T>(
  data: T, 
  meta?: ApiMeta
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create Error Response
 * 创建错误响应
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: any,
  meta?: ApiMeta
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create Validation Error Response
 * 创建验证错误响应
 */
export function validationErrorResponse(
  errors: ValidationErrorDetail[],
  meta?: ApiMeta
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code: ValidationErrorCode.VALIDATION_ERROR,
      message: '输入数据验证失败',
      details: errors,
    },
    meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create Paginated Response
 * 创建分页响应
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;
  const hasPrev = page > 1;

  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasMore,
      hasPrev,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate Request ID
 * 生成请求 ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =====================================================
// Type Guards - 类型守卫
// =====================================================

/**
 * Check if response is successful
 * 检查响应是否成功
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Check if response is error
 * 检查响应是否为错误
 */
export function isErrorResponse(
  response: ApiResponse<any>
): response is ApiResponse<never> & { success: false; error: ApiError } {
  return response.success === false && response.error !== undefined;
}

/**
 * Check if error is validation error
 * 检查是否为验证错误
 */
export function isValidationError(error: ApiError): boolean {
  return error.code === ValidationErrorCode.VALIDATION_ERROR;
}

// =====================================================
// Error Classes - 错误类
// =====================================================

/**
 * API Exception Class
 * API 异常类
 */
export class ApiException extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiException';
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Validation Exception Class
 * 验证异常类
 */
export class ValidationException extends ApiException {
  constructor(errors: ValidationErrorDetail[]) {
    super(
      ValidationErrorCode.VALIDATION_ERROR,
      '输入数据验证失败',
      errors
    );
    this.name = 'ValidationException';
  }
}

/**
 * Not Found Exception Class
 * 资源未找到异常类
 */
export class NotFoundException extends ApiException {
  constructor(resource: string) {
    super(
      ResourceErrorCode.RESOURCE_NOT_FOUND,
      `${resource}不存在`
    );
    this.name = 'NotFoundException';
  }
}

/**
 * Unauthorized Exception Class
 * 未授权异常类
 */
export class UnauthorizedException extends ApiException {
  constructor(message: string = '认证失败，请重新登录') {
    super(AuthErrorCode.AUTH_FAILED, message);
    this.name = 'UnauthorizedException';
  }
}

// =====================================================
// HTTP Status Code Mapping - HTTP 状态码映射
// =====================================================

/**
 * Get HTTP status code from error code
 * 从错误代码获取 HTTP 状态码
 */
export function getHttpStatusFromErrorCode(code: ErrorCode): number {
  // Authentication errors -> 401
  if (Object.values(AuthErrorCode).includes(code as AuthErrorCode)) {
    if (code === AuthErrorCode.AUTH_NO_PERMISSION) {
      return 403;
    }
    return 401;
  }

  // Validation errors -> 400
  if (Object.values(ValidationErrorCode).includes(code as ValidationErrorCode)) {
    return 400;
  }

  // Resource errors
  if (Object.values(ResourceErrorCode).includes(code as ResourceErrorCode)) {
    switch (code) {
      case ResourceErrorCode.RESOURCE_NOT_FOUND:
        return 404;
      case ResourceErrorCode.RESOURCE_CONFLICT:
        return 409;
      case ResourceErrorCode.RESOURCE_LOCKED:
        return 423;
      default:
        return 400;
    }
  }

  // Business errors -> 400
  if (Object.values(BusinessErrorCode).includes(code as BusinessErrorCode)) {
    if (code === BusinessErrorCode.BIZ_LIMIT_EXCEEDED) {
      return 429;
    }
    return 400;
  }

  // System errors -> 500
  if (Object.values(SystemErrorCode).includes(code as SystemErrorCode)) {
    if (code === SystemErrorCode.SYSTEM_MAINTENANCE) {
      return 503;
    }
    if (code === SystemErrorCode.SYSTEM_TIMEOUT) {
      return 504;
    }
    return 500;
  }

  // Default to 500 for unknown errors
  return 500;
}