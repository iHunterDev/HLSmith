import { Router } from 'express';
import { upload, handleMulterError } from '../middleware/upload';
import { authMiddleware } from '../utils/jwt';
import { uploadVideo, getVideos, getVideo, deleteVideo, updateVideo, retryVideoProcessing, downloadVideo } from '../controllers/videoController';

const router: Router = Router();

// All video routes require authentication
router.use(authMiddleware);

// Video upload
router.post('/upload', upload.single('video'), handleMulterError, uploadVideo);

// Get user's videos (with pagination)
router.get('/', getVideos);

// Get specific video
router.get('/:id', getVideo);

// Get video status (same as getVideo, but for clarity)
router.get('/:id/status', getVideo);

// Update video (title only for now)
router.put('/:id', updateVideo);

// Delete video
router.delete('/:id', deleteVideo);

// Retry video processing
router.post('/:id/retry', retryVideoProcessing);

// Download original video
router.get('/:id/download', downloadVideo);

// Generate share link
router.post('/:id/share', async (req, res) => {
  const { generateShareLink } = await import('../controllers/shareController');
  return generateShareLink(req, res);
});

// Get video shares
router.get('/:id/shares', async (req, res) => {
  const { getVideoShares } = await import('../controllers/shareController');
  return getVideoShares(req, res);
});

export default router;