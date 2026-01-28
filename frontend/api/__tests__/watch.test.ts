import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { watchApi } from '../watch';
import { server } from '../../test/msw/server';

const API_BASE_URL = 'http://localhost:3001';

describe('watchApi', () => {
  it('getWatchSummary returns summary', async () => {
    const result = await watchApi.getWatchSummary('viewer-key');
    expect(result.total_seconds).toBe(120);
    expect(result.items[0].collection_item_id).toBe(10);
  });

  it('throws on api error', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/watch/summary`, () => {
        return HttpResponse.json({
          success: false,
          code: 400,
          message: 'bad',
          error: { type: 'VALIDATION_ERROR', code: 'INVALID_PARAMS', message: 'bad' },
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      })
    );

    await expect(watchApi.getWatchSummary('bad')).rejects.toThrow('bad');
  });
});
