import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { playbackApi } from '../playback';
import { server } from '../../test/msw/server';

const API_BASE_URL = 'http://localhost:3001';

describe('playbackApi', () => {
  it('authorizePlayback returns token', async () => {
    const result = await playbackApi.authorizePlayback({ viewer_key: 'viewer', collection_item_id: 10 });
    expect(result.playable).toBe(true);
    expect(result.playback_token).toBe('viewer-10');
  });

  it('throws on api error', async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/playback/authorize`, () => {
        return HttpResponse.json({
          success: false,
          code: 400,
          message: 'bad',
          error: { type: 'VALIDATION_ERROR', code: 'INVALID_PARAMS', message: 'bad' },
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      })
    );

    await expect(playbackApi.authorizePlayback({ viewer_key: 'x', collection_item_id: 1 })).rejects.toThrow('bad');
  });
});
