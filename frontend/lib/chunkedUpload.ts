import { 
  ChunkedUploadOptions, 
  ChunkedUploadProgress, 
  ChunkUploadInfo, 
  InitChunkedUploadRequest,
  InitChunkedUploadResponse,
  UploadChunkResponse,
  UploadSessionStatus,
  UploadSession,
  ResumeUploadInfo
} from './types';
import { chunkedUploadApi } from '../api/upload';

const DEFAULT_OPTIONS: Required<ChunkedUploadOptions> = {
  chunkSize: 5 * 1024 * 1024, // 5MB
  maxConcurrent: 3,
  maxRetries: 3,
  timeout: 30000,
  onProgress: () => {},
  onChunkProgress: () => {},
  onError: () => {}
};

export class ChunkedUploadManager {
  private file: File;
  private title: string;
  private options: Required<ChunkedUploadOptions>;
  private uploadId: string | null = null;
  private chunks: Blob[] = [];
  private chunkInfos: Map<number, ChunkUploadInfo> = new Map();
  private uploadedChunks: Set<number> = new Set();
  private activeUploads: Map<number, AbortController> = new Map();
  private startTime: number = 0;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;

  constructor(file: File, title: string, options: ChunkedUploadOptions = {}) {
    this.file = file;
    this.title = title;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public async start(): Promise<void> {
    try {
      this.startTime = Date.now();
      this.isPaused = false;
      this.isCancelled = false;

      // Initialize chunked upload
      await this.initializeUpload();

      // Split file into chunks
      this.splitFileIntoChunks();

      // Start uploading chunks
      await this.uploadChunks();

      // Verify all chunks are uploaded before completing
      const totalChunks = this.chunks.length;
      const uploadedCount = this.uploadedChunks.size;
      
      if (uploadedCount !== totalChunks) {
        const missingChunks = Array.from({length: totalChunks}, (_, i) => i)
          .filter(i => !this.uploadedChunks.has(i));
        throw new Error(`Upload incomplete: ${uploadedCount}/${totalChunks} chunks uploaded. Missing chunks: ${missingChunks.slice(0, 10).join(', ')}${missingChunks.length > 10 ? '...' : ''}`);
      }

      // Complete upload
      await this.completeUpload();

    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  public async resume(resumeInfo: ResumeUploadInfo): Promise<void> {
    try {
      this.uploadId = resumeInfo.uploadId;
      this.title = resumeInfo.title;
      this.file = resumeInfo.file;
      this.startTime = Date.now();
      this.isPaused = false;
      this.isCancelled = false;

      // Load existing upload session
      this.uploadedChunks = new Set(resumeInfo.session.uploaded_chunks);
      
      // Split file into chunks
      this.splitFileIntoChunks();

      // Resume uploading remaining chunks
      await this.uploadChunks();

      // Complete upload
      await this.completeUpload();

    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  public pause(): void {
    this.isPaused = true;
    this.activeUploads.forEach(controller => controller.abort());
    this.activeUploads.clear();
  }

  public async cancel(): Promise<void> {
    try {
      this.isCancelled = true;
      this.isPaused = true;
      
      // Abort all active uploads
      this.activeUploads.forEach(controller => controller.abort());
      this.activeUploads.clear();

      // Cancel upload session on server
      if (this.uploadId) {
        await this.cancelUploadSession();
      }
    } catch (error) {
      console.error('Error cancelling upload:', error);
    }
  }

  public getProgress(): ChunkedUploadProgress {
    const uploadedCount = this.uploadedChunks.size;
    const totalChunks = this.chunks.length;
    const progress = totalChunks > 0 ? (uploadedCount / totalChunks) * 100 : 0;
    
    const elapsed = Date.now() - this.startTime;
    const speed = elapsed > 0 ? (uploadedCount * this.options.chunkSize) / (elapsed / 1000) : 0;
    const eta = speed > 0 ? ((totalChunks - uploadedCount) * this.options.chunkSize) / speed : 0;

    return {
      uploadId: this.uploadId || '',
      filename: this.file.name,
      fileSize: this.file.size,
      totalChunks,
      uploadedChunks: uploadedCount,
      progress: Math.round(progress),
      speed: Math.round(speed),
      eta: Math.round(eta),
      status: this.isCancelled ? UploadSessionStatus.CANCELLED : 
              this.isPaused ? UploadSessionStatus.UPLOADING : 
              progress === 100 ? UploadSessionStatus.COMPLETED : UploadSessionStatus.UPLOADING
    };
  }

  private async initializeUpload(): Promise<void> {
    const request: InitChunkedUploadRequest = {
      filename: this.file.name,
      fileSize: this.file.size,
      chunkSize: this.options.chunkSize
    };

    const uploadSession: InitChunkedUploadResponse = await chunkedUploadApi.initChunkedUpload(request);
    this.uploadId = uploadSession.id;
    this.uploadedChunks = new Set(uploadSession.uploaded_chunks);
  }

  private splitFileIntoChunks(): void {
    this.chunks = [];
    this.chunkInfos.clear();
    
    const chunkSize = this.options.chunkSize;
    const totalChunks = Math.ceil(this.file.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, this.file.size);
      const chunk = this.file.slice(start, end);
      
      this.chunks.push(chunk);
      this.chunkInfos.set(i, {
        chunkNumber: i,
        status: this.uploadedChunks.has(i) ? 'completed' : 'pending',
        progress: this.uploadedChunks.has(i) ? 100 : 0,
        retryCount: 0
      });
    }
  }

  private async uploadChunks(): Promise<void> {
    const pendingChunks = Array.from(this.chunkInfos.keys())
      .filter(i => !this.uploadedChunks.has(i));

    if (pendingChunks.length === 0) {
      return;
    }

    const semaphore = new Semaphore(this.options.maxConcurrent);
    const uploadPromises = pendingChunks.map(chunkNumber => 
      semaphore.acquire().then(() => 
        this.uploadChunk(chunkNumber)
          .catch(error => {
            console.error(`Failed to upload chunk ${chunkNumber}:`, error);
            // Don't throw error here, let individual chunks fail
            return null;
          })
          .finally(() => semaphore.release())
      )
    );

    await Promise.allSettled(uploadPromises);
    
    // Check if all chunks were uploaded successfully
    const failedChunks = Array.from(this.chunkInfos.entries())
      .filter(([chunkNumber, info]) => 
        !this.uploadedChunks.has(chunkNumber) && info.status === 'failed'
      )
      .map(([chunkNumber]) => chunkNumber);
    
    if (failedChunks.length > 0) {
      throw new Error(`Failed to upload ${failedChunks.length} chunks: ${failedChunks.slice(0, 5).join(', ')}${failedChunks.length > 5 ? '...' : ''}`);
    }
  }

  private async uploadChunk(chunkNumber: number): Promise<void> {
    if (this.isPaused || this.isCancelled) {
      return;
    }

    const chunkInfo = this.chunkInfos.get(chunkNumber);
    if (!chunkInfo || chunkInfo.status === 'completed') {
      return;
    }

    const controller = new AbortController();
    this.activeUploads.set(chunkNumber, controller);

    try {
      chunkInfo.status = 'uploading';
      this.options.onChunkProgress(chunkInfo);

      const chunkFile = new File([this.chunks[chunkNumber]], `chunk_${chunkNumber}`);
      
      // Note: We can't pass AbortController signal through our API wrapper for now
      // This is a limitation that could be addressed in future improvements
      await chunkedUploadApi.uploadChunk(
        this.uploadId!,
        chunkNumber,
        chunkFile,
        (progress) => {
          chunkInfo.progress = progress;
          this.options.onChunkProgress(chunkInfo);
        }
      );
      this.uploadedChunks.add(chunkNumber);
      
      chunkInfo.status = 'completed';
      chunkInfo.progress = 100;
      this.options.onChunkProgress(chunkInfo);

      // Update overall progress
      this.options.onProgress(this.getProgress());

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      chunkInfo.status = 'failed';
      chunkInfo.error = (error as Error).message;
      chunkInfo.retryCount++;

      if (chunkInfo.retryCount < this.options.maxRetries) {
        // Retry after delay
        await new Promise(resolve => setTimeout(resolve, 1000 * chunkInfo.retryCount));
        return this.uploadChunk(chunkNumber);
      } else {
        // Max retries reached, mark as failed and continue
        this.options.onChunkProgress(chunkInfo);
        console.error(`Chunk ${chunkNumber} failed after ${this.options.maxRetries} retries:`, error);
        throw error;
      }
    } finally {
      this.activeUploads.delete(chunkNumber);
    }
  }

  private async completeUpload(): Promise<void> {
    if (!this.uploadId) {
      throw new Error('No upload session');
    }

    await chunkedUploadApi.completeUpload({
      uploadId: this.uploadId,
      title: this.title
    });

    // Final progress update
    this.options.onProgress(this.getProgress());
  }

  private async cancelUploadSession(): Promise<void> {
    if (!this.uploadId) {
      return;
    }

    try {
      await chunkedUploadApi.cancelUpload(this.uploadId);
    } catch (error) {
      console.error('Error cancelling upload session:', error);
    }
  }

  private handleError(error: Error): void {
    console.error('Chunked upload error:', error);
    this.options.onError(error);
  }
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) {
        this.permits--;
        next();
      }
    }
  }
}

// Utility functions
export async function getUploadSession(uploadId: string): Promise<UploadSession> {
  return await chunkedUploadApi.getUploadStatus(uploadId);
}

export async function cancelUploadSession(uploadId: string): Promise<void> {
  return await chunkedUploadApi.cancelUpload(uploadId);
}