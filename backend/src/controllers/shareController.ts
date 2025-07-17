import { Response } from 'express';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../utils/jwt';
import { DatabaseManager } from '../database/init';
import { VideoStatus } from '../models/Video';
import { ResponseHelper } from '../utils/response';

const db = DatabaseManager.getInstance();

export interface ShareResponse {
  id: number;
  video_id: number;
  access_token: string;
  share_url: string;
  created_at: string;
  is_active: boolean;
  access_count: number;
}

export async function generateShareLink(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    // 验证用户拥有该视频且视频已完成转换
    const video = await db.get(
      'SELECT id, title, status FROM videos WHERE id = ? AND user_id = ? AND status = ?',
      [videoId, userId, VideoStatus.COMPLETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在或尚未完成转换');
    }

    // 总是生成新的分享链接，支持多个分享链接
    const shareToken = randomUUID();

    // 创建新的分享记录
    await db.run(
      'INSERT INTO video_shares (video_id, access_token) VALUES (?, ?)',
      [videoId, shareToken]
    );

    // 获取新创建的分享记录ID
    const newShare = await db.get(
      'SELECT id FROM video_shares WHERE access_token = ?',
      [shareToken]
    );
    const shareId = newShare.id;

    // 构建分享URL
    const shareUrl = `${req.protocol}://${req.get('host')}/api/share/${shareToken}/playlist.m3u8`;

    // 获取完整的分享信息
    const shareInfo = await db.get(
      'SELECT * FROM video_shares WHERE id = ?',
      [shareId]
    );

    const shareResponse: ShareResponse = {
      id: shareInfo.id,
      video_id: shareInfo.video_id,
      access_token: shareInfo.access_token,
      share_url: shareUrl,
      created_at: shareInfo.created_at,
      is_active: shareInfo.is_active,
      access_count: shareInfo.access_count
    };

    ResponseHelper.success(res, shareResponse, '生成分享链接成功');
  } catch (error) {
    console.error('Generate share link error:', error);
    ResponseHelper.internalError(res, '生成分享链接失败');
  }
}

export async function getVideoShares(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    // 验证用户拥有该视频
    const video = await db.get(
      'SELECT id FROM videos WHERE id = ? AND user_id = ?',
      [videoId, userId]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    // 获取该视频的所有分享链接
    const shares = await db.all(
      'SELECT * FROM video_shares WHERE video_id = ? ORDER BY created_at DESC',
      [videoId]
    );

    const shareResponses: ShareResponse[] = shares.map(share => ({
      id: share.id,
      video_id: share.video_id,
      access_token: share.access_token,
      share_url: `${req.protocol}://${req.get('host')}/api/share/${share.access_token}/playlist.m3u8`,
      created_at: share.created_at,
      is_active: share.is_active,
      access_count: share.access_count
    }));

    ResponseHelper.success(res, shareResponses, '获取分享链接列表成功');
  } catch (error) {
    console.error('Get video shares error:', error);
    ResponseHelper.internalError(res, '获取分享链接列表失败');
  }
}

export async function toggleShareStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const shareId = parseInt(req.params.shareId);
    if (!shareId) {
      return ResponseHelper.validationError(res, '分享ID无效');
    }

    // 验证用户拥有该分享链接
    const share = await db.get(
      `SELECT vs.*, v.user_id FROM video_shares vs 
       JOIN videos v ON vs.video_id = v.id 
       WHERE vs.id = ? AND v.user_id = ?`,
      [shareId, userId]
    );

    if (!share) {
      return ResponseHelper.notFoundError(res, '分享链接不存在');
    }

    // 切换活跃状态
    const newStatus = share.is_active ? 0 : 1;
    await db.run(
      'UPDATE video_shares SET is_active = ? WHERE id = ?',
      [newStatus, shareId]
    );

    ResponseHelper.successWithoutData(res, `分享链接已${newStatus ? '启用' : '禁用'}`);
  } catch (error) {
    console.error('Toggle share status error:', error);
    ResponseHelper.internalError(res, '切换分享状态失败');
  }
}

export async function deleteShare(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const shareId = parseInt(req.params.shareId);
    if (!shareId) {
      return ResponseHelper.validationError(res, '分享ID无效');
    }

    // 验证用户拥有该分享链接
    const share = await db.get(
      `SELECT vs.*, v.user_id FROM video_shares vs 
       JOIN videos v ON vs.video_id = v.id 
       WHERE vs.id = ? AND v.user_id = ?`,
      [shareId, userId]
    );

    if (!share) {
      return ResponseHelper.notFoundError(res, '分享链接不存在');
    }

    // 删除分享链接
    await db.run('DELETE FROM video_shares WHERE id = ?', [shareId]);

    ResponseHelper.successWithoutData(res, '分享链接删除成功');
  } catch (error) {
    console.error('Delete share error:', error);
    ResponseHelper.internalError(res, '删除分享链接失败');
  }
}