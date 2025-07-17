export interface UploadSession {
  id: string;
  user_id: number;
  filename: string;
  file_size: number;
  total_chunks: number;
  chunk_size: number;
  uploaded_chunks: number[];
  chunks_path: string;
  status: UploadSessionStatus;
  expires_at: string;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export enum UploadSessionStatus {
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface CreateUploadSessionData {
  id: string;
  user_id: number;
  filename: string;
  file_size: number;
  total_chunks: number;
  chunk_size: number;
  chunks_path: string;
  expires_at: string;
}

export interface UploadSessionResponse {
  id: string;
  filename: string;
  file_size: number;
  total_chunks: number;
  chunk_size: number;
  uploaded_chunks: number[];
  status: UploadSessionStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChunkUploadData {
  upload_id: string;
  chunk_number: number;
  chunk_data: Buffer;
  chunk_hash?: string;
}

export interface CompleteUploadData {
  upload_id: string;
  title: string;
  final_hash?: string;
}