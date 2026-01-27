import { Response } from 'express';

// 响应接口定义
export interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  error?: ErrorDetail;
  meta?: ResponseMeta;
  timestamp: string;
}

export interface ErrorDetail {
  type: string;
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  search?: SearchMeta;
  request_id?: string;
  version?: string;
}

export interface SearchMeta {
  query?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  sort_by?: string;
  sort_order?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// 错误类型枚举
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BUSINESS_ERROR = 'BUSINESS_ERROR'
}

// 错误代码枚举
export enum ErrorCode {
  // 验证错误
  INVALID_PARAMS = 'INVALID_PARAMS',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // 认证错误
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_VIEWER_KEY = 'INVALID_VIEWER_KEY',
  
  // 授权错误
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // 资源错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  
  // 业务错误
  VIDEO_PROCESSING_FAILED = 'VIDEO_PROCESSING_FAILED',
  VIDEO_ALREADY_PROCESSING = 'VIDEO_ALREADY_PROCESSING',
  VIDEO_NOT_READY = 'VIDEO_NOT_READY',
  QUEUE_FULL = 'QUEUE_FULL',
  NOT_AVAILABLE_YET = 'NOT_AVAILABLE_YET',
  EXPIRED = 'EXPIRED',
  
  // 分片上传错误
  UPLOAD_SESSION_INVALID = 'UPLOAD_SESSION_INVALID',
  UPLOAD_SESSION_EXPIRED = 'UPLOAD_SESSION_EXPIRED',
  CHUNK_ALREADY_UPLOADED = 'CHUNK_ALREADY_UPLOADED',
  UPLOAD_INCOMPLETE = 'UPLOAD_INCOMPLETE',
  CHUNK_VALIDATION_FAILED = 'CHUNK_VALIDATION_FAILED',
  FILE_SIZE_MISMATCH = 'FILE_SIZE_MISMATCH',
  
  // 系统错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_OPERATION_ERROR = 'FILE_OPERATION_ERROR'
}

// 响应工具类
export class ApiResponseUtil {
  /**
   * 成功响应（带数据）
   */
  static success<T>(res: Response, data: T, message: string = '操作成功', code: number = 200, meta?: ResponseMeta): void {
    const response: ApiResponse<T> = {
      success: true,
      code,
      message,
      data,
      meta,
      timestamp: new Date().toISOString()
    };
    res.status(code).json(response);
  }

  /**
   * 成功响应（无数据）
   */
  static successWithoutData(res: Response, message: string = '操作成功', code: number = 200): void {
    const response: ApiResponse = {
      success: true,
      code,
      message,
      timestamp: new Date().toISOString()
    };
    res.status(code).json(response);
  }

  /**
   * 分页数据响应
   */
  static successWithPagination<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message: string = '获取成功',
    code: number = 200
  ): void {
    const response: ApiResponse<T[]> = {
      success: true,
      code,
      message,
      data,
      meta: {
        pagination
      },
      timestamp: new Date().toISOString()
    };
    res.status(code).json(response);
  }

  /**
   * 错误响应
   */
  static error(
    res: Response,
    httpCode: number,
    errorType: ErrorType,
    errorCode: ErrorCode,
    message: string,
    details?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      code: httpCode,
      message,
      error: {
        type: errorType,
        code: errorCode,
        message,
        details
      },
      timestamp: new Date().toISOString()
    };
    res.status(httpCode).json(response);
  }

  /**
   * 验证错误响应
   */
  static validationError(res: Response, message: string, details?: any): void {
    this.error(res, 400, ErrorType.VALIDATION_ERROR, ErrorCode.INVALID_PARAMS, message, details);
  }

  /**
   * 认证错误响应
   */
  static authenticationError(res: Response, message: string = '认证失败'): void {
    this.error(res, 401, ErrorType.AUTHENTICATION_ERROR, ErrorCode.INVALID_CREDENTIALS, message);
  }

  /**
   * 授权错误响应
   */
  static authorizationError(res: Response, message: string = '无权限访问'): void {
    this.error(res, 403, ErrorType.AUTHORIZATION_ERROR, ErrorCode.ACCESS_DENIED, message);
  }

  /**
   * 资源不存在错误响应
   */
  static notFoundError(res: Response, message: string = '资源不存在'): void {
    this.error(res, 404, ErrorType.NOT_FOUND_ERROR, ErrorCode.RESOURCE_NOT_FOUND, message);
  }

  /**
   * 资源冲突错误响应
   */
  static conflictError(res: Response, message: string = '资源已存在'): void {
    this.error(res, 409, ErrorType.CONFLICT_ERROR, ErrorCode.RESOURCE_ALREADY_EXISTS, message);
  }

  /**
   * 业务错误响应
   */
  static businessError(res: Response, errorCode: ErrorCode, message: string, details?: any): void {
    this.error(res, 400, ErrorType.BUSINESS_ERROR, errorCode, message, details);
  }

  /**
   * 服务器内部错误响应
   */
  static internalError(res: Response, message: string = '服务器内部错误', details?: any): void {
    this.error(res, 500, ErrorType.INTERNAL_ERROR, ErrorCode.INTERNAL_SERVER_ERROR, message, details);
  }

  /**
   * 创建分页元数据
   */
  static createPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
    const pages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      pages,
      has_next: page < pages,
      has_prev: page > 1
    };
  }
}

// 导出便捷方法
export const ResponseHelper = ApiResponseUtil;
