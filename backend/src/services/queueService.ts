import { DatabaseManager } from '../database/init';
import { HLSService } from './hlsService';

export interface QueueJob {
  id: number;
  video_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  retry_count: number;
  max_retries: number;
  options?: any;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ConversionOptions {
  quality?: 'low' | 'medium' | 'high';
  resolution?: '480p' | '720p' | '1080p';
  bitrate?: string;
}

export class QueueService {
  private static instance: QueueService;
  private db: DatabaseManager;
  private hlsService: HLSService;
  private isProcessing = false;
  private maxConcurrent = parseInt(process.env.MAX_CONCURRENT || '1');
  private currentJobs = new Set<number>();
  private processingInterval?: NodeJS.Timeout;

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.hlsService = HLSService.getInstance();
    console.log(`Queue service initialized with maxConcurrent: ${this.maxConcurrent}`);
    this.startProcessing();
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * 添加视频转换任务到队列
   */
  public async addJob(
    videoId: number,
    options: ConversionOptions = {},
    priority: number = 0
  ): Promise<number> {
    try {
      // 检查是否已存在pending或processing的任务
      const existingJob = await this.db.get(
        'SELECT id FROM conversion_queue WHERE video_id = ? AND status IN (?, ?)',
        [videoId, 'pending', 'processing']
      );

      if (existingJob) {
        console.log(`Job already exists for video ${videoId}`);
        return existingJob.id;
      }

      // 创建新任务
      await this.db.run(
        `INSERT INTO conversion_queue (video_id, priority, options, status) 
         VALUES (?, ?, ?, ?)`,
        [videoId, priority, JSON.stringify(options), 'pending']
      );

      // 获取新创建的任务ID
      const newJob = await this.db.get(
        'SELECT id FROM conversion_queue WHERE video_id = ? ORDER BY created_at DESC LIMIT 1',
        [videoId]
      );

      console.log(`Added job ${newJob.id} for video ${videoId} to queue`);
      return newJob.id;
    } catch (error) {
      console.error('Error adding job to queue:', error);
      throw error;
    }
  }

  /**
   * 获取下一个待处理的任务
   */
  private async getNextJob(): Promise<QueueJob | null> {
    try {
      const job = await this.db.get(
        `SELECT * FROM conversion_queue 
         WHERE status = 'pending' 
         ORDER BY priority DESC, created_at ASC 
         LIMIT 1`
      );

      if (!job) return null;

      // 解析options
      if (job.options) {
        try {
          job.options = JSON.parse(job.options);
        } catch (e) {
          job.options = {};
        }
      }

      return job;
    } catch (error) {
      console.error('Error getting next job:', error);
      return null;
    }
  }

  /**
   * 更新任务状态
   */
  private async updateJobStatus(
    jobId: number,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      let sql = 'UPDATE conversion_queue SET status = ?';
      let params: any[] = [status];

      if (status === 'processing') {
        sql += ', started_at = CURRENT_TIMESTAMP';
      } else if (status === 'completed' || status === 'failed') {
        sql += ', completed_at = CURRENT_TIMESTAMP';
      }

      if (errorMessage) {
        sql += ', error_message = ?';
        params.push(errorMessage);
      }

      sql += ' WHERE id = ?';
      params.push(jobId);

      await this.db.run(sql, params);
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }

  /**
   * 增加重试次数
   */
  private async incrementRetryCount(jobId: number): Promise<void> {
    try {
      await this.db.run(
        'UPDATE conversion_queue SET retry_count = retry_count + 1 WHERE id = ?',
        [jobId]
      );
    } catch (error) {
      console.error('Error incrementing retry count:', error);
    }
  }

  /**
   * 处理单个任务
   */
  private async processJob(job: QueueJob): Promise<void> {
    console.log(`Processing job ${job.id} for video ${job.video_id}`);
    
    try {
      // 标记任务为处理中
      await this.updateJobStatus(job.id, 'processing');
      this.currentJobs.add(job.id);

      // 获取视频信息
      const video = await this.db.get(
        'SELECT * FROM videos WHERE id = ?',
        [job.video_id]
      );

      if (!video) {
        throw new Error(`Video ${job.video_id} not found`);
      }

      // 更新视频状态为处理中
      await this.db.run(
        'UPDATE videos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['processing', job.video_id]
      );

      // 执行HLS转换
      const result = await this.hlsService.processVideo(
        job.video_id,
        video.original_filepath,
        job.options || {}
      );

      // 更新视频信息
      await this.db.run(
        `UPDATE videos SET 
         status = ?, 
         hls_path = ?, 
         thumbnail_path = ?, 
         updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        ['completed', result.hlsPath, result.thumbnailPath, job.video_id]
      );

      // 标记任务完成
      await this.updateJobStatus(job.id, 'completed');
      console.log(`Job ${job.id} completed successfully`);

    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      
      // 增加重试次数
      await this.incrementRetryCount(job.id);
      
      // 检查是否可以重试
      if (job.retry_count < job.max_retries) {
        // 重置为pending状态以便重试
        await this.updateJobStatus(job.id, 'pending', String(error));
        console.log(`Job ${job.id} will be retried (${job.retry_count + 1}/${job.max_retries})`);
      } else {
        // 标记为失败
        await this.updateJobStatus(job.id, 'failed', String(error));
        await this.db.run(
          'UPDATE videos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['failed', job.video_id]
        );
        console.log(`Job ${job.id} failed permanently after ${job.max_retries} retries`);
      }
    } finally {
      this.currentJobs.delete(job.id);
    }
  }

  /**
   * 开始处理队列
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      if (this.currentJobs.size >= this.maxConcurrent) {
        return;
      }

      const job = await this.getNextJob();
      if (!job) {
        return;
      }

      // 异步处理任务
      this.processJob(job).catch(error => {
        console.error('Error processing job:', error);
      });
    }, 1000); // 每秒检查一次

    console.log('Queue processing started');
  }

  /**
   * 停止处理队列
   */
  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    console.log('Queue processing stopped');
  }

  /**
   * 获取队列状态
   */
  public async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    currentJobs: number;
  }> {
    try {
      const [pending, processing, completed, failed] = await Promise.all([
        this.db.get('SELECT COUNT(*) as count FROM conversion_queue WHERE status = ?', ['pending']),
        this.db.get('SELECT COUNT(*) as count FROM conversion_queue WHERE status = ?', ['processing']),
        this.db.get('SELECT COUNT(*) as count FROM conversion_queue WHERE status = ?', ['completed']),
        this.db.get('SELECT COUNT(*) as count FROM conversion_queue WHERE status = ?', ['failed'])
      ]);

      return {
        pending: pending.count,
        processing: processing.count,
        completed: completed.count,
        failed: failed.count,
        currentJobs: this.currentJobs.size
      };
    } catch (error) {
      console.error('Error getting queue status:', error);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        currentJobs: 0
      };
    }
  }

  /**
   * 获取特定视频的队列状态
   */
  public async getVideoQueueStatus(videoId: number): Promise<QueueJob | null> {
    try {
      const job = await this.db.get(
        'SELECT * FROM conversion_queue WHERE video_id = ? ORDER BY created_at DESC LIMIT 1',
        [videoId]
      );

      if (!job) return null;

      if (job.options) {
        try {
          job.options = JSON.parse(job.options);
        } catch (e) {
          job.options = {};
        }
      }

      return job;
    } catch (error) {
      console.error('Error getting video queue status:', error);
      return null;
    }
  }

  /**
   * 重试失败的任务
   */
  public async retryFailedJob(jobId: number): Promise<boolean> {
    try {
      const job = await this.db.get(
        'SELECT * FROM conversion_queue WHERE id = ? AND status = ?',
        [jobId, 'failed']
      );

      if (!job) {
        return false;
      }

      // 重置任务状态
      await this.db.run(
        `UPDATE conversion_queue SET 
         status = 'pending', 
         retry_count = 0, 
         error_message = NULL, 
         started_at = NULL, 
         completed_at = NULL 
         WHERE id = ?`,
        [jobId]
      );

      console.log(`Job ${jobId} reset for retry`);
      return true;
    } catch (error) {
      console.error('Error retrying failed job:', error);
      return false;
    }
  }

  /**
   * 清理已完成的任务（保留最近的N个）
   */
  public async cleanupCompletedJobs(keepCount: number = 100): Promise<void> {
    try {
      await this.db.run(
        `DELETE FROM conversion_queue 
         WHERE status = 'completed' 
         AND id NOT IN (
           SELECT id FROM conversion_queue 
           WHERE status = 'completed' 
           ORDER BY completed_at DESC 
           LIMIT ?
         )`,
        [keepCount]
      );
      console.log(`Cleaned up completed jobs, kept ${keepCount} recent ones`);
    } catch (error) {
      console.error('Error cleaning up completed jobs:', error);
    }
  }

  /**
   * 设置最大并发数
   */
  public setMaxConcurrent(maxConcurrent: number): void {
    this.maxConcurrent = Math.max(1, maxConcurrent);
    console.log(`Max concurrent jobs set to ${this.maxConcurrent}`);
  }
}