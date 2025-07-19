const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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