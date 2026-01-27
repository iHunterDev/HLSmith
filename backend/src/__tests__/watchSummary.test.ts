import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Request, Response } from 'express';
import { buildViewerKey } from '../utils/viewerKey';

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

type DbInstance = {
  run: (sql: string, params?: any[]) => Promise<void>;
  get: (sql: string, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
};

let db: DbInstance;
let viewerKey: string;

async function seedBase(): Promise<{ item1Id: number; item2Id: number }> {
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
      'video1.mp4',
      '/tmp/video1.mp4',
      100,
      'uploaded',
      '2024-01-01T00:00:00Z',
      '2024-01-01T00:00:00Z',
    ],
  );
  await db.run(
    'INSERT INTO videos (user_id, title, original_filename, original_filepath, file_size, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'Video 2',
      'video2.mp4',
      '/tmp/video2.mp4',
      200,
      'uploaded',
      '2024-01-01T00:00:00Z',
      '2024-01-01T00:00:00Z',
    ],
  );
  const video1 = await db.get('SELECT id FROM videos WHERE title = ?', ['Video 1']);
  const video2 = await db.get('SELECT id FROM videos WHERE title = ?', ['Video 2']);

  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['Series A', 'desc', 'cover', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  await db.run(
    'INSERT INTO collections (title, description, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['Series B', 'desc', 'cover', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const collectionA = await db.get('SELECT id FROM collections WHERE title = ?', ['Series A']);
  const collectionB = await db.get('SELECT id FROM collections WHERE title = ?', ['Series B']);

  await db.run(
    'INSERT INTO collection_items (collection_id, video_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [collectionA.id, video1.id, 'Ep1', 1, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  await db.run(
    'INSERT INTO collection_items (collection_id, video_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [collectionB.id, video2.id, 'Ep2', 1, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const item1 = await db.get('SELECT id FROM collection_items WHERE title = ?', ['Ep1']);
  const item2 = await db.get('SELECT id FROM collection_items WHERE title = ?', ['Ep2']);

  await db.run(
    'INSERT INTO watch_sessions (viewer_key, collection_item_id, video_id, total_seconds, last_heartbeat_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [viewerKey, item1.id, video1.id, 120, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  await db.run(
    'INSERT INTO watch_sessions (viewer_key, collection_item_id, video_id, total_seconds, last_heartbeat_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [viewerKey, item2.id, video2.id, 180, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );

  return { item1Id: item1.id, item2Id: item2.id };
}

test.before(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  process.env.DB_PATH = dbPath;
  process.env.VIEWER_KEY_SECRET = 'test-secret';

  const { initializeDatabase, DatabaseManager } = await import('../database/init');
  await initializeDatabase();
  db = DatabaseManager.getInstance();

  const nowSeconds = Math.floor(Date.now() / 1000);
  viewerKey = buildViewerKey('viewer-1', nowSeconds - 10, 3600, 'test-secret');
});

test.after(async () => {
  if (db) {
    await db.close();
  }
});

test.beforeEach(async () => {
  await db.run('DELETE FROM watch_sessions');
  await db.run('DELETE FROM collection_items');
  await db.run('DELETE FROM collections');
  await db.run('DELETE FROM videos');
  await db.run('DELETE FROM users');
});

test('getWatchSummary returns totals for viewer', async () => {
  const { item1Id, item2Id } = await seedBase();

  const { getWatchSummary } = await import('../controllers/watchController');

  const req = { query: { viewer_key: viewerKey } } as unknown as Request;
  const res = createMockResponse();

  await getWatchSummary(req, res as unknown as Response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.total_seconds, 300);
  assert.equal(res.payload.data.items.length, 2);
  assert.equal(res.payload.data.items[0].collection_item_id, item1Id);
  assert.equal(res.payload.data.items[1].collection_item_id, item2Id);
  assert.equal(res.payload.data.collections.length, 2);
});
