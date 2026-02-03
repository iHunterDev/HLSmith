import { test, beforeAll, afterAll, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Request, Response } from 'express';
import { ErrorCode } from '../utils/response';

function createMockResponse() {
  return {
    headers: {} as Record<string, string>,
    statusCode: undefined as number | undefined,
    payload: undefined as any,
    body: undefined as any,
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    },
    send(body: any) {
      this.body = body;
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
let hlsDir: string;
let playlistPath: string;

async function seedToken(params: {
  token: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
  expiresAt: string;
  ignoreWindow?: boolean;
}) {
  await db.run(
    'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['user1', 'user1@example.com', 'hash', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
  );
  const user = await db.get('SELECT id FROM users WHERE username = ?', ['user1']);

  await db.run(
    'INSERT INTO videos (user_id, title, original_filename, original_filepath, file_size, status, hls_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'Video 1',
      'video.mp4',
      '/tmp/video.mp4',
      100,
      'completed',
      playlistPath,
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
      params.availableFrom ?? null,
      params.availableUntil ?? null,
      '2024-01-04T00:00:00Z',
      '2024-01-04T00:00:00Z',
    ],
  );
  const item = await db.get('SELECT id FROM collection_items WHERE title = ?', ['Episode 1']);

  await db.run(
    'INSERT INTO playback_tokens (token, collection_item_id, video_id, expires_at, ignore_window) VALUES (?, ?, ?, ?, ?)',
    [params.token, item.id, video.id, params.expiresAt, params.ignoreWindow ? 1 : 0],
  );
}

beforeAll(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  process.env.DB_PATH = dbPath;

  hlsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-hls-'));
  playlistPath = path.join(hlsDir, 'playlist.m3u8');
  fs.writeFileSync(
    playlistPath,
    ['#EXTM3U', '#EXT-X-VERSION:3', 'segment_1.ts', 'segment_2.ts'].join('\n'),
    'utf8',
  );

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

test('getPlaybackPlaylist returns 404 for invalid token', async () => {
  const { getPlaybackPlaylist } = await import('../controllers/playbackController');

  const req = { params: { token: 'missing' } } as unknown as Request;
  const res = createMockResponse();

  await getPlaybackPlaylist(req, res as unknown as Response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.error.code, ErrorCode.RESOURCE_NOT_FOUND);
});

test('getPlaybackPlaylist returns 403 when not available yet', async () => {
  await seedToken({
    token: 'token-1',
    availableFrom: '2999-01-01T00:00:00Z',
    expiresAt: '2999-01-02T00:00:00Z',
  });

  const { getPlaybackPlaylist } = await import('../controllers/playbackController');

  const req = { params: { token: 'token-1' } } as unknown as Request;
  const res = createMockResponse();

  await getPlaybackPlaylist(req, res as unknown as Response);

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error.code, ErrorCode.NOT_AVAILABLE_YET);
});

test('getPlaybackPlaylist allows ignore_window tokens outside time window', async () => {
  await seedToken({
    token: 'token-unlimited',
    availableFrom: '2999-01-01T00:00:00Z',
    expiresAt: '2999-01-02T00:00:00Z',
    ignoreWindow: true,
  });

  const { getPlaybackPlaylist } = await import('../controllers/playbackController');

  const req = {
    params: { token: 'token-unlimited' },
    protocol: 'http',
    get: (header: string) => (header === 'host' ? 'example.com' : ''),
  } as unknown as Request;
  const res = createMockResponse();

  await getPlaybackPlaylist(req, res as unknown as Response);

  if (res.payload) {
    assert.fail(`unexpected payload: ${JSON.stringify(res.payload)}`);
  }
  assert.ok(res.body, 'expected playlist body');
  assert.equal(res.headers['Content-Type'], 'application/vnd.apple.mpegurl');
});

test('getPlaybackPlaylist returns modified playlist when valid', async () => {
  await seedToken({
    token: 'token-2',
    expiresAt: '2999-01-02T00:00:00Z',
  });

  const { getPlaybackPlaylist } = await import('../controllers/playbackController');

  const req = {
    params: { token: 'token-2' },
    protocol: 'http',
    get: (header: string) => (header === 'host' ? 'example.com' : ''),
  } as unknown as Request;
  const res = createMockResponse();

  await getPlaybackPlaylist(req, res as unknown as Response);

  if (res.payload) {
    assert.fail(`unexpected payload: ${JSON.stringify(res.payload)}`);
  }
  assert.ok(res.body, 'expected playlist body');
  assert.equal(res.headers['Content-Type'], 'application/vnd.apple.mpegurl');
  assert.ok(
    String(res.body).includes('/api/playback/stream/token-2/segment_1.ts'),
    `body=${String(res.body)}`
  );
});
