import { Response } from 'express';
import { AuthRequest } from '../utils/jwt';
import { DatabaseManager } from '../database/init';
import { VideoStatus } from '../models/Video';
import hlsService, { ConversionOptions } from '../services/hlsService';
import { ResponseHelper, ErrorCode } from '../utils/response';
import { StorageUtils } from '../utils/storageUtils';

const db = DatabaseManager.getInstance();

export async function convertVideo(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    // Get video info
    const video = await db.get(
      'SELECT id, original_filepath, status FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    // Check if video is already being processed or completed
    if (video.status === VideoStatus.PROCESSING) {
      return ResponseHelper.businessError(res, ErrorCode.VIDEO_ALREADY_PROCESSING, '视频正在处理中');
    }

    if (video.status === VideoStatus.COMPLETED) {
      return ResponseHelper.businessError(res, ErrorCode.VIDEO_ALREADY_PROCESSING, '视频已经转换完成');
    }

    // Parse conversion options
    const options: ConversionOptions = {
      quality: req.body.quality || 'medium',
      resolution: req.body.resolution || '720p'
    };

    // Add job to queue
    const { QueueService } = await import('../services/queueService');
    const queueService = QueueService.getInstance();
    const jobId = await queueService.addJob(videoId, options, 1);

    const responseData = {
      videoId: videoId,
      jobId: jobId,
      status: 'queued'
    };

    ResponseHelper.success(res, responseData, '视频转换已加入队列');
  } catch (error) {
    console.error('Convert video error:', error);
    ResponseHelper.internalError(res, '视频转换失败');
  }
}

export async function getConversionStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    // Get video status
    const video = await db.get(
      'SELECT id, status, conversion_progress, hls_path, thumbnail_path FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    // Get queue job status
    const { QueueService } = await import('../services/queueService');
    const queueService = QueueService.getInstance();
    const queueJob = await queueService.getVideoQueueStatus(videoId);

    const responseData = {
      videoId: video.id,
      status: video.status,
      progress: video.conversion_progress,
      hlsUrl: StorageUtils.buildHlsUrl(video.hls_path, video.id, req),
      thumbnailUrl: StorageUtils.buildThumbnailUrl(video.thumbnail_path, req),
      queueJob: queueJob ? {
        id: queueJob.id,
        status: queueJob.status,
        priority: queueJob.priority,
        retryCount: queueJob.retry_count,
        maxRetries: queueJob.max_retries,
        errorMessage: queueJob.error_message,
        createdAt: queueJob.created_at,
        startedAt: queueJob.started_at,
        completedAt: queueJob.completed_at
      } : null
    };

    ResponseHelper.success(res, responseData, '获取转换状态成功');
  } catch (error) {
    console.error('Get conversion status error:', error);
    ResponseHelper.internalError(res, '获取转换状态失败');
  }
}

export async function retryConversion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    // Get video info
    const video = await db.get(
      'SELECT id, original_filepath, status FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    // Only allow retry for failed conversions
    if (video.status !== VideoStatus.FAILED) {
      return ResponseHelper.businessError(res, ErrorCode.VIDEO_ALREADY_PROCESSING, '只能重试失败的转换任务');
    }

    // Parse conversion options
    const options: ConversionOptions = {
      quality: req.body.quality || 'medium',
      resolution: req.body.resolution || '720p'
    };

    // Get the latest queue job for this video
    const { QueueService } = await import('../services/queueService');
    const queueService = QueueService.getInstance();
    const queueJob = await queueService.getVideoQueueStatus(videoId);
    
    let responseData;
    
    if (queueJob && queueJob.status === 'failed') {
      // Retry the failed job
      const retrySuccess = await queueService.retryFailedJob(queueJob.id);
      
      if (retrySuccess) {
        responseData = {
          videoId: videoId,
          jobId: queueJob.id,
          status: 'queued'
        };
        ResponseHelper.success(res, responseData, '视频转换重试已开始');
      } else {
        return ResponseHelper.businessError(res, ErrorCode.QUEUE_FULL, '重试任务失败');
      }
    } else {
      // Create new job
      const jobId = await queueService.addJob(videoId, options, 1);
      
      responseData = {
        videoId: videoId,
        jobId: jobId,
        status: 'queued'
      };
      ResponseHelper.success(res, responseData, '视频转换重试已开始');
    }
  } catch (error) {
    console.error('Retry conversion error:', error);
    ResponseHelper.internalError(res, '重试转换失败');
  }
}