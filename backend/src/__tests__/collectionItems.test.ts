import { test, beforeAll, afterAll, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Request, Response } from 'express';
import { ErrorCode } from '../utils/response';

type DbInstance = {
  run: (sql: string, params?: any[]) => Promise<void>;
  get: (sql: string, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
};

let db: DbInstance;

function createMockResponse() {
  return {
    statusCode: undefined as number | undefined,
    payload: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    },
  };
}

async function seedUserVideoAndCollection(): Promise<{ videoId: number; collectionId: number }> {
  await db.run(
    'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['user1', 'user1@example.com', 'hash', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const user = await db.get('SELECT id FROM users WHERE username = ?', ['user1']);

  await db.run(
    'INSERT INTO videos (user_id, title, original_filename, original_filepath, file_size, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'Video 1',
      'video.mp4',
      '/tmp/video.mp4',
      100,
      'uploaded',
      '2024-01-01T00:00:00Z',
      '2024-01-01T00:00:00Z',
    ],
  );
  const video = await db.get('SELECT id FROM videos WHERE title = ?', ['Video 1']);

  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['Series A', 'desc', 'cover', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const collection = await db.get('SELECT id FROM collections WHERE title = ?', ['Series A']);

  return { videoId: video.id, collectionId: collection.id };
}

beforeAll(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  process.env.DB_PATH = dbPath;

  const { initializeDatabase, DatabaseManager } = await import('../database/init');
  await initializeDatabase();
  db = DatabaseManager.getInstance();
});

afterAll(async () => {
  if (db) {
    await db.close();
  }
});

beforeEach(async () => {
  await db.run('DELETE FROM collection_items');
  await db.run('DELETE FROM collections');
  await db.run('DELETE FROM videos');
  await db.run('DELETE FROM users');
});

test('createCollectionItem creates item', async () => {
  const { collectionId, videoId } = await seedUserVideoAndCollection();
  const { createCollectionItem } = await import('../controllers/collectionItemController');

  const req = {
    body: {
      collection_id: collectionId,
      video_id: videoId,
      title: 'Episode 1',
      sort_order: 1,
      available_from: '2024-01-01T00:00:00Z',
      available_until: '2024-02-01T00:00:00Z',
    },
  } as Request;

  const res = createMockResponse();
  await createCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.item.title, 'Episode 1');

  const row = await db.get('SELECT title, sort_order FROM collection_items WHERE title = ?', ['Episode 1']);
  assert.equal(row.title, 'Episode 1');
  assert.equal(row.sort_order, 1);
});

test('createCollectionItem validates required fields', async () => {
  const { createCollectionItem } = await import('../controllers/collectionItemController');

  const req = { body: { title: 'Episode 1' } } as Request;
  const res = createMockResponse();
  await createCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});

test('createCollectionItem validates sort_order integer', async () => {
  const { collectionId, videoId } = await seedUserVideoAndCollection();
  const { createCollectionItem } = await import('../controllers/collectionItemController');

  const req = {
    body: {
      collection_id: collectionId,
      video_id: videoId,
      title: 'Episode 1',
      sort_order: 'bad',
    },
  } as Request;

  const res = createMockResponse();
  await createCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});

test('createCollectionItem validates available window', async () => {
  const { collectionId, videoId } = await seedUserVideoAndCollection();
  const { createCollectionItem } = await import('../controllers/collectionItemController');

  const req = {
    body: {
      collection_id: collectionId,
      video_id: videoId,
      title: 'Episode 1',
      available_from: '2024-02-01T00:00:00Z',
      available_until: '2024-01-01T00:00:00Z',
    },
  } as Request;

  const res = createMockResponse();
  await createCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});

test('updateCollectionItem updates item', async () => {
  const { collectionId, videoId } = await seedUserVideoAndCollection();
  await db.run(
    'INSERT INTO collection_items (collection_id, video_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [collectionId, videoId, 'Episode 1', 1, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const item = await db.get('SELECT id FROM collection_items WHERE title = ?', ['Episode 1']);

  const { updateCollectionItem } = await import('../controllers/collectionItemController');

  const req = {
    params: { id: String(item.id) },
    body: {
      title: 'Episode 2',
      sort_order: 2,
      available_from: '2024-01-05T00:00:00Z',
      available_until: '2024-02-01T00:00:00Z',
    },
  } as unknown as Request;

  const res = createMockResponse();
  await updateCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.item.title, 'Episode 2');

  const row = await db.get('SELECT title, sort_order FROM collection_items WHERE id = ?', [item.id]);
  assert.equal(row.title, 'Episode 2');
  assert.equal(row.sort_order, 2);
});

test('updateCollectionItem validates sort_order integer', async () => {
  const { collectionId, videoId } = await seedUserVideoAndCollection();
  await db.run(
    'INSERT INTO collection_items (collection_id, video_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [collectionId, videoId, 'Episode 1', 1, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const item = await db.get('SELECT id FROM collection_items WHERE title = ?', ['Episode 1']);

  const { updateCollectionItem } = await import('../controllers/collectionItemController');

  const req = {
    params: { id: String(item.id) },
    body: { title: 'Episode 2', sort_order: 'bad' },
  } as unknown as Request;

  const res = createMockResponse();
  await updateCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});

test('updateCollectionItem validates available window', async () => {
  const { collectionId, videoId } = await seedUserVideoAndCollection();
  await db.run(
    'INSERT INTO collection_items (collection_id, video_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [collectionId, videoId, 'Episode 1', 1, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const item = await db.get('SELECT id FROM collection_items WHERE title = ?', ['Episode 1']);

  const { updateCollectionItem } = await import('../controllers/collectionItemController');

  const req = {
    params: { id: String(item.id) },
    body: {
      title: 'Episode 2',
      available_from: '2024-02-01T00:00:00Z',
      available_until: '2024-01-01T00:00:00Z',
    },
  } as unknown as Request;

  const res = createMockResponse();
  await updateCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});

test('updateCollectionItem returns 404 when not found', async () => {
  const { updateCollectionItem } = await import('../controllers/collectionItemController');

  const req = {
    params: { id: '9999' },
    body: { title: 'Episode 2' },
  } as unknown as Request;

  const res = createMockResponse();
  await updateCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.error.code, ErrorCode.RESOURCE_NOT_FOUND);
});

test('deleteCollectionItem removes item', async () => {
  const { collectionId, videoId } = await seedUserVideoAndCollection();
  await db.run(
    'INSERT INTO collection_items (collection_id, video_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [collectionId, videoId, 'Episode 1', 1, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const item = await db.get('SELECT id FROM collection_items WHERE title = ?', ['Episode 1']);

  const { deleteCollectionItem } = await import('../controllers/collectionItemController');

  const req = { params: { id: String(item.id) } } as unknown as Request;
  const res = createMockResponse();
  await deleteCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);

  const row = await db.get('SELECT id FROM collection_items WHERE id = ?', [item.id]);
  assert.equal(row, null);
});

test('deleteCollectionItem returns 404 when not found', async () => {
  const { deleteCollectionItem } = await import('../controllers/collectionItemController');

  const req = { params: { id: '9999' } } as unknown as Request;
  const res = createMockResponse();
  await deleteCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.error.code, ErrorCode.RESOURCE_NOT_FOUND);
});

test('deleteCollectionItem validates id', async () => {
  const { deleteCollectionItem } = await import('../controllers/collectionItemController');

  const req = { params: { id: 'bad' } } as unknown as Request;
  const res = createMockResponse();
  await deleteCollectionItem(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});
