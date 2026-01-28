import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { collectionsApi } from '../collections';
import { server } from '../../test/msw/server';

const API_BASE_URL = 'http://localhost:3001';

describe('collectionsApi', () => {
  it('getCollections returns list', async () => {
    const result = await collectionsApi.getCollections();
    expect(result.total).toBe(1);
    expect(result.collections[0].title).toBe('Series A');
  });

  it('getCollectionDetail returns detail', async () => {
    const result = await collectionsApi.getCollectionDetail(2);
    expect(result.collection.title).toBe('Series 2');
    expect(result.items[0].collection_id).toBe(2);
  });

  it('createCollection returns created collection', async () => {
    const result = await collectionsApi.createCollection({ title: 'Series B', description: 'desc', cover: 'cover' });
    expect(result.title).toBe('Series B');
  });

  it('updateCollection returns updated collection', async () => {
    const result = await collectionsApi.updateCollection(3, { title: 'Series C', description: 'desc2', cover: 'cover2' });
    expect(result.id).toBe(3);
    expect(result.title).toBe('Series C');
  });

  it('deleteCollection resolves', async () => {
    await expect(collectionsApi.deleteCollection(1)).resolves.toBeUndefined();
  });

  it('throws on api error', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/collections`, () => {
        return HttpResponse.json({
          success: false,
          code: 400,
          message: 'bad',
          error: { type: 'VALIDATION_ERROR', code: 'INVALID_PARAMS', message: 'bad' },
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      })
    );

    await expect(collectionsApi.getCollections()).rejects.toThrow('bad');
  });
});
