import { Router } from 'express';
import { authMiddleware } from '../utils/jwt';
import { convertVideo, getConversionStatus, retryConversion } from '../controllers/hlsController';

const router: Router = Router();

// All HLS routes require authentication
router.use(authMiddleware);

// Convert video to HLS
router.post('/:id/convert', convertVideo);

// Get conversion status
router.get('/:id/status', getConversionStatus);

// Retry failed conversion
router.post('/:id/retry', retryConversion);

export default router;