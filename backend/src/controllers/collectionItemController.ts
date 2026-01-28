import { Request, Response } from 'express';
import { DatabaseManager } from '../database/init';
import { ResponseHelper } from '../utils/response';

const db = DatabaseManager.getInstance();

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export async function createCollectionItem(req: Request, res: Response): Promise<void> {
  try {
    const {
      collection_id,
      video_id,
      title,
      sort_order,
      available_from,
      available_until,
    } = req.body ?? {};

    if (!collection_id || !video_id || !title) {
      return ResponseHelper.validationError(res, '缺少必要参数');
    }

    const collectionId = Number(collection_id);
    const videoId = Number(video_id);

    if (!Number.isFinite(collectionId) || !Number.isFinite(videoId)) {
      return ResponseHelper.validationError(res, '参数无效');
    }

    if (sort_order !== undefined && sort_order !== null && !isInteger(sort_order)) {
      return ResponseHelper.validationError(res, 'sort_order 必须为整数');
    }

    if (available_from && !isValidDateString(available_from)) {
      return ResponseHelper.validationError(res, 'available_from 无效');
    }

    if (available_until && !isValidDateString(available_until)) {
      return ResponseHelper.validationError(res, 'available_until 无效');
    }

    if (available_from && available_until) {
      const fromDate = new Date(available_from);
      const untilDate = new Date(available_until);
      if (fromDate > untilDate) {
        return ResponseHelper.validationError(res, 'available_from 不能晚于 available_until');
      }
    }

    const collection = await db.get('SELECT id FROM collections WHERE id = ?', [collectionId]);
    if (!collection) {
      return ResponseHelper.notFoundError(res, '合集不存在');
    }

    const video = await db.get('SELECT id FROM videos WHERE id = ?', [videoId]);
    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    await db.run(
      'INSERT INTO collection_items (collection_id, video_id, title, sort_order, available_from, available_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [
        collectionId,
        videoId,
        title,
        sort_order ?? 0,
        available_from ?? null,
        available_until ?? null,
      ]
    );

    const item = await db.get(
      'SELECT id, collection_id, video_id, title, sort_order, available_from, available_until, created_at, updated_at FROM collection_items WHERE id = last_insert_rowid()'
    );

    ResponseHelper.success(res, { item }, '集数创建成功', 201);
  } catch (error) {
    console.error('Create collection item error:', error);
    ResponseHelper.internalError(res, '创建集数失败');
  }
}

export async function updateCollectionItem(req: Request, res: Response): Promise<void> {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
      return ResponseHelper.validationError(res, '集数ID无效');
    }

    const {
      title,
      sort_order,
      available_from,
      available_until,
      video_id,
    } = req.body ?? {};

    if (!title) {
      return ResponseHelper.validationError(res, '集数标题不能为空');
    }

    if (sort_order !== undefined && sort_order !== null && !isInteger(sort_order)) {
      return ResponseHelper.validationError(res, 'sort_order 必须为整数');
    }

    if (available_from && !isValidDateString(available_from)) {
      return ResponseHelper.validationError(res, 'available_from 无效');
    }

    if (available_until && !isValidDateString(available_until)) {
      return ResponseHelper.validationError(res, 'available_until 无效');
    }

    if (available_from && available_until) {
      const fromDate = new Date(available_from);
      const untilDate = new Date(available_until);
      if (fromDate > untilDate) {
        return ResponseHelper.validationError(res, 'available_from 不能晚于 available_until');
      }
    }

    const existing = await db.get('SELECT id FROM collection_items WHERE id = ?', [itemId]);
    if (!existing) {
      return ResponseHelper.notFoundError(res, '集数不存在');
    }

    if (video_id !== undefined && video_id !== null) {
      const videoId = Number(video_id);
      if (!Number.isFinite(videoId)) {
        return ResponseHelper.validationError(res, '视频ID无效');
      }
      const video = await db.get('SELECT id FROM videos WHERE id = ?', [videoId]);
      if (!video) {
        return ResponseHelper.notFoundError(res, '视频不存在');
      }
    }

    await db.run(
      'UPDATE collection_items SET title = ?, sort_order = ?, available_from = ?, available_until = ?, video_id = COALESCE(?, video_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        title,
        sort_order ?? 0,
        available_from ?? null,
        available_until ?? null,
        video_id ?? null,
        itemId,
      ]
    );

    const item = await db.get(
      'SELECT id, collection_id, video_id, title, sort_order, available_from, available_until, created_at, updated_at FROM collection_items WHERE id = ?',
      [itemId]
    );

    ResponseHelper.success(res, { item }, '集数更新成功');
  } catch (error) {
    console.error('Update collection item error:', error);
    ResponseHelper.internalError(res, '更新集数失败');
  }
}

export async function deleteCollectionItem(req: Request, res: Response): Promise<void> {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isFinite(itemId)) {
      return ResponseHelper.validationError(res, '集数ID无效');
    }

    const existing = await db.get('SELECT id FROM collection_items WHERE id = ?', [itemId]);
    if (!existing) {
      return ResponseHelper.notFoundError(res, '集数不存在');
    }

    await db.run('DELETE FROM collection_items WHERE id = ?', [itemId]);

    ResponseHelper.successWithoutData(res, '集数删除成功');
  } catch (error) {
    console.error('Delete collection item error:', error);
    ResponseHelper.internalError(res, '删除集数失败');
  }
}
