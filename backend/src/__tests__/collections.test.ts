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

async function seedUserAndVideo(): Promise<{ userId: number; videoId: number }> {
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
  return { userId: user.id, videoId: video.id };
}

beforeAll(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  process.env.DB_PATH = dbPath;
  process.env.BASE_URL = 'http://localhost:3001';

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

test('getCollections returns collections list and total', async () => {
  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['First', 'desc1', 'cover1', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['Second', 'desc2', 'cover2', '2024-02-01T00:00:00Z', '2024-02-01T00:00:00Z'],
  );

  const { getCollections } = await import('../controllers/collectionController');

  const res = createMockResponse();
  await getCollections({} as Request, res as unknown as Response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.total, 2);
  assert.equal(res.payload.data.collections.length, 2);
  assert.equal(res.payload.data.collections[0].title, 'Second');
  assert.equal(res.payload.data.collections[1].title, 'First');
});

test('getCollectionDetail returns collection and items ordered', async () => {
  const { videoId } = await seedUserAndVideo();

  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['Series A', 'desc', 'cover', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const collection = await db.get('SELECT id FROM collections WHERE title = ?', ['Series A']);
  const video = await db.get('SELECT id FROM videos WHERE id = ?', [videoId]);

  await db.run('UPDATE videos SET thumbnail_path = ? WHERE id = ?', [
    `storage/thumbnails/2025/01/${videoId}/thumbnail.jpg`,
    video.id,
  ]);

  await db.run(
    'INSERT INTO collection_items (collection_id, video_id, title, sort_order, available_from, available_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      collection.id,
      video.id,
      'Episode 2',
      2,
      '2024-01-10T00:00:00Z',
      '2024-01-20T00:00:00Z',
      '2024-01-05T00:00:00Z',
      '2024-01-05T00:00:00Z',
    ],
  );
  await db.run(
    'INSERT INTO collection_items (collection_id, video_id, title, sort_order, available_from, available_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      collection.id,
      video.id,
      'Episode 1',
      1,
      null,
      null,
      '2024-01-04T00:00:00Z',
      '2024-01-04T00:00:00Z',
    ],
  );

  const { getCollectionDetail } = await import('../controllers/collectionController');

  const req = { params: { id: String(collection.id) } } as unknown as Request;
  const res = createMockResponse();
  await getCollectionDetail(req, res as unknown as Response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.collection.title, 'Series A');
  assert.equal(res.payload.data.items.length, 2);
  assert.equal(res.payload.data.items[0].title, 'Episode 1');
  assert.equal(res.payload.data.items[1].title, 'Episode 2');
  assert.equal(res.payload.data.items[0].video_title, 'Video 1');
  assert.equal(
    res.payload.data.items[0].thumbnail_url,
    `http://localhost:3001/thumbnails/2025/01/${videoId}/thumbnail.jpg`,
  );
});

test('createCollection creates collection', async () => {
  const { createCollection } = await import('../controllers/collectionController');

  const req = {
    body: {
      title: 'Series A',
      description: 'desc',
      cover: 'cover.png',
    },
  } as Request;

  const res = createMockResponse();
  await createCollection(req, res as unknown as Response);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.collection.title, 'Series A');

  const row = await db.get('SELECT title, description, cover FROM collections WHERE title = ?', ['Series A']);
  assert.equal(row.title, 'Series A');
  assert.equal(row.description, 'desc');
  assert.equal(row.cover, 'cover.png');
});

test('createCollection validates required fields', async () => {
  const { createCollection } = await import('../controllers/collectionController');

  const req = { body: { description: 'desc' } } as Request;
  const res = createMockResponse();
  await createCollection(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});

test('updateCollection updates collection', async () => {
  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['Series A', 'desc', 'cover', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const collection = await db.get('SELECT id FROM collections WHERE title = ?', ['Series A']);

  const { updateCollection } = await import('../controllers/collectionController');

  const req = {
    params: { id: String(collection.id) },
    body: { title: 'Series B', description: 'desc2', cover: 'cover2' },
  } as unknown as Request;
  const res = createMockResponse();
  await updateCollection(req, res as unknown as Response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.collection.title, 'Series B');

  const row = await db.get('SELECT title, description, cover FROM collections WHERE id = ?', [collection.id]);
  assert.equal(row.title, 'Series B');
  assert.equal(row.description, 'desc2');
  assert.equal(row.cover, 'cover2');
});

test('updateCollection validates required title', async () => {
  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['Series A', 'desc', 'cover', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const collection = await db.get('SELECT id FROM collections WHERE title = ?', ['Series A']);

  const { updateCollection } = await import('../controllers/collectionController');

  const req = {
    params: { id: String(collection.id) },
    body: { description: 'desc2' },
  } as unknown as Request;
  const res = createMockResponse();
  await updateCollection(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});

test('updateCollection returns 404 when not found', async () => {
  const { updateCollection } = await import('../controllers/collectionController');

  const req = {
    params: { id: '9999' },
    body: { title: 'Series B' },
  } as unknown as Request;
  const res = createMockResponse();
  await updateCollection(req, res as unknown as Response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.error.code, ErrorCode.RESOURCE_NOT_FOUND);
});

test('deleteCollection removes collection', async () => {
  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['Series A', 'desc', 'cover', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const collection = await db.get('SELECT id FROM collections WHERE title = ?', ['Series A']);

  const { deleteCollection } = await import('../controllers/collectionController');

  const req = { params: { id: String(collection.id) } } as unknown as Request;
  const res = createMockResponse();
  await deleteCollection(req, res as unknown as Response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  const row = await db.get('SELECT id FROM collections WHERE id = ?', [collection.id]);
  assert.equal(row, null);
});

test('deleteCollection returns 404 when not found', async () => {
  const { deleteCollection } = await import('../controllers/collectionController');

  const req = { params: { id: '9999' } } as unknown as Request;
  const res = createMockResponse();
  await deleteCollection(req, res as unknown as Response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.error.code, ErrorCode.RESOURCE_NOT_FOUND);
});

test('deleteCollection validates id', async () => {
  const { deleteCollection } = await import('../controllers/collectionController');

  const req = { params: { id: 'NaN' } } as unknown as Request;
  const res = createMockResponse();
  await deleteCollection(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});

test('uploadCollectionCover returns cover url', async () => {
  const { uploadCollectionCover } = await import('../controllers/collectionController');

  const req = {
    file: {
      path: 'storage/covers/2025/01/cover.jpg',
      filename: 'cover.jpg',
    },
    protocol: 'http',
    get: (key: string) => (key === 'host' ? 'localhost:3001' : undefined),
  } as unknown as Request;

  const res = createMockResponse();
  await uploadCollectionCover(req, res as unknown as Response);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.cover_url, 'http://localhost:3001/covers/2025/01/cover.jpg');
});

test('handleCoverMulterError rejects unsupported cover format', async () => {
  const { handleCoverMulterError } = await import('../middleware/coverUpload');

  const res = createMockResponse();
  const next = () => {
    throw new Error('next should not be called');
  };

  const error = new Error('Unsupported cover format. File: bad.txt, Type: text/plain, Extension: .txt');
  await handleCoverMulterError(error, {} as Request, res as unknown as Response, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'Unsupported file format');
});

test('handleCoverMulterError returns file size limit', async () => {
  const { handleCoverMulterError } = await import('../middleware/coverUpload');
  const { default: multer } = await import('multer');

  const res = createMockResponse();
  const next = () => {
    throw new Error('next should not be called');
  };

  const error = new multer.MulterError('LIMIT_FILE_SIZE');
  await handleCoverMulterError(error, {} as Request, res as unknown as Response, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'File too large');
});

test('uploadCollectionCover validates missing file', async () => {
  const { uploadCollectionCover } = await import('../controllers/collectionController');

  const req = {
    protocol: 'http',
    get: (key: string) => (key === 'host' ? 'localhost:3001' : undefined),
  } as unknown as Request;
  const res = createMockResponse();

  await uploadCollectionCover(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});

test('handleCoverMulterError returns unexpected file field', async () => {
  const { handleCoverMulterError } = await import('../middleware/coverUpload');
  const { default: multer } = await import('multer');

  const res = createMockResponse();
  const next = () => {
    throw new Error('next should not be called');
  };

  const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
  await handleCoverMulterError(error, {} as Request, res as unknown as Response, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'Unexpected file field');
});

test('handleCoverMulterError returns too many files', async () => {
  const { handleCoverMulterError } = await import('../middleware/coverUpload');
  const { default: multer } = await import('multer');

  const res = createMockResponse();
  const next = () => {
    throw new Error('next should not be called');
  };

  const error = new multer.MulterError('LIMIT_FILE_COUNT');
  await handleCoverMulterError(error, {} as Request, res as unknown as Response, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'Too many files');
});

test('handleCoverMulterError returns generic multer error', async () => {
  const { handleCoverMulterError } = await import('../middleware/coverUpload');
  const { default: multer } = await import('multer');

  const res = createMockResponse();
  const next = () => {
    throw new Error('next should not be called');
  };

  const error = new multer.MulterError('LIMIT_PART_COUNT');
  await handleCoverMulterError(error, {} as Request, res as unknown as Response, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'File upload error');
});

test('handleCoverMulterError passes non-multer errors to next', async () => {
  const { handleCoverMulterError } = await import('../middleware/coverUpload');

  const res = createMockResponse();
  let nextCalled = false;
  const next = (err?: any) => {
    if (err) {
      nextCalled = true;
    }
  };

  const error = new Error('Some other error');
  await handleCoverMulterError(error, {} as Request, res as unknown as Response, next);

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, undefined);
});
