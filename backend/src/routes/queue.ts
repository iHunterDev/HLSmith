import express, { Router } from 'express';
import { Response } from 'express';
import { AuthRequest, authMiddleware } from '../utils/jwt';
import { ResponseHelper, ErrorCode } from '../utils/response';

const router: Router = express.Router();

/**
 * 获取队列整体状态
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { QueueService } = await import('../services/queueService');
    const queueService = QueueService.getInstance();
    const status = await queueService.getQueueStatus();
    
    ResponseHelper.success(res, status, '获取队列状态成功');
  } catch (error) {
    console.error('Get queue status error:', error);
    ResponseHelper.internalError(res, '获取队列状态失败');
  }
});

/**
 * 获取特定视频的队列状态
 */
router.get('/video/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    const { QueueService } = await import('../services/queueService');
    const queueService = QueueService.getInstance();
    const jobStatus = await queueService.getVideoQueueStatus(videoId);
    
    if (!jobStatus) {
      return ResponseHelper.notFoundError(res, '未找到该视频的队列任务');
    }

    ResponseHelper.success(res, jobStatus, '获取视频队列状态成功');
  } catch (error) {
    console.error('Get video queue status error:', error);
    ResponseHelper.internalError(res, '获取视频队列状态失败');
  }
});

/**
 * 重试失败的任务
 */
router.post('/retry/:jobId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    if (!jobId) {
      return ResponseHelper.validationError(res, '任务ID无效');
    }

    const { QueueService } = await import('../services/queueService');
    const queueService = QueueService.getInstance();
    const success = await queueService.retryFailedJob(jobId);
    
    if (success) {
      const responseData = {
        jobId: jobId,
        status: 'retrying'
      };
      ResponseHelper.success(res, responseData, '任务重试已开始');
    } else {
      return ResponseHelper.businessError(
        res, 
        ErrorCode.QUEUE_FULL, 
        '重试任务失败，任务可能不存在或不是失败状态'
      );
    }
  } catch (error) {
    console.error('Retry job error:', error);
    ResponseHelper.internalError(res, '重试任务失败');
  }
});

/**
 * 设置最大并发数
 */
router.post('/config/concurrency', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { maxConcurrent } = req.body;
    
    if (!maxConcurrent || maxConcurrent < 1 || maxConcurrent > 10) {
      return ResponseHelper.validationError(res, '最大并发数必须在1-10之间', {
        field: 'maxConcurrent',
        range: '1-10'
      });
    }

    const { QueueService } = await import('../services/queueService');
    const queueService = QueueService.getInstance();
    queueService.setMaxConcurrent(maxConcurrent);
    
    const responseData = {
      maxConcurrent: maxConcurrent
    };
    
    ResponseHelper.success(res, responseData, '最大并发数更新成功');
  } catch (error) {
    console.error('Set max concurrent error:', error);
    ResponseHelper.internalError(res, '设置最大并发数失败');
  }
});

/**
 * 清理已完成的任务
 */
router.post('/cleanup', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { keepCount = 100 } = req.body;
    
    if (keepCount < 1 || keepCount > 1000) {
      return ResponseHelper.validationError(res, '保留任务数量必须在1-1000之间', {
        field: 'keepCount',
        range: '1-1000'
      });
    }

    const { QueueService } = await import('../services/queueService');
    const queueService = QueueService.getInstance();
    await queueService.cleanupCompletedJobs(keepCount);
    
    const responseData = {
      keepCount: keepCount
    };
    
    ResponseHelper.success(res, responseData, '任务清理完成');
  } catch (error) {
    console.error('Cleanup error:', error);
    ResponseHelper.internalError(res, '任务清理失败');
  }
});

export default router;