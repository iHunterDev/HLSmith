import { ErrorType, ErrorCode } from '../types';

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'auth',
  AUTHORIZATION = 'authz',
  VALIDATION = 'validation',
  BUSINESS = 'business',
  SYSTEM = 'system'
}

export class AppError extends Error {
  public code?: string;
  public type?: string;
  public details?: Record<string, unknown>;
  public category: ErrorCategory;

  constructor(
    message: string, 
    code?: string, 
    type?: string, 
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.type = type;
    this.details = details;
    this.category = this.categorizeError(type, code);
  }

  private categorizeError(type?: string, code?: string): ErrorCategory {
    if (type === ErrorType.AUTHENTICATION_ERROR) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (type === ErrorType.AUTHORIZATION_ERROR) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (type === ErrorType.VALIDATION_ERROR) {
      return ErrorCategory.VALIDATION;
    }
    if (type === ErrorType.BUSINESS_ERROR) {
      return ErrorCategory.BUSINESS;
    }
    if (type === ErrorType.NETWORK_ERROR || type === ErrorType.TIMEOUT_ERROR) {
      return ErrorCategory.NETWORK;
    }
    if (type === ErrorType.INTERNAL_ERROR) {
      return ErrorCategory.SYSTEM;
    }
    
    if (code === ErrorCode.NETWORK_ERROR || code === ErrorCode.TIMEOUT_ERROR) {
      return ErrorCategory.NETWORK;
    }
    
    return ErrorCategory.SYSTEM;
  }
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof AppError && error.category === ErrorCategory.NETWORK;
}

export function isAuthError(error: unknown): boolean {
  return error instanceof AppError && error.category === ErrorCategory.AUTHENTICATION;
}

export function isAuthzError(error: unknown): boolean {
  return error instanceof AppError && error.category === ErrorCategory.AUTHORIZATION;
}

export function isValidationError(error: unknown): boolean {
  return error instanceof AppError && error.category === ErrorCategory.VALIDATION;
}

export function isBusinessError(error: unknown): boolean {
  return error instanceof AppError && error.category === ErrorCategory.BUSINESS;
}

export function isSystemError(error: unknown): boolean {
  return error instanceof AppError && error.category === ErrorCategory.SYSTEM;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return '发生未知错误，请稍后重试';
}

export function getUserFriendlyMessage(error: unknown): string {
  if (!(error instanceof AppError)) {
    return getErrorMessage(error);
  }

  switch (error.code) {
    case ErrorCode.TOKEN_EXPIRED:
      return '登录已过期，请重新登录';
    case ErrorCode.INVALID_TOKEN:
      return '登录信息无效，请重新登录';
    case ErrorCode.INVALID_CREDENTIALS:
      return '用户名或密码错误';
    case ErrorCode.ACCESS_DENIED:
      return '访问被拒绝';
    case ErrorCode.INSUFFICIENT_PERMISSIONS:
      return '权限不足';
    case ErrorCode.RESOURCE_NOT_FOUND:
      return '资源不存在';
    case ErrorCode.RESOURCE_ALREADY_EXISTS:
      return '资源已存在';
    case ErrorCode.VIDEO_PROCESSING_FAILED:
      return '视频处理失败';
    case ErrorCode.VIDEO_ALREADY_PROCESSING:
      return '视频正在处理中';
    case ErrorCode.UPLOAD_SESSION_EXPIRED:
      return '上传会话已过期，请重新开始上传';
    case ErrorCode.CHUNK_ALREADY_UPLOADED:
      return '分片已上传';
    case ErrorCode.NETWORK_ERROR:
      return '网络连接失败，请检查网络设置';
    case ErrorCode.TIMEOUT_ERROR:
      return '请求超时，请重试';
    case ErrorCode.INTERNAL_SERVER_ERROR:
      return '服务器内部错误，请联系管理员';
    default:
      return error.message || '操作失败，请重试';
  }
}