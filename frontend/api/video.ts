import { httpClient, extractApiData } from '../lib/http';
import { 
  ApiResponse, 
  Video, 
  VideoSearchOptions, 
  VideoUploadResponse,
  PaginationMeta,
  SearchMeta,
  ShareResponse,
  UploadProgressCallback
} from '../lib/types';

export const videoApi = {
  /**
   * 获取视频列表
   */
  getVideos: async (options: VideoSearchOptions = {}): Promise<{ videos: Video[]; pagination: PaginationMeta; search?: SearchMeta }> => {
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
    
    const response = await httpClient.get<ApiResponse<Video[]>>(`/api/videos?${params.toString()}`);
    
    const apiResponse = response.data;
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || '获取视频列表失败');
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
  },
  
  /**
   * 上传视频
   */
  uploadVideo: async (
    formData: FormData, 
    onProgress?: UploadProgressCallback
  ): Promise<VideoUploadResponse> => {
    const response = await httpClient.post<ApiResponse<VideoUploadResponse>>('/api/videos/upload', formData, {
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
  },
  
  /**
   * 获取视频详情
   */
  getVideo: async (id: number): Promise<Video> => {
    const response = await httpClient.get<ApiResponse<Video>>(`/api/videos/${id}`);
    return extractApiData(response);
  },

  /**
   * 获取视频状态
   */
  getVideoStatus: async (id: number): Promise<Video> => {
    const response = await httpClient.get<ApiResponse<Video>>(`/api/videos/${id}/status`);
    return extractApiData(response);
  },

  /**
   * 更新视频信息
   */
  updateVideo: async (id: number, data: { title: string }): Promise<Video> => {
    const response = await httpClient.put<ApiResponse<Video>>(`/api/videos/${id}`, data);
    return extractApiData(response);
  },
  
  /**
   * 删除视频
   */
  deleteVideo: async (id: number): Promise<void> => {
    const response = await httpClient.delete<ApiResponse<void>>(`/api/videos/${id}`);
    extractApiData(response);
  },
  
  /**
   * 重试视频处理
   */
  retryVideoProcessing: async (id: number): Promise<void> => {
    const response = await httpClient.post<ApiResponse<void>>(`/api/videos/${id}/retry`);
    extractApiData(response);
  },

  /**
   * 生成视频分享链接
   */
  generateShareLink: async (id: number): Promise<ShareResponse> => {
    const response = await httpClient.post<ApiResponse<ShareResponse>>(`/api/videos/${id}/share`);
    return extractApiData(response);
  },

  /**
   * 获取视频分享列表
   */
  getVideoShares: async (id: number): Promise<ShareResponse[]> => {
    const response = await httpClient.get<ApiResponse<ShareResponse[]>>(`/api/videos/${id}/shares`);
    return extractApiData(response);
  },

  /**
   * 下载原视频
   */
  downloadVideo: async (id: number): Promise<void> => {
    // 先获取视频信息以获取原始文件名
    const videoInfo = await videoApi.getVideo(id);
    
    const response = await httpClient.get(`/api/videos/${id}/download`, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data as BlobPart]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 优先使用视频信息中的原始文件名
    let filename = videoInfo.original_filename || `video_${id}.mp4`;
    
    // 如果响应头中有文件名，则使用响应头中的文件名
    const disposition = response.headers['content-disposition'];
    if (disposition) {
      const matches = disposition.match(/filename[^;=\\n]*=((['\"]).*?\\2|[^;\\n]*)/);
      if (matches && matches[1]) {
        filename = decodeURIComponent(matches[1].replace(/['\"]/g, ''));
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};