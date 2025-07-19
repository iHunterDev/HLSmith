import { httpClient, extractApiData } from '../lib/http';
import { 
  ApiResponse,
  InitChunkedUploadRequest,
  InitChunkedUploadResponse,
  UploadChunkResponse,
  UploadSession,
  CompleteUploadRequest,
  VideoUploadResponse
} from '../lib/types';

export const chunkedUploadApi = {
  /**
   * 初始化分片上传
   */
  initChunkedUpload: async (request: InitChunkedUploadRequest): Promise<InitChunkedUploadResponse> => {
    const response = await httpClient.post<ApiResponse<InitChunkedUploadResponse>>('/api/upload/init', request);
    return extractApiData(response);
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
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkNumber', chunkNumber.toString());
    formData.append('chunk', chunkData);

    const response = await httpClient.post<ApiResponse<UploadChunkResponse>>('/api/upload/chunk', formData, {
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
   * 完成上传
   */
  completeUpload: async (request: CompleteUploadRequest): Promise<VideoUploadResponse> => {
    const response = await httpClient.post<ApiResponse<VideoUploadResponse>>('/api/upload/complete', request);
    return extractApiData(response);
  },

  /**
   * 获取上传状态
   */
  getUploadStatus: async (uploadId: string): Promise<UploadSession> => {
    const response = await httpClient.get<ApiResponse<UploadSession>>(`/api/upload/status/${uploadId}`);
    return extractApiData(response);
  },


  /**
   * 取消上传
   */
  cancelUpload: async (uploadId: string): Promise<void> => {
    const response = await httpClient.delete<ApiResponse<void>>(`/api/upload/${uploadId}`);
    extractApiData(response);
  },

  /**
   * 手动触发清理
   */
  manualCleanup: async (): Promise<unknown> => {
    const response = await httpClient.post<ApiResponse<unknown>>('/api/upload/cleanup');
    return extractApiData(response);
  },

  /**
   * 获取清理状态
   */
  getCleanupStatus: async (): Promise<unknown> => {
    const response = await httpClient.get<ApiResponse<unknown>>('/api/upload/cleanup/status');
    return extractApiData(response);
  }
};