import { Router } from 'express';
import { authMiddleware } from '../utils/jwt';
import { chunkUpload, handleChunkUploadError } from '../middleware/chunkUpload';
import {
  initChunkedUpload,
  uploadChunk,
  completeUpload,
  getUploadStatus,
  cancelUpload,
  syncUploadStatus
} from '../controllers/chunkedUploadController';
import { uploadCleanupService } from '../services/uploadCleanupService';
import { ResponseHelper } from '../utils/response';

const router: Router = Router();

router.use(authMiddleware);

router.post('/init', initChunkedUpload);

router.post('/chunk', chunkUpload.single('chunk'), handleChunkUploadError, uploadChunk);

router.post('/complete', completeUpload);

router.get('/status/:uploadId', getUploadStatus);

router.post('/sync/:uploadId', syncUploadStatus);

router.delete('/:uploadId', cancelUpload);

router.post('/cleanup', async (req, res) => {
  try {
    const result = await uploadCleanupService.runCleanup();
    ResponseHelper.success(res, result, '清理完成');
  } catch (error) {
    console.error('Manual cleanup failed:', error);
    ResponseHelper.internalError(res, '清理失败');
  }
});

router.get('/cleanup/status', async (req, res) => {
  try {
    const stats = await uploadCleanupService.getCleanupStats();
    ResponseHelper.success(res, stats, '获取清理状态成功');
  } catch (error) {
    console.error('Get cleanup status failed:', error);
    ResponseHelper.internalError(res, '获取清理状态失败');
  }
});

export default router;