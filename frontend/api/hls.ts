import { httpClient, extractApiData } from '../lib/http';
import { 
  ApiResponse,
  HLSConversionOptions,
  HLSConversionResponse,
  HLSStatusResponse
} from '../lib/types';

export const hlsApi = {
  /**
   * 转换视频为HLS
   */
  convertVideo: async (id: number, options?: HLSConversionOptions): Promise<HLSConversionResponse> => {
    const response = await httpClient.post<ApiResponse<HLSConversionResponse>>(`/api/hls/${id}/convert`, options || {});
    return extractApiData(response);
  },

  /**
   * 获取转换状态
   */
  getConversionStatus: async (id: number): Promise<HLSStatusResponse> => {
    const response = await httpClient.get<ApiResponse<HLSStatusResponse>>(`/api/hls/${id}/status`);
    return extractApiData(response);
  },

  /**
   * 重试转换
   */
  retryConversion: async (id: number, options?: HLSConversionOptions): Promise<HLSConversionResponse> => {
    const response = await httpClient.post<ApiResponse<HLSConversionResponse>>(`/api/hls/${id}/retry`, options || {});
    return extractApiData(response);
  }
};