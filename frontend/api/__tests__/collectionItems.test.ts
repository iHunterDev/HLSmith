import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { collectionItemsApi } from '../collectionItems';
import { server } from '../../test/msw/server';

const API_BASE_URL = 'http://localhost:3001';

describe('collectionItemsApi', () => {
  it('createCollectionItem returns item', async () => {
    const result = await collectionItemsApi.createCollectionItem({
      collection_id: 1,
      video_id: 2,
      title: 'Episode 1',
      sort_order: 1,
    });
    expect(result.title).toBe('Episode 1');
    expect(result.collection_id).toBe(1);
  });

  it('updateCollectionItem returns item', async () => {
    const result = await collectionItemsApi.updateCollectionItem(5, {
      title: 'Episode 2',
      sort_order: 2,
    });
    expect(result.id).toBe(5);
    expect(result.title).toBe('Episode 2');
  });

  it('deleteCollectionItem resolves', async () => {
    await expect(collectionItemsApi.deleteCollectionItem(5)).resolves.toBeUndefined();
  });

  it('throws on api error', async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/collection-items`, () => {
        return HttpResponse.json({
          success: false,
          code: 400,
          message: 'bad',
          error: { type: 'VALIDATION_ERROR', code: 'INVALID_PARAMS', message: 'bad' },
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      })
    );

    await expect(
      collectionItemsApi.createCollectionItem({
        collection_id: 1,
        video_id: 2,
        title: 'Episode 1',
      })
    ).rejects.toThrow('bad');
  });
});
