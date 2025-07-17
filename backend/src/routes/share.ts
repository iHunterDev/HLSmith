import { Router, Request, Response } from 'express';
import { authMiddleware } from '../utils/jwt';
import { DatabaseManager } from '../database/init';
import { VideoStatus } from '../models/Video';
import { ResponseHelper } from '../utils/response';
import { generateShareLink, getVideoShares, toggleShareStatus, deleteShare } from '../controllers/shareController';
import path from 'path';
import fs from 'fs';

const router: Router = Router();
const db = DatabaseManager.getInstance();

// 管理端点 - 需要认证
router.use('/manage', authMiddleware);

// 生成分享链接
router.post('/manage/:id/generate', generateShareLink);

// 获取视频的分享链接列表
router.get('/manage/:id/shares', getVideoShares);

// 切换分享链接状态
router.put('/manage/shares/:shareId/toggle', toggleShareStatus);

// 删除分享链接
router.delete('/manage/shares/:shareId', deleteShare);

// 公开分享端点 - 无需认证
// 分享播放列表
router.get('/:token/playlist.m3u8', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;

    if (!token) {
      return ResponseHelper.validationError(res, '分享令牌无效');
    }

    // 查找有效的分享记录
    const share = await db.get(
      `SELECT vs.*, v.hls_path, v.status 
       FROM video_shares vs 
       JOIN videos v ON vs.video_id = v.id 
       WHERE vs.access_token = ? AND vs.is_active = 1 AND v.status = ?`,
      [token, VideoStatus.COMPLETED]
    );

    if (!share) {
      return ResponseHelper.notFoundError(res, '分享链接无效或已失效');
    }

    // 检查HLS文件是否存在
    const playlistPath = share.hls_path;
    if (!fs.existsSync(playlistPath)) {
      return ResponseHelper.notFoundError(res, '播放列表文件不存在');
    }

    // 更新访问统计
    await db.run(
      'UPDATE video_shares SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE access_token = ?',
      [token]
    );

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'no-cache');

    // 读取并修改播放列表内容
    const playlistContent = fs.readFileSync(playlistPath, 'utf8');
    
    // Use BASE_URL environment variable if configured, otherwise use request info
    const baseUrl = process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/share/${token}/`
      : `${req.protocol}://${req.get('host')}/api/share/${token}/`;

    // 将相对分片路径替换为绝对URL
    const modifiedPlaylist = playlistContent.replace(
      /^segment_(\d+)\.ts$/gm,
      `${baseUrl}segment_$1.ts`
    );

    res.send(modifiedPlaylist);
  } catch (error) {
    console.error('Share playlist error:', error);
    ResponseHelper.internalError(res, '获取分享播放列表失败');
  }
});

// 分享视频分片
router.get('/:token/segment_:segmentId.ts', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const segmentId = req.params.segmentId;

    if (!token || !segmentId) {
      return ResponseHelper.validationError(res, '分享令牌或分片ID无效');
    }

    // 查找有效的分享记录
    const share = await db.get(
      `SELECT vs.*, v.hls_path, v.status 
       FROM video_shares vs 
       JOIN videos v ON vs.video_id = v.id 
       WHERE vs.access_token = ? AND vs.is_active = 1 AND v.status = ?`,
      [token, VideoStatus.COMPLETED]
    );

    if (!share) {
      return ResponseHelper.notFoundError(res, '分享链接无效或已失效');
    }

    // 构建分片文件路径
    const segmentPath = path.join(path.dirname(share.hls_path), `segment_${segmentId}.ts`);

    if (!fs.existsSync(segmentPath)) {
      return ResponseHelper.notFoundError(res, '视频分片不存在');
    }

    // 设置响应头
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年缓存

    // 流式传输分片文件
    const stream = fs.createReadStream(segmentPath);
    stream.pipe(res);
  } catch (error) {
    console.error('Share segment error:', error);
    ResponseHelper.internalError(res, '获取分享视频分片失败');
  }
});

// 获取分享信息（可选，用于前端显示）
router.get('/:token/info', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;

    if (!token) {
      return ResponseHelper.validationError(res, '分享令牌无效');
    }

    // 查找分享记录和视频信息
    const shareInfo = await db.get(
      `SELECT vs.created_at, vs.access_count, v.title, v.duration 
       FROM video_shares vs 
       JOIN videos v ON vs.video_id = v.id 
       WHERE vs.access_token = ? AND vs.is_active = 1 AND v.status = ?`,
      [token, VideoStatus.COMPLETED]
    );

    if (!shareInfo) {
      return ResponseHelper.notFoundError(res, '分享链接无效或已失效');
    }

    const responseData = {
      title: shareInfo.title,
      duration: shareInfo.duration,
      shared_at: shareInfo.created_at,
      view_count: shareInfo.access_count
    };

    ResponseHelper.success(res, responseData, '获取分享信息成功');
  } catch (error) {
    console.error('Get share info error:', error);
    ResponseHelper.internalError(res, '获取分享信息失败');
  }
});

export default router;