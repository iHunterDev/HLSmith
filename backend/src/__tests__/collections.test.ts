import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Request, Response } from 'express';

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

test.before(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  process.env.DB_PATH = dbPath;

  const { initializeDatabase, DatabaseManager } = await import('../database/init');
  await initializeDatabase();
  db = DatabaseManager.getInstance();
});

test.after(async () => {
  if (db) {
    await db.close();
  }
});

test.beforeEach(async () => {
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
  await seedUserAndVideo();

  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['Series A', 'desc', 'cover', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const collection = await db.get('SELECT id FROM collections WHERE title = ?', ['Series A']);
  const video = await db.get('SELECT id FROM videos WHERE title = ?', ['Video 1']);

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
});
