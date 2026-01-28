import { Request, Response } from 'express';
import { DatabaseManager } from '../database/init';
import { ResponseHelper } from '../utils/response';
import { CollectionResponse } from '../models/Collection';

const db = DatabaseManager.getInstance();

export async function getCollections(req: Request, res: Response): Promise<void> {
  try {
    const collections = await db.all(
      'SELECT id, title, description, cover, created_at, updated_at FROM collections ORDER BY created_at DESC'
    );

    const totalResult = await db.get('SELECT COUNT(*) as total FROM collections');
    const total = totalResult?.total ?? 0;

    const response: CollectionResponse[] = collections.map((collection: any) => ({
      id: collection.id,
      title: collection.title,
      description: collection.description,
      cover: collection.cover,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
    }));

    ResponseHelper.success(
      res,
      { collections: response, total },
      '获取合集列表成功'
    );
  } catch (error) {
    console.error('Get collections error:', error);
    ResponseHelper.internalError(res, '获取合集列表失败');
  }
}

export async function getCollectionDetail(req: Request, res: Response): Promise<void> {
  try {
    const collectionId = Number(req.params.id);
    if (!Number.isFinite(collectionId)) {
      return ResponseHelper.validationError(res, '合集ID无效');
    }

    const collection = await db.get(
      'SELECT id, title, description, cover, created_at, updated_at FROM collections WHERE id = ?',
      [collectionId]
    );

    if (!collection) {
      return ResponseHelper.notFoundError(res, '合集不存在');
    }

    const items = await db.all(
      `SELECT id, collection_id, video_id, title, sort_order, available_from, available_until, created_at, updated_at
       FROM collection_items
       WHERE collection_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [collectionId]
    );

    const responseItems = items.map((item: any) => ({
      id: item.id,
      collection_id: item.collection_id,
      video_id: item.video_id,
      title: item.title,
      sort_order: item.sort_order,
      available_from: item.available_from,
      available_until: item.available_until,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    ResponseHelper.success(
      res,
      {
        collection: {
          id: collection.id,
          title: collection.title,
          description: collection.description,
          cover: collection.cover,
          created_at: collection.created_at,
          updated_at: collection.updated_at,
        },
        items: responseItems,
      },
      '获取合集详情成功'
    );
  } catch (error) {
    console.error('Get collection detail error:', error);
    ResponseHelper.internalError(res, '获取合集详情失败');
  }
}

export async function createCollection(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, cover } = req.body ?? {};

    if (!title) {
      return ResponseHelper.validationError(res, '合集标题不能为空');
    }

    await db.run(
      'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [title, description ?? null, cover ?? null]
    );

    const collection = await db.get(
      'SELECT id, title, description, cover, created_at, updated_at FROM collections WHERE id = last_insert_rowid()'
    );

    ResponseHelper.success(res, { collection }, '合集创建成功', 201);
  } catch (error) {
    console.error('Create collection error:', error);
    ResponseHelper.internalError(res, '创建合集失败');
  }
}

export async function updateCollection(req: Request, res: Response): Promise<void> {
  try {
    const collectionId = Number(req.params.id);
    if (!Number.isFinite(collectionId)) {
      return ResponseHelper.validationError(res, '合集ID无效');
    }

    const { title, description, cover } = req.body ?? {};
    if (!title) {
      return ResponseHelper.validationError(res, '合集标题不能为空');
    }

    const existing = await db.get('SELECT id FROM collections WHERE id = ?', [collectionId]);
    if (!existing) {
      return ResponseHelper.notFoundError(res, '合集不存在');
    }

    await db.run(
      'UPDATE collections SET title = ?, description = ?, cover = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description ?? null, cover ?? null, collectionId]
    );

    const collection = await db.get(
      'SELECT id, title, description, cover, created_at, updated_at FROM collections WHERE id = ?',
      [collectionId]
    );

    ResponseHelper.success(res, { collection }, '合集更新成功');
  } catch (error) {
    console.error('Update collection error:', error);
    ResponseHelper.internalError(res, '更新合集失败');
  }
}

export async function deleteCollection(req: Request, res: Response): Promise<void> {
  try {
    const collectionId = Number(req.params.id);
    if (!Number.isFinite(collectionId)) {
      return ResponseHelper.validationError(res, '合集ID无效');
    }

    const existing = await db.get('SELECT id FROM collections WHERE id = ?', [collectionId]);
    if (!existing) {
      return ResponseHelper.notFoundError(res, '合集不存在');
    }

    await db.run('DELETE FROM collections WHERE id = ?', [collectionId]);

    ResponseHelper.successWithoutData(res, '合集删除成功');
  } catch (error) {
    console.error('Delete collection error:', error);
    ResponseHelper.internalError(res, '删除合集失败');
  }
}
