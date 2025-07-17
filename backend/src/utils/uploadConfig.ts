import path from 'path';

export const UPLOAD_CONFIG = {
  // Chunk configuration
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB per chunk
  MAX_CONCURRENT: 3, // Maximum concurrent uploads
  MAX_RETRIES: 3, // Maximum retry attempts per chunk
  CHUNK_TIMEOUT: 30000, // 30s timeout per chunk
  
  // Cleanup configuration
  SESSION_EXPIRE_HOURS: 24, // Sessions expire after 24 hours
  CLEANUP_INTERVAL_MINUTES: 60, // Run cleanup every hour
  TEMP_FILE_EXPIRE_HOURS: 1, // Temporary files expire after 1 hour
  
  // Storage paths
  STORAGE_BASE: process.env.STORAGE_PATH || './storage',
  get CHUNKS_DIR() { return path.join(this.STORAGE_BASE, 'chunks'); },
  get TEMP_DIR() { return path.join(this.STORAGE_BASE, 'temp'); },
  get UPLOADS_DIR() { return path.join(this.STORAGE_BASE, 'uploads'); },
  
  // File limits
  MAX_FILE_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE || '2147483648'), // 2GB default
  MIN_CHUNK_SIZE: 1024 * 1024, // 1MB minimum
  MAX_CHUNK_SIZE: 10 * 1024 * 1024, // 10MB maximum
  
  // Supported video formats
  SUPPORTED_MIMETYPES: [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/mkv',
    'video/x-matroska',
    'application/octet-stream'
  ],
  
  SUPPORTED_EXTENSIONS: [
    '.mp4', '.avi', '.mov', '.webm', '.mkv', '.m4v', '.3gp', '.flv'
  ]
};

export function getChunkPath(uploadId: string, date?: Date): string {
  const currentDate = date || new Date();
  const year = currentDate.getFullYear().toString();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  return path.join(UPLOAD_CONFIG.CHUNKS_DIR, year, month, uploadId);
}

export function getChunkFilePath(uploadId: string, chunkNumber: number): string {
  return path.join(getChunkPath(uploadId), `chunk_${chunkNumber.toString().padStart(6, '0')}`);
}

export function getTempFilePath(uploadId: string, filename: string, date?: Date): string {
  const currentDate = date || new Date();
  const year = currentDate.getFullYear().toString();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  return path.join(UPLOAD_CONFIG.TEMP_DIR, year, month, `${uploadId}_${filename}`);
}

export function getFinalFilePath(filename: string, date?: Date): string {
  const currentDate = date || new Date();
  const year = currentDate.getFullYear().toString();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  return path.join(UPLOAD_CONFIG.UPLOADS_DIR, year, month, filename);
}

export function calculateTotalChunks(fileSize: number, chunkSize: number = UPLOAD_CONFIG.CHUNK_SIZE): number {
  return Math.ceil(fileSize / chunkSize);
}

export function getSessionExpireTime(): string {
  const expireTime = new Date();
  expireTime.setHours(expireTime.getHours() + UPLOAD_CONFIG.SESSION_EXPIRE_HOURS);
  return expireTime.toISOString();
}

export function getHLSPath(videoId: string, date?: Date): string {
  const currentDate = date || new Date();
  const year = currentDate.getFullYear().toString();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  return path.join(UPLOAD_CONFIG.STORAGE_BASE, 'hls', year, month, videoId);
}

export function getThumbnailPath(videoId: string, date?: Date): string {
  const currentDate = date || new Date();
  const year = currentDate.getFullYear().toString();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  return path.join(UPLOAD_CONFIG.STORAGE_BASE, 'thumbnails', year, month, videoId);
}

export function getDatePath(date?: Date): { year: string, month: string } {
  const currentDate = date || new Date();
  return {
    year: currentDate.getFullYear().toString(),
    month: (currentDate.getMonth() + 1).toString().padStart(2, '0')
  };
}