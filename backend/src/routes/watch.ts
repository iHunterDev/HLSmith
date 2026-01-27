import { Router } from 'express';
import { sendHeartbeat, getWatchSummary } from '../controllers/watchController';

const router: Router = Router();

router.post('/heartbeat', sendHeartbeat);
router.get('/summary', getWatchSummary);

export default router;
