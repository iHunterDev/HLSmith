import { httpClient, extractApiData } from '../lib/http';
import type { ApiResponse, WatchSummaryResponse } from '../lib/types';

export const watchApi = {
  /**
   * 获取学习时长汇总
   */
  getWatchSummary: async (viewerKey: string): Promise<WatchSummaryResponse> => {
    const response = await httpClient.get<ApiResponse<WatchSummaryResponse>>(
      `/api/watch/summary?viewer_key=${encodeURIComponent(viewerKey)}`
    );
    return extractApiData(response);
  },
};
