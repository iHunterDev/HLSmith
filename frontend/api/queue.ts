import { httpClient, extractApiData } from '../lib/http';
import { 
  ApiResponse,
  QueueStatus,
  QueueJob,
  QueueRetryResponse,
  QueueConfigResponse
} from '../lib/types';

export const queueApi = {
  /**
   * 获取队列状态
   */
  getQueueStatus: async (): Promise<QueueStatus> => {
    const response = await httpClient.get<ApiResponse<QueueStatus>>('/api/queue/status');
    return extractApiData(response);
  },

  /**
   * 获取视频队列状态
   */
  getVideoQueueStatus: async (id: number): Promise<QueueJob> => {
    const response = await httpClient.get<ApiResponse<QueueJob>>(`/api/queue/video/${id}`);
    return extractApiData(response);
  },

  /**
   * 重试失败任务
   */
  retryFailedJob: async (jobId: number): Promise<QueueRetryResponse> => {
    const response = await httpClient.post<ApiResponse<QueueRetryResponse>>(`/api/queue/retry/${jobId}`);
    return extractApiData(response);
  },

  /**
   * 设置最大并发数
   */
  setMaxConcurrent: async (maxConcurrent: number): Promise<QueueConfigResponse> => {
    const response = await httpClient.post<ApiResponse<QueueConfigResponse>>('/api/queue/config/concurrency', {
      maxConcurrent
    });
    return extractApiData(response);
  },

  /**
   * 清理已完成任务
   */
  cleanupCompletedJobs: async (keepCount: number = 100): Promise<{ keepCount: number }> => {
    const response = await httpClient.post<ApiResponse<{ keepCount: number }>>('/api/queue/cleanup', {
      keepCount
    });
    return extractApiData(response);
  }
};