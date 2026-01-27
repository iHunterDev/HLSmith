import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Request, Response } from 'express';
import { buildViewerKey } from '../utils/viewerKey';
import { ErrorCode } from '../utils/response';

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
let collectionItemId: number;

async function seedBase(): Promise<void> {
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
  const item = await db.get('SELECT id FROM collection_items WHERE title = ?', ['Episode 1']);
  collectionItemId = item.id;
}

test.before(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  process.env.DB_PATH = dbPath;
  process.env.VIEWER_KEY_SECRET = 'test-secret';

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
  await db.run('DELETE FROM watch_sessions');
  await db.run('DELETE FROM collection_items');
  await db.run('DELETE FROM collections');
  await db.run('DELETE FROM videos');
  await db.run('DELETE FROM users');
  await seedBase();
});

test('heartbeat creates session and increments total_seconds', async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const viewerKey = buildViewerKey('user-1', nowSeconds - 10, 3600, 'test-secret');

  const { sendHeartbeat } = await import('../controllers/watchController');

  const req = {
    body: {
      viewer_key: viewerKey,
      collection_item_id: collectionItemId,
      delta_seconds: 15,
      timestamp: new Date().toISOString(),
    },
  } as unknown as Request;
  const res = createMockResponse();

  await sendHeartbeat(req, res as unknown as Response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.total_seconds, 15);

  const row = await db.get('SELECT total_seconds FROM watch_sessions WHERE collection_item_id = ?', [collectionItemId]);
  assert.equal(row.total_seconds, 15);
});

test('heartbeat rejects invalid viewer_key', async () => {
  const { sendHeartbeat } = await import('../controllers/watchController');

  const req = {
    body: {
      viewer_key: 'invalid',
      collection_item_id: collectionItemId,
      delta_seconds: 15,
      timestamp: new Date().toISOString(),
    },
  } as unknown as Request;
  const res = createMockResponse();

  await sendHeartbeat(req, res as unknown as Response);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_VIEWER_KEY);
});

test('heartbeat rejects when too frequent', async () => {
  const now = new Date();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const viewerKey = buildViewerKey('user-1', nowSeconds - 10, 3600, 'test-secret');

  const item = await db.get('SELECT video_id FROM collection_items WHERE id = ?', [collectionItemId]);

  await db.run(
    'INSERT INTO watch_sessions (viewer_key, collection_item_id, video_id, total_seconds, last_heartbeat_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      viewerKey,
      collectionItemId,
      item.video_id,
      10,
      new Date(now.getTime() - 5 * 1000).toISOString(),
      now.toISOString(),
      now.toISOString(),
    ],
  );

  const { sendHeartbeat } = await import('../controllers/watchController');

  const req = {
    body: {
      viewer_key: viewerKey,
      collection_item_id: collectionItemId,
      delta_seconds: 5,
      timestamp: now.toISOString(),
    },
  } as unknown as Request;
  const res = createMockResponse();

  await sendHeartbeat(req, res as unknown as Response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_PARAMS);
});
