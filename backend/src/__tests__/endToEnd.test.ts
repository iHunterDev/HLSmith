import { test, beforeAll, afterAll, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Request, Response } from 'express';
import { buildViewerKey } from '../utils/viewerKey';

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
let viewerKey: string;
let collectionItemId: number;
let playlistPath: string;

async function seedAll(): Promise<void> {
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
      'video1.mp4',
      '/tmp/video1.mp4',
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
      null,
      null,
      '2024-01-01T00:00:00Z',
      '2024-01-01T00:00:00Z',
    ],
  );
  const item = await db.get('SELECT id FROM collection_items WHERE title = ?', ['Episode 1']);
  collectionItemId = item.id;
}

beforeAll(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  process.env.DB_PATH = dbPath;
  process.env.VIEWER_KEY_SECRET = 'test-secret';

  const hlsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlsmith-hls-'));
  playlistPath = path.join(hlsDir, 'playlist.m3u8');
  fs.writeFileSync(
    playlistPath,
    ['#EXTM3U', '#EXT-X-VERSION:3', 'segment_1.ts'].join('\n'),
    'utf8',
  );

  const { initializeDatabase, DatabaseManager } = await import('../database/init');
  await initializeDatabase();
  db = DatabaseManager.getInstance();

  const nowSeconds = Math.floor(Date.now() / 1000);
  viewerKey = buildViewerKey('viewer-1', nowSeconds - 10, 3600, 'test-secret');
});

afterAll(async () => {
  if (db) {
    await db.close();
  }
});

beforeEach(async () => {
  await db.run('DELETE FROM playback_tokens');
  await db.run('DELETE FROM watch_sessions');
  await db.run('DELETE FROM collection_items');
  await db.run('DELETE FROM collections');
  await db.run('DELETE FROM videos');
  await db.run('DELETE FROM users');
  await seedAll();
});

test('authorize -> stream -> heartbeat -> summary full chain', async () => {
  const { authorizePlayback, getPlaybackPlaylist } = await import('../controllers/playbackController');
  const { sendHeartbeat, getWatchSummary } = await import('../controllers/watchController');

  const authReq = {
    body: { viewer_key: viewerKey, collection_item_id: collectionItemId },
  } as unknown as Request;
  const authRes = createMockResponse();
  await authorizePlayback(authReq, authRes as unknown as Response);

  assert.equal(authRes.statusCode, 200);
  const playbackToken = authRes.payload.data.playback_token as string;
  assert.ok(playbackToken);

  const playlistReq = {
    params: { token: playbackToken },
    protocol: 'http',
    get: (header: string) => (header === 'host' ? 'example.com' : ''),
  } as unknown as Request;
  const playlistRes = createMockResponse();
  await getPlaybackPlaylist(playlistReq, playlistRes as unknown as Response);

  assert.equal(playlistRes.headers['Content-Type'], 'application/vnd.apple.mpegurl');
  assert.ok(String(playlistRes.body).includes(`/api/playback/stream/${playbackToken}/segment_1.ts`));

  const nowIso = new Date().toISOString();
  const hbReq = {
    body: {
      viewer_key: viewerKey,
      collection_item_id: collectionItemId,
      delta_seconds: 15,
      timestamp: nowIso,
    },
  } as unknown as Request;
  const hbRes = createMockResponse();
  await sendHeartbeat(hbReq, hbRes as unknown as Response);

  assert.equal(hbRes.statusCode, 200);
  assert.equal(hbRes.payload.data.total_seconds, 15);

  const summaryReq = { query: { viewer_key: viewerKey } } as unknown as Request;
  const summaryRes = createMockResponse();
  await getWatchSummary(summaryReq, summaryRes as unknown as Response);

  assert.equal(summaryRes.statusCode, 200);
  assert.equal(summaryRes.payload.data.total_seconds, 15);
  assert.equal(summaryRes.payload.data.items.length, 1);
});
