import { Router } from 'express';
import { authorizePlayback, getPlaybackPlaylist, getPlaybackSegment } from '../controllers/playbackController';

const router: Router = Router();

router.post('/authorize', authorizePlayback);
router.get('/stream/:token/playlist.m3u8', getPlaybackPlaylist);
router.get('/stream/:token/segment_:segmentId.ts', getPlaybackSegment);

export default router;
