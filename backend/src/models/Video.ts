export interface Video {
  id: number;
  user_id: number;
  title: string;
  original_filename: string;
  original_filepath: string;
  hls_path?: string;
  duration?: number;
  file_size: number;
  status: VideoStatus;
  conversion_progress: number;
  thumbnail_path?: string;
  created_at: string;
  updated_at: string;
}

export enum VideoStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELETED = 'deleted'
}

export interface CreateVideoData {
  user_id: number;
  title: string;
  original_filename: string;
  original_filepath: string;
  file_size: number;
}

export interface VideoResponse {
  id: number;
  title: string;
  original_filename: string;
  duration?: number;
  file_size: number;
  status: VideoStatus;
  conversion_progress: number;
  thumbnail_url?: string;
  hls_url?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoListResponse {
  videos: VideoResponse[];
  total: number;
  page: number;
  limit: number;
}