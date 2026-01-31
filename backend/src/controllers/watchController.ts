import { Request, Response } from 'express';

import { DatabaseManager } from '../database/init';
import { ResponseHelper, ErrorCode, ErrorType } from '../utils/response';
import { verifyViewerKey } from '../utils/viewerKey';
import { validateHeartbeat } from '../utils/heartbeatRules';

const db = DatabaseManager.getInstance();

function parseClientTimestamp(value: any): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function sendHeartbeat(req: Request, res: Response): Promise<void> {
  try {
    const { viewer_key, collection_item_id, delta_seconds, timestamp } = req.body || {};

    if (!viewer_key || !collection_item_id || delta_seconds === undefined || !timestamp) {
      return ResponseHelper.validationError(res, '参数缺失');
    }

    const itemId = Number(collection_item_id);
    const deltaSeconds = Number(delta_seconds);
    if (!Number.isFinite(itemId) || !Number.isFinite(deltaSeconds)) {
      return ResponseHelper.validationError(res, '参数无效');
    }

    const clientTimestamp = parseClientTimestamp(timestamp);
    if (!clientTimestamp) {
      return ResponseHelper.validationError(res, 'timestamp 无效');
    }

    const sharedSecret = process.env.VIEWER_KEY_SECRET || process.env.JWT_SECRET;
    if (!sharedSecret) {
      return ResponseHelper.internalError(res, '缺少 viewer_key 校验密钥');
    }

    const now = new Date();
    const verification = verifyViewerKey(viewer_key, sharedSecret);
    if (!verification.valid) {
      return ResponseHelper.error(
        res,
        401,
        ErrorType.AUTHENTICATION_ERROR,
        ErrorCode.INVALID_VIEWER_KEY,
        'viewer_key invalid',
        { reason: verification.errorCode }
      );
    }

    const item = await db.get(
      'SELECT id, video_id FROM collection_items WHERE id = ?',
      [itemId]
    );

    if (!item) {
      return ResponseHelper.notFoundError(res, '合集内容不存在');
    }

    const session = await db.get(
      'SELECT id, total_seconds, last_heartbeat_at FROM watch_sessions WHERE viewer_key = ? AND collection_item_id = ?',
      [viewer_key, itemId]
    );

    const previousHeartbeatAt = session?.last_heartbeat_at ? new Date(session.last_heartbeat_at) : null;
    const validation = validateHeartbeat({
      previousHeartbeatAt,
      deltaSeconds,
      clientTimestamp,
      now,
    });

    if (!validation.valid) {
      return ResponseHelper.validationError(res, '心跳不合法', { reason: validation.reason });
    }

    const nowIso = now.toISOString();
    let totalSeconds: number;

    if (!session) {
      totalSeconds = deltaSeconds;
      await db.run(
        'INSERT INTO watch_sessions (viewer_key, collection_item_id, video_id, total_seconds, last_heartbeat_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [viewer_key, itemId, item.video_id, totalSeconds, nowIso, nowIso, nowIso]
      );
    } else {
      totalSeconds = Number(session.total_seconds || 0) + deltaSeconds;
      await db.run(
        'UPDATE watch_sessions SET total_seconds = ?, last_heartbeat_at = ?, updated_at = ? WHERE id = ?',
        [totalSeconds, nowIso, nowIso, session.id]
      );
    }

    ResponseHelper.success(
      res,
      {
        total_seconds: totalSeconds,
        last_heartbeat_at: nowIso,
      },
      '心跳上报成功'
    );
  } catch (error) {
    console.error('Heartbeat error:', error);
    ResponseHelper.internalError(res, '心跳上报失败');
  }
}

export async function getWatchSummary(req: Request, res: Response): Promise<void> {
  try {
    const viewerKey = String(req.query.viewer_key || '');
    if (!viewerKey) {
      return ResponseHelper.validationError(res, 'viewer_key 缺失');
    }

    const sharedSecret = process.env.VIEWER_KEY_SECRET || process.env.JWT_SECRET;
    if (!sharedSecret) {
      return ResponseHelper.internalError(res, '缺少 viewer_key 校验密钥');
    }

    const now = new Date();
    const verification = verifyViewerKey(viewerKey, sharedSecret);
    if (!verification.valid) {
      return ResponseHelper.error(
        res,
        401,
        ErrorType.AUTHENTICATION_ERROR,
        ErrorCode.INVALID_VIEWER_KEY,
        'viewer_key invalid',
        { reason: verification.errorCode }
      );
    }

    const totalRow = await db.get(
      'SELECT COALESCE(SUM(total_seconds), 0) as total_seconds FROM watch_sessions WHERE viewer_key = ?',
      [viewerKey]
    );
    const totalSeconds = Number(totalRow?.total_seconds || 0);

    const items = await db.all(
      `SELECT collection_item_id, video_id, total_seconds
       FROM watch_sessions
       WHERE viewer_key = ?
       ORDER BY collection_item_id ASC`,
      [viewerKey]
    );

    const collections = await db.all(
      `SELECT ci.collection_id as collection_id, SUM(ws.total_seconds) as total_seconds
       FROM watch_sessions ws
       JOIN collection_items ci ON ws.collection_item_id = ci.id
       WHERE ws.viewer_key = ?
       GROUP BY ci.collection_id
       ORDER BY ci.collection_id ASC`,
      [viewerKey]
    );

    ResponseHelper.success(
      res,
      {
        total_seconds: totalSeconds,
        collections: collections.map((row: any) => ({
          collection_id: row.collection_id,
          total_seconds: Number(row.total_seconds || 0),
        })),
        items: items.map((row: any) => ({
          collection_item_id: row.collection_item_id,
          video_id: row.video_id,
          total_seconds: Number(row.total_seconds || 0),
        })),
      },
      '获取学习时长汇总成功'
    );
  } catch (error) {
    console.error('Watch summary error:', error);
    ResponseHelper.internalError(res, '获取学习时长汇总失败');
  }
}
