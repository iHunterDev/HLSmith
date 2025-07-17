// ========================
// 后端API响应格式定义
// ========================

// 基础API响应结构
export interface ApiResponse<T = unknown> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  error?: ErrorDetail;
  meta?: ResponseMeta;
  timestamp: string;
}

// 错误详情
export interface ErrorDetail {
  type: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// 响应元数据
export interface ResponseMeta {
  pagination?: PaginationMeta;
  search?: SearchMeta;
  request_id?: string;
  version?: string;
}

// 搜索元数据
export interface SearchMeta {
  query?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  sort_by?: string;
  sort_order?: string;
}

// 分页元数据
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ========================
// 用户相关类型定义
// ========================

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ========================
// 视频相关类型定义
// ========================

export interface Video {
  id: number;
  title: string;
  original_filename: string;
  duration?: number;
  file_size: number;
  status: VideoStatus;
  conversion_progress: number;
  thumbnail_url?: string;
  hls_url?: string;
  created_at: string;
  updated_at: string;
}

export enum VideoStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELETED = 'deleted'
}

// 视频列表响应（新格式）
export interface VideoListResponse {
  videos: Video[];
  pagination: PaginationMeta;
  search?: SearchMeta;
}

// 视频上传响应
export interface VideoUploadResponse {
  id: number;
  title: string;
  original_filename: string;
  file_size: number;
  status: VideoStatus;
  conversion_progress: number;
  created_at: string;
  updated_at: string;
}

// ========================
// 分片上传相关类型定义
// ========================

export interface UploadSession {
  id: string;
  filename: string;
  file_size: number;
  total_chunks: number;
  chunk_size: number;
  uploaded_chunks: number[];
  status: UploadSessionStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export enum UploadSessionStatus {
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface InitChunkedUploadRequest {
  filename: string;
  fileSize: number;
  chunkSize?: number;
}

export interface InitChunkedUploadResponse {
  id: string;
  filename: string;
  file_size: number;
  total_chunks: number;
  chunk_size: number;
  uploaded_chunks: number[];
  status: UploadSessionStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface UploadChunkRequest {
  uploadId: string;
  chunkNumber: number;
  chunk: File;
}

export interface UploadChunkResponse {
  uploadId: string;
  chunkNumber: number;
  uploadedChunks: number[];
  totalChunks: number;
  isComplete: boolean;
}

export interface CompleteUploadRequest {
  uploadId: string;
  title: string;
}

export interface ChunkedUploadProgress {
  uploadId: string;
  filename: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number;
  progress: number;
  speed: number;
  eta: number;
  status: UploadSessionStatus;
  error?: string;
}

export interface ChunkUploadInfo {
  chunkNumber: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
  error?: string;
}

export interface ChunkedUploadOptions {
  chunkSize?: number;
  maxConcurrent?: number;
  maxRetries?: number;
  timeout?: number;
  onProgress?: (progress: ChunkedUploadProgress) => void;
  onChunkProgress?: (chunkInfo: ChunkUploadInfo) => void;
  onError?: (error: Error) => void;
}

export interface ResumeUploadInfo {
  uploadId: string;
  session: UploadSession;
  file: File;
  title: string;
}

// ========================
// HLS相关类型定义
// ========================

export interface HLSConversionOptions {
  quality?: 'low' | 'medium' | 'high';
  resolution?: '480p' | '720p' | '1080p';
}

export interface HLSConversionResponse {
  videoId: number;
  jobId: number;
  status: string;
}

export interface HLSStatusResponse {
  videoId: number;
  status: VideoStatus;
  progress: number;
  hlsUrl?: string;
  thumbnailUrl?: string;
  queueJob?: QueueJob;
}

// ========================
// 队列相关类型定义
// ========================

export interface QueueJob {
  id: number;
  videoId?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  maxConcurrent: number;
}

export interface QueueConfigResponse {
  maxConcurrent: number;
}

export interface QueueRetryResponse {
  jobId: number;
  status: string;
}

// ========================
// 视频分享相关类型定义
// ========================

export interface ShareResponse {
  id: number;
  video_id: number;
  access_token: string;
  share_url: string;
  created_at: string;
  is_active: boolean;
  access_count: number;
}

export interface ShareInfo {
  title: string;
  duration?: number;
  shared_at: string;
  view_count: number;
}

export interface CreateShareRequest {
  videoId: number;
}

export interface ShareManagementOptions {
  shareId: number;
}

// ========================
// 前端专用类型定义
// ========================

// 上传进度回调
export type UploadProgressCallback = (progress: number) => void;

// 错误消息类型
export interface AppError {
  message: string;
  code?: string;
  type?: string;
  details?: Record<string, unknown>;
}

// 加载状态
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// 表单验证错误
export interface ValidationErrors {
  [key: string]: string[];
}

// 通知类型
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// ========================
// API调用选项
// ========================

export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface VideoSearchOptions extends PaginationOptions {
  q?: string;                    // 搜索关键词
  status?: VideoStatus;          // 状态筛选
  start_date?: string;           // 开始日期
  end_date?: string;             // 结束日期
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'file_size' | 'duration';
  sort_order?: 'ASC' | 'DESC';
}

// ========================
// 健康检查响应
// ========================

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export interface ServerStatusResponse {
  message: string;
  status: string;
  version: string;
}

// ========================
// 系统配置
// ========================

export interface SystemConfig {
  apiBaseUrl: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  maxConcurrentUploads: number;
}

// ========================
// 工具类型
// ========================

// 深度可选类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 排除某些属性的类型
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// 选择某些属性的类型
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// ID类型
export type ID = string | number;

// 时间戳类型
export type Timestamp = string;

// ========================
// 错误码枚举
// ========================

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export enum ErrorCode {
  // 验证错误
  INVALID_PARAMS = 'INVALID_PARAMS',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // 认证错误
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
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
  
  // 系统错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_OPERATION_ERROR = 'FILE_OPERATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}