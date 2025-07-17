import axios, { AxiosResponse, AxiosError } from 'axios';
import { 
  ApiResponse, 
  AuthResponse, 
  LoginData, 
  RegisterData, 
 
  VideoUploadResponse,
  Video,
  HLSConversionOptions,
  HLSConversionResponse,
  HLSStatusResponse,
  QueueStatus,
  QueueJob,
  QueueConfigResponse,
  QueueRetryResponse,
  HealthCheckResponse,
  ServerStatusResponse,
  // PaginationOptions,
  VideoSearchOptions,
  PaginationMeta,
  SearchMeta,
  UploadProgressCallback,
  ErrorType,
  ErrorCode,
  InitChunkedUploadRequest,
  InitChunkedUploadResponse,
  UploadChunkResponse,
  UploadSession,
  CompleteUploadRequest,
  ShareResponse,
  ShareInfo,
  // CreateShareRequest,
  // ShareManagementOptions
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30秒超时
});

// ========================
// 工具函数
// ========================

/**
 * 从后端API响应中提取数据
 */
function extractApiData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const apiResponse = response.data;
  
  if (!apiResponse.success) {
    throw new AppError(
      apiResponse.message || '请求失败',
      apiResponse.error?.code,
      apiResponse.error?.type,
      apiResponse.error?.details
    );
  }
  
  return apiResponse.data as T;
}

/**
 * 创建应用错误对象
 */
class AppError extends Error {
  public code?: string;
  public type?: string;
  public details?: Record<string, unknown>;

  constructor(message: string, code?: string, type?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.type = type;
    this.details = details;
  }
}

/**
 * 处理axios错误
 */
function handleApiError(error: AxiosError): never {
  if (error.response?.data) {
    const apiResponse = error.response.data as ApiResponse;
    throw new AppError(
      apiResponse.message || '请求失败',
      apiResponse.error?.code,
      apiResponse.error?.type,
      apiResponse.error?.details
    );
  }
  
  if (error.code === 'ECONNABORTED') {
    throw new AppError('请求超时，请重试', ErrorCode.TIMEOUT_ERROR, ErrorType.TIMEOUT_ERROR);
  }
  
  if (!error.response) {
    throw new AppError('网络连接失败', ErrorCode.NETWORK_ERROR, ErrorType.NETWORK_ERROR);
  }
  
  throw new AppError(
    error.message || '未知错误',
    ErrorCode.INTERNAL_SERVER_ERROR,
    ErrorType.INTERNAL_ERROR
  );
}

// ========================
// 请求拦截器
// ========================

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理通用错误
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 如果已经是 AppError，直接返回
    if (error instanceof AppError) {
      return Promise.reject(error);
    }
    
    // 处理401未授权错误
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new AppError('登录已过期，请重新登录', ErrorCode.TOKEN_EXPIRED, ErrorType.AUTHENTICATION_ERROR));
    }
    
    return Promise.reject(handleApiError(error));
  }
);

// ========================
// 系统API
// ========================

export const systemApi = {
  /**
   * 获取服务器状态
   */
  getServerStatus: async (): Promise<ServerStatusResponse> => {
    try {
      const response = await api.get<ApiResponse<ServerStatusResponse>>('/');
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 健康检查
   */
  healthCheck: async (): Promise<HealthCheckResponse> => {
    try {
      const response = await api.get<ApiResponse<HealthCheckResponse>>('/api/health');
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// ========================
// 认证API
// ========================

export const authApi = {
  /**
   * 用户登录
   */
  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/api/auth/login', data);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
  
  /**
   * 用户注册
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/api/auth/register', data);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
  
  /**
   * 获取用户信息
   */
  getProfile: async (): Promise<unknown> => {
    try {
      const response = await api.get<ApiResponse<unknown>>('/api/auth/profile');
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 用户登出（前端处理）
   */
  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// ========================
// 视频API
// ========================

export const videoApi = {
  /**
   * 获取视频列表
   */
  getVideos: async (options: VideoSearchOptions = {}): Promise<{ videos: Video[]; pagination: PaginationMeta; search?: SearchMeta }> => {
    try {
      const { 
        page = 1, 
        limit = 20,
        q,
        status,
        start_date,
        end_date,
        sort_by,
        sort_order
      } = options;
      
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (q) params.append('q', q);
      if (status) params.append('status', status);
      if (start_date) params.append('start_date', start_date);
      if (end_date) params.append('end_date', end_date);
      if (sort_by) params.append('sort_by', sort_by);
      if (sort_order) params.append('sort_order', sort_order);
      
      const response = await api.get<ApiResponse<Video[]>>(`/api/videos?${params.toString()}`);
      
      const apiResponse = response.data;
      if (!apiResponse.success) {
        throw new AppError(apiResponse.message || '获取视频列表失败');
      }

      return {
        videos: apiResponse.data || [],
        pagination: (apiResponse.meta?.pagination as PaginationMeta) || {
          page,
          limit,
          total: 0,
          pages: 0,
          has_next: false,
          has_prev: false
        },
        search: apiResponse.meta?.search as SearchMeta
      };
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
  
  /**
   * 上传视频
   */
  uploadVideo: async (
    formData: FormData, 
    onProgress?: UploadProgressCallback
  ): Promise<VideoUploadResponse> => {
    try {
      const response = await api.post<ApiResponse<VideoUploadResponse>>('/api/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
  
  /**
   * 获取视频详情
   */
  getVideo: async (id: number): Promise<Video> => {
    try {
      const response = await api.get<ApiResponse<Video>>(`/api/videos/${id}`);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 获取视频状态
   */
  getVideoStatus: async (id: number): Promise<Video> => {
    try {
      const response = await api.get<ApiResponse<Video>>(`/api/videos/${id}/status`);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 更新视频信息
   */
  updateVideo: async (id: number, data: { title: string }): Promise<Video> => {
    try {
      const response = await api.put<ApiResponse<Video>>(`/api/videos/${id}`, data);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
  
  /**
   * 删除视频
   */
  deleteVideo: async (id: number): Promise<void> => {
    try {
      const response = await api.delete<ApiResponse<void>>(`/api/videos/${id}`);
      extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
  
  /**
   * 重试视频处理
   */
  retryVideoProcessing: async (id: number): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>(`/api/videos/${id}/retry`);
      extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 生成视频分享链接
   */
  generateShareLink: async (id: number): Promise<ShareResponse> => {
    try {
      const response = await api.post<ApiResponse<ShareResponse>>(`/api/videos/${id}/share`);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 获取视频分享列表
   */
  getVideoShares: async (id: number): Promise<ShareResponse[]> => {
    try {
      const response = await api.get<ApiResponse<ShareResponse[]>>(`/api/videos/${id}/shares`);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 下载原视频
   */
  downloadVideo: async (id: number): Promise<void> => {
    try {
      // 先获取视频信息以获取原始文件名
      const videoInfo = await videoApi.getVideo(id);
      
      const response = await api.get(`/api/videos/${id}/download`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 优先使用视频信息中的原始文件名
      let filename = videoInfo.original_filename || `video_${id}.mp4`;
      
      // 如果响应头中有文件名，则使用响应头中的文件名
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// ========================
// 分片上传API
// ========================

export const chunkedUploadApi = {
  /**
   * 初始化分片上传
   */
  initChunkedUpload: async (request: InitChunkedUploadRequest): Promise<InitChunkedUploadResponse> => {
    try {
      const response = await api.post<ApiResponse<InitChunkedUploadResponse>>('/api/upload/init', request);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 上传分片
   */
  uploadChunk: async (
    uploadId: string,
    chunkNumber: number,
    chunkData: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadChunkResponse> => {
    try {
      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkNumber', chunkNumber.toString());
      formData.append('chunk', chunkData);

      const response = await api.post<ApiResponse<UploadChunkResponse>>('/api/upload/chunk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 完成上传
   */
  completeUpload: async (request: CompleteUploadRequest): Promise<VideoUploadResponse> => {
    try {
      const response = await api.post<ApiResponse<VideoUploadResponse>>('/api/upload/complete', request);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 获取上传状态
   */
  getUploadStatus: async (uploadId: string): Promise<UploadSession> => {
    try {
      const response = await api.get<ApiResponse<UploadSession>>(`/api/upload/status/${uploadId}`);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 取消上传
   */
  cancelUpload: async (uploadId: string): Promise<void> => {
    try {
      const response = await api.delete<ApiResponse<void>>(`/api/upload/${uploadId}`);
      extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 手动触发清理
   */
  manualCleanup: async (): Promise<unknown> => {
    try {
      const response = await api.post<ApiResponse<unknown>>('/api/upload/cleanup');
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 获取清理状态
   */
  getCleanupStatus: async (): Promise<unknown> => {
    try {
      const response = await api.get<ApiResponse<unknown>>('/api/upload/cleanup/status');
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// ========================
// HLS转换API
// ========================

export const hlsApi = {
  /**
   * 转换视频为HLS
   */
  convertVideo: async (id: number, options?: HLSConversionOptions): Promise<HLSConversionResponse> => {
    try {
      const response = await api.post<ApiResponse<HLSConversionResponse>>(`/api/hls/${id}/convert`, options || {});
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 获取转换状态
   */
  getConversionStatus: async (id: number): Promise<HLSStatusResponse> => {
    try {
      const response = await api.get<ApiResponse<HLSStatusResponse>>(`/api/hls/${id}/status`);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 重试转换
   */
  retryConversion: async (id: number, options?: HLSConversionOptions): Promise<HLSConversionResponse> => {
    try {
      const response = await api.post<ApiResponse<HLSConversionResponse>>(`/api/hls/${id}/retry`, options || {});
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// ========================
// 队列管理API
// ========================

export const queueApi = {
  /**
   * 获取队列状态
   */
  getQueueStatus: async (): Promise<QueueStatus> => {
    try {
      const response = await api.get<ApiResponse<QueueStatus>>('/api/queue/status');
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 获取视频队列状态
   */
  getVideoQueueStatus: async (id: number): Promise<QueueJob> => {
    try {
      const response = await api.get<ApiResponse<QueueJob>>(`/api/queue/video/${id}`);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 重试失败任务
   */
  retryFailedJob: async (jobId: number): Promise<QueueRetryResponse> => {
    try {
      const response = await api.post<ApiResponse<QueueRetryResponse>>(`/api/queue/retry/${jobId}`);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 设置最大并发数
   */
  setMaxConcurrent: async (maxConcurrent: number): Promise<QueueConfigResponse> => {
    try {
      const response = await api.post<ApiResponse<QueueConfigResponse>>('/api/queue/config/concurrency', {
        maxConcurrent
      });
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 清理已完成任务
   */
  cleanupCompletedJobs: async (keepCount: number = 100): Promise<{ keepCount: number }> => {
    try {
      const response = await api.post<ApiResponse<{ keepCount: number }>>('/api/queue/cleanup', {
        keepCount
      });
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// ========================
// 流媒体API
// ========================

export const streamApi = {
  /**
   * 获取HLS播放列表URL
   */
  getPlaylistUrl: (id: number): string => {
    return `${API_BASE_URL}/api/stream/${id}/playlist.m3u8`;
  },

  /**
   * 获取视频片段URL
   */
  getSegmentUrl: (id: number, segmentId: string): string => {
    return `${API_BASE_URL}/api/stream/${id}/segment_${segmentId}.ts`;
  }
};

// ========================
// 视频分享API
// ========================

export const shareApi = {
  /**
   * 切换分享状态
   */
  toggleShareStatus: async (shareId: number): Promise<void> => {
    try {
      const response = await api.put<ApiResponse<void>>(`/api/share/manage/shares/${shareId}/toggle`);
      extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 删除分享链接
   */
  deleteShare: async (shareId: number): Promise<void> => {
    try {
      const response = await api.delete<ApiResponse<void>>(`/api/share/manage/shares/${shareId}`);
      extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * 获取分享播放列表URL（无需认证）
   */
  getSharePlaylistUrl: (token: string): string => {
    return `${API_BASE_URL}/api/share/${token}/playlist.m3u8`;
  },

  /**
   * 获取分享视频片段URL（无需认证）
   */
  getShareSegmentUrl: (token: string, segmentId: string): string => {
    return `${API_BASE_URL}/api/share/${token}/segment_${segmentId}.ts`;
  },

  /**
   * 获取分享信息（无需认证）
   */
  getShareInfo: async (token: string): Promise<ShareInfo> => {
    try {
      // 临时创建一个不带认证的axios实例
      const publicApi = axios.create({
        baseURL: API_BASE_URL,
        timeout: 30000,
      });
      
      const response = await publicApi.get<ApiResponse<ShareInfo>>(`/api/share/${token}/info`);
      return extractApiData(response);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

// ========================
// 错误处理工具
// ========================

export { AppError, ErrorType, ErrorCode };

/**
 * 判断是否为网络错误
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof AppError && (
    error.type === ErrorType.NETWORK_ERROR || 
    error.type === ErrorType.TIMEOUT_ERROR
  );
}

/**
 * 判断是否为认证错误
 */
export function isAuthError(error: unknown): boolean {
  return error instanceof AppError && error.type === ErrorType.AUTHENTICATION_ERROR;
}

/**
 * 判断是否为验证错误
 */
export function isValidationError(error: unknown): boolean {
  return error instanceof AppError && error.type === ErrorType.VALIDATION_ERROR;
}

/**
 * 获取用户友好的错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return '发生未知错误，请稍后重试';
}

// 导出默认api实例
export default api;