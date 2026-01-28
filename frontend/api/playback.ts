import { httpClient, extractApiData } from '../lib/http';
import type { ApiResponse, PlaybackAuthorizeRequest, PlaybackAuthorizeResponse } from '../lib/types';

export const playbackApi = {
  /**
   * 播放授权
   */
  authorizePlayback: async (data: PlaybackAuthorizeRequest): Promise<PlaybackAuthorizeResponse> => {
    const response = await httpClient.post<ApiResponse<PlaybackAuthorizeResponse>>('/api/playback/authorize', data);
    return extractApiData(response);
  },
};
