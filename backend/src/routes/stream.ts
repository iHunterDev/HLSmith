import { Router, Request, Response } from 'express';
import { authMiddleware } from '../utils/jwt';
import { DatabaseManager } from '../database/init';
import { VideoStatus } from '../models/Video';
import { ResponseHelper, ErrorCode } from '../utils/response';
import path from 'path';
import fs from 'fs';

const router: Router = Router();
const db = DatabaseManager.getInstance();

// Stream HLS playlist (requires authentication)
router.get('/:id/playlist.m3u8', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const videoId = parseInt(req.params.id);

    if (!userId || !videoId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    // Check if user has access to this video
    const video = await db.get(
      'SELECT id, hls_path, status FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    if (video.status !== VideoStatus.COMPLETED || !video.hls_path) {
      return ResponseHelper.businessError(res, ErrorCode.VIDEO_NOT_READY, '视频尚未准备好播放');
    }

    // Read and serve the m3u8 file
    const playlistPath = video.hls_path;
    
    if (!fs.existsSync(playlistPath)) {
      return ResponseHelper.notFoundError(res, '播放列表文件不存在');
    }

    // Set proper headers for HLS
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'no-cache');

    // Read and modify playlist to use absolute URLs
    const playlistContent = fs.readFileSync(playlistPath, 'utf8');
    
    // Use BASE_URL environment variable if configured, otherwise use request info
    const baseUrl = process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/stream/${videoId}/`
      : `${req.protocol}://${req.get('host')}/api/stream/${videoId}/`;
    
    // Replace relative segment paths with absolute URLs
    const modifiedPlaylist = playlistContent.replace(
      /^segment_(\d+)\.ts$/gm,
      `${baseUrl}segment_$1.ts`
    );

    res.send(modifiedPlaylist);
  } catch (error) {
    console.error('Stream playlist error:', error);
    ResponseHelper.internalError(res, '获取播放列表失败');
  }
});

// Stream HLS segments (requires authentication)
router.get('/:id/segment_:segmentId.ts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const videoId = parseInt(req.params.id);
    const segmentId = req.params.segmentId;

    if (!userId || !videoId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    // Check if user has access to this video
    const video = await db.get(
      'SELECT id, hls_path, status FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    if (video.status !== VideoStatus.COMPLETED || !video.hls_path) {
      return ResponseHelper.businessError(res, ErrorCode.VIDEO_NOT_READY, '视频尚未准备好播放');
    }

    // Construct segment path
    const segmentPath = path.join(path.dirname(video.hls_path), `segment_${segmentId}.ts`);
    
    if (!fs.existsSync(segmentPath)) {
      return ResponseHelper.notFoundError(res, '视频片段不存在');
    }

    // Set proper headers for video segments
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Stream the segment file
    const stream = fs.createReadStream(segmentPath);
    stream.pipe(res);
  } catch (error) {
    console.error('Stream segment error:', error);
    ResponseHelper.internalError(res, '获取视频片段失败');
  }
});

export default router;