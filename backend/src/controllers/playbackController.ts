import { Request, Response } from 'express';
import crypto from 'node:crypto';

import { DatabaseManager } from '../database/init';
import { ResponseHelper, ErrorCode, ErrorType } from '../utils/response';
import { authorizePlayback as authorizePlaybackCheck } from '../utils/authorizePlayback';
import { isPlayableWindow } from '../utils/playableWindow';
import { VideoStatus } from '../models/Video';
import path from 'path';
import fs from 'fs';

const db = DatabaseManager.getInstance();

export async function authorizePlayback(req: Request, res: Response): Promise<void> {
  try {
    const { viewer_key, collection_item_id } = req.body || {};
    if (!viewer_key || !collection_item_id) {
      return ResponseHelper.validationError(res, 'viewer_key 或 collection_item_id 缺失');
    }

    const itemId = Number(collection_item_id);
    if (!Number.isFinite(itemId)) {
      return ResponseHelper.validationError(res, 'collection_item_id 无效');
    }

    const sharedSecret = process.env.VIEWER_KEY_SECRET || process.env.JWT_SECRET;
    if (!sharedSecret) {
      return ResponseHelper.internalError(res, '缺少 viewer_key 校验密钥');
    }

    const item = await db.get(
      `SELECT id, collection_id, video_id, title, sort_order, available_from, available_until
       FROM collection_items WHERE id = ?`,
      [itemId]
    );

    if (!item) {
      return ResponseHelper.notFoundError(res, '合集内容不存在');
    }

    const authResult = authorizePlaybackCheck({
      viewerKey: viewer_key,
      sharedSecret,
      now: new Date(),
      availableFrom: item.available_from,
      availableUntil: item.available_until,
    });

    if (!authResult.authorized) {
      return ResponseHelper.error(
        res,
        authResult.httpCode,
        authResult.errorType,
        authResult.errorCode,
        authResult.message,
        authResult.details
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.run(
      'INSERT INTO playback_tokens (token, collection_item_id, video_id, expires_at) VALUES (?, ?, ?, ?)',
      [token, item.id, item.video_id, expiresAt]
    );

    ResponseHelper.success(
      res,
      {
        playable: true,
        available_from: item.available_from,
        available_until: item.available_until,
        playback_token: token,
      },
      '授权成功'
    );
  } catch (error) {
    console.error('Authorize playback error:', error);
    ResponseHelper.internalError(res, '播放授权失败');
  }
}

async function getPlaybackContext(token: string) {
  return db.get(
    `SELECT pt.token, pt.expires_at,
            ci.available_from, ci.available_until,
            v.id as video_id, v.hls_path, v.status
     FROM playback_tokens pt
     JOIN collection_items ci ON pt.collection_item_id = ci.id
     JOIN videos v ON pt.video_id = v.id
     WHERE pt.token = ?`,
    [token]
  );
}

function isExpired(expiresAt: string, now: Date): boolean {
  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs)) return true;
  return expiresMs < now.getTime();
}

export async function getPlaybackPlaylist(req: Request, res: Response): Promise<void> {
  try {
    const token = req.params.token;
    if (!token) {
      return ResponseHelper.validationError(res, '播放令牌无效');
    }

    const ctx = await getPlaybackContext(token);
    if (!ctx) {
      return ResponseHelper.notFoundError(res, '播放令牌无效或已过期');
    }

    const now = new Date();
    if (isExpired(ctx.expires_at, now)) {
      return ResponseHelper.notFoundError(res, '播放令牌无效或已过期');
    }

    const windowResult = isPlayableWindow(ctx.available_from, ctx.available_until, now);
    if (!windowResult.playable) {
      if (windowResult.reason === 'NOT_AVAILABLE_YET') {
        return ResponseHelper.error(res, 403, ErrorType.BUSINESS_ERROR, ErrorCode.NOT_AVAILABLE_YET, '未到播放时间', {
          available_from: ctx.available_from,
        });
      }
      return ResponseHelper.error(res, 403, ErrorType.BUSINESS_ERROR, ErrorCode.EXPIRED, '已过下架时间', {
        available_until: ctx.available_until,
      });
    }

    if (ctx.status !== VideoStatus.COMPLETED || !ctx.hls_path) {
      return ResponseHelper.businessError(res, ErrorCode.VIDEO_NOT_READY, '视频尚未准备好播放');
    }

    const playlistPath = ctx.hls_path;
    if (!fs.existsSync(playlistPath)) {
      return ResponseHelper.notFoundError(res, '播放列表文件不存在');
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'no-cache');

    const playlistContent = fs.readFileSync(playlistPath, 'utf8');
    const baseUrl = process.env.BASE_URL
      ? `${process.env.BASE_URL}/api/playback/stream/${token}/`
      : `${req.protocol}://${req.get('host')}/api/playback/stream/${token}/`;

    const modifiedPlaylist = playlistContent.replace(
      /^segment_(\d+)\.ts$/gm,
      `${baseUrl}segment_$1.ts`
    );

    res.send(modifiedPlaylist);
  } catch (error) {
    console.error('Playback playlist error:', error);
    ResponseHelper.internalError(res, '获取播放列表失败');
  }
}

export async function getPlaybackSegment(req: Request, res: Response): Promise<void> {
  try {
    const token = req.params.token;
    const segmentId = req.params.segmentId;
    if (!token || !segmentId) {
      return ResponseHelper.validationError(res, '播放令牌或分片ID无效');
    }

    const ctx = await getPlaybackContext(token);
    if (!ctx) {
      return ResponseHelper.notFoundError(res, '播放令牌无效或已过期');
    }

    const now = new Date();
    if (isExpired(ctx.expires_at, now)) {
      return ResponseHelper.notFoundError(res, '播放令牌无效或已过期');
    }

    const windowResult = isPlayableWindow(ctx.available_from, ctx.available_until, now);
    if (!windowResult.playable) {
      if (windowResult.reason === 'NOT_AVAILABLE_YET') {
        return ResponseHelper.error(res, 403, ErrorType.BUSINESS_ERROR, ErrorCode.NOT_AVAILABLE_YET, '未到播放时间', {
          available_from: ctx.available_from,
        });
      }
      return ResponseHelper.error(res, 403, ErrorType.BUSINESS_ERROR, ErrorCode.EXPIRED, '已过下架时间', {
        available_until: ctx.available_until,
      });
    }

    if (ctx.status !== VideoStatus.COMPLETED || !ctx.hls_path) {
      return ResponseHelper.businessError(res, ErrorCode.VIDEO_NOT_READY, '视频尚未准备好播放');
    }

    const segmentPath = path.join(path.dirname(ctx.hls_path), `segment_${segmentId}.ts`);
    if (!fs.existsSync(segmentPath)) {
      return ResponseHelper.notFoundError(res, '视频片段不存在');
    }

    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const stream = fs.createReadStream(segmentPath);
    stream.pipe(res);
  } catch (error) {
    console.error('Playback segment error:', error);
    ResponseHelper.internalError(res, '获取视频片段失败');
  }
}
