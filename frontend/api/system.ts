import { httpClient, extractApiData } from '../lib/http';
import { 
  ApiResponse,
  HealthCheckResponse,
  ServerStatusResponse
} from '../lib/types';

export const systemApi = {
  /**
   * 获取服务器状态
   */
  getServerStatus: async (): Promise<ServerStatusResponse> => {
    const response = await httpClient.get<ApiResponse<ServerStatusResponse>>('/');
    return extractApiData(response);
  },

  /**
   * 健康检查
   */
  healthCheck: async (): Promise<HealthCheckResponse> => {
    const response = await httpClient.get<ApiResponse<HealthCheckResponse>>('/api/health');
    return extractApiData(response);
  }
};