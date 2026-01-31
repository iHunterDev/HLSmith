import { test, beforeAll, afterAll, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Request, Response } from 'express';

import { buildViewerKey } from '../utils/viewerKey';
import { ErrorCode, ErrorType } from '../utils/response';

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
  all: (sql: string, params?: any[]) => Promise<any[]>;
  close: () => Promise<void>;
};

let db: DbInstance;

async function seedBase(): Promise<{ collectionItemId: number }>{
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
  return { collectionItemId: item.id };
}

beforeAll(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  process.env.DB_PATH = dbPath;
  process.env.VIEWER_KEY_SECRET = 'test-secret';

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
  await db.run('DELETE FROM playback_tokens');
  await db.run('DELETE FROM collection_items');
  await db.run('DELETE FROM collections');
  await db.run('DELETE FROM videos');
  await db.run('DELETE FROM users');
});

test('authorizePlayback returns playback token when playable', async () => {
  const { collectionItemId } = await seedBase();
  const viewerKey = buildViewerKey('user-1', 'test-secret');

  const { authorizePlayback } = await import('../controllers/playbackController');

  const req = {
    body: {
      viewer_key: viewerKey,
      collection_item_id: collectionItemId,
    },
  } as unknown as Request;
  const res = createMockResponse();

  await authorizePlayback(req, res as unknown as Response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.playable, true);
  assert.equal(typeof res.payload.data.playback_token, 'string');
  assert.equal(typeof res.payload.data.playback_url, 'string');
  assert.ok(
    (res.payload.data.playback_url as string).endsWith(
      `/api/playback/stream/${res.payload.data.playback_token}/playlist.m3u8`
    )
  );

  const tokenRow = await db.get('SELECT token, collection_item_id FROM playback_tokens');
  assert.equal(tokenRow.collection_item_id, collectionItemId);
  assert.equal(tokenRow.token, res.payload.data.playback_token);
});

test('authorizePlayback returns 403 when not available yet', async () => {
  const { collectionItemId } = await seedBase();
  await db.run(
    'UPDATE collection_items SET available_from = ? WHERE id = ?',
    ['2999-01-01T00:00:00Z', collectionItemId],
  );

  const viewerKey = buildViewerKey('user-1', 'test-secret');

  const { authorizePlayback } = await import('../controllers/playbackController');

  const req = {
    body: {
      viewer_key: viewerKey,
      collection_item_id: collectionItemId,
    },
  } as unknown as Request;
  const res = createMockResponse();

  await authorizePlayback(req, res as unknown as Response);

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error.type, ErrorType.BUSINESS_ERROR);
  assert.equal(res.payload.error.code, ErrorCode.NOT_AVAILABLE_YET);
});
