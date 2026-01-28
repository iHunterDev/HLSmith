import { Request, Response } from 'express';
import { DatabaseManager } from '../database/init';
import { ResponseHelper } from '../utils/response';
import { StorageUtils } from '../utils/storageUtils';
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
      `SELECT
         ci.id,
         ci.collection_id,
         ci.video_id,
         ci.title,
         ci.sort_order,
         ci.available_from,
         ci.available_until,
         ci.created_at,
         ci.updated_at,
         v.thumbnail_path,
         v.title as video_title
       FROM collection_items ci
       LEFT JOIN videos v ON v.id = ci.video_id
       WHERE ci.collection_id = ?
       ORDER BY ci.sort_order ASC, ci.id ASC`,
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
      thumbnail_url: StorageUtils.buildThumbnailUrl(item.thumbnail_path, req),
      video_title: item.video_title,
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

export async function uploadCollectionCover(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      return ResponseHelper.validationError(res, '请选择要上传的封面文件');
    }

    const coverUrl = StorageUtils.buildCoverUrl(req.file.path, req);
    ResponseHelper.success(
      res,
      {
        cover_url: coverUrl,
        cover_path: req.file.path,
        filename: req.file.filename,
      },
      '封面上传成功',
      201
    );
  } catch (error) {
    console.error('Cover upload error:', error);
    ResponseHelper.internalError(res, '封面上传失败');
  }
}
