export interface WatchSession {
  id: number;
  viewer_key: string;
  collection_item_id: number;
  video_id: number;
  total_seconds: number;
  last_heartbeat_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWatchSessionData {
  viewer_key: string;
  collection_item_id: number;
  video_id: number;
  total_seconds?: number;
  last_heartbeat_at?: string | null;
}

export interface WatchSummaryItem {
  collection_item_id: number;
  video_id: number;
  total_seconds: number;
}

export interface WatchSummaryCollection {
  collection_id: number;
  total_seconds: number;
}

export interface WatchSummaryResponse {
  total_seconds: number;
  collections: WatchSummaryCollection[];
  items: WatchSummaryItem[];
}
