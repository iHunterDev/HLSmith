import axios from 'axios';
import { httpClient, extractApiData } from '../lib/http';
import { 
  ApiResponse,
  ShareResponse,
  ShareInfo
} from '../lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const shareApi = {
  /**
   * 生成分享链接 (管理端点)
   */
  generateShareLink: async (id: number): Promise<ShareResponse> => {
    const response = await httpClient.post<ApiResponse<ShareResponse>>(`/api/videos/${id}/share`);
    return extractApiData(response);
  },

  /**
   * 获取视频分享列表 (管理端点)
   */
  getVideoShares: async (id: number): Promise<ShareResponse[]> => {
    const response = await httpClient.get<ApiResponse<ShareResponse[]>>(`/api/videos/${id}/shares`);
    return extractApiData(response);
  },

  /**
   * 切换分享状态 (管理端点)
   */
  toggleShareStatus: async (shareId: number): Promise<void> => {
    const response = await httpClient.put<ApiResponse<void>>(`/api/share/manage/shares/${shareId}/toggle`);
    extractApiData(response);
  },

  /**
   * 删除分享链接 (管理端点)
   */
  deleteShare: async (shareId: number): Promise<void> => {
    const response = await httpClient.delete<ApiResponse<void>>(`/api/share/manage/shares/${shareId}`);
    extractApiData(response);
  },

  /**
   * 获取分享播放列表URL（公开端点）
   */
  getSharePlaylistUrl: (token: string): string => {
    return `${API_BASE_URL}/api/share/${token}/playlist.m3u8`;
  },

  /**
   * 获取分享视频片段URL（公开端点）
   */
  getShareSegmentUrl: (token: string, segmentId: string): string => {
    return `${API_BASE_URL}/api/share/${token}/segment_${segmentId}.ts`;
  },

  /**
   * 获取分享信息（公开端点，无需认证）
   */
  getShareInfo: async (token: string): Promise<ShareInfo> => {
    // 临时创建一个不带认证的axios实例
    const publicApi = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });
    
    const response = await publicApi.get<ApiResponse<ShareInfo>>(`/api/share/${token}/info`);
    return extractApiData(response);
  }
};