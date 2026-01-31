import { http, HttpResponse } from 'msw';

const API_BASE_URL = 'http://localhost:3001';

export const handlers = [
  http.get(`${API_BASE_URL}/api/collections`, () => {
    return HttpResponse.json({
      success: true,
      code: 200,
      message: 'ok',
      data: {
        collections: [
          {
            id: 1,
            title: 'Series A',
            description: 'desc',
            cover: 'cover',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      },
      timestamp: new Date().toISOString(),
    });
  }),
  http.get(`${API_BASE_URL}/api/collections/:id`, ({ params }) => {
    const id = Number(params.id);
    return HttpResponse.json({
      success: true,
      code: 200,
      message: 'ok',
      data: {
        collection: {
          id,
          title: `Series ${id}`,
          description: 'desc',
          cover: 'cover',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        items: [
          {
            id: 10,
            collection_id: id,
            video_id: 2,
            title: 'Episode 1',
            sort_order: 1,
            available_from: null,
            available_until: null,
            thumbnail_url: null,
            video_title: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      },
      timestamp: new Date().toISOString(),
    });
  }),
  http.post(`${API_BASE_URL}/api/collections`, async ({ request }) => {
    const body = (await request.json()) as { title: string; description?: string; cover?: string };
    return HttpResponse.json({
      success: true,
      code: 201,
      message: 'ok',
      data: {
        collection: {
          id: 1,
          title: body.title,
          description: body.description ?? null,
          cover: body.cover ?? null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  }),
  http.patch(`${API_BASE_URL}/api/collections/:id`, async ({ params, request }) => {
    const body = (await request.json()) as { title: string; description?: string; cover?: string };
    return HttpResponse.json({
      success: true,
      code: 200,
      message: 'ok',
      data: {
        collection: {
          id: Number(params.id),
          title: body.title,
          description: body.description ?? null,
          cover: body.cover ?? null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      },
      timestamp: new Date().toISOString(),
    });
  }),
  http.delete(`${API_BASE_URL}/api/collections/:id`, () => {
    return HttpResponse.json({
      success: true,
      code: 200,
      message: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),
  http.post(`${API_BASE_URL}/api/collection-items`, async ({ request }) => {
    const body = (await request.json()) as {
      collection_id: number;
      video_id: number;
      title: string;
      sort_order?: number;
      available_from?: string | null;
      available_until?: string | null;
    };
    return HttpResponse.json({
      success: true,
      code: 201,
      message: 'ok',
      data: {
        item: {
          id: 1,
          collection_id: body.collection_id,
          video_id: body.video_id,
          title: body.title,
          sort_order: body.sort_order ?? 0,
          available_from: body.available_from ?? null,
          available_until: body.available_until ?? null,
          thumbnail_url: null,
          video_title: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  }),
  http.patch(`${API_BASE_URL}/api/collection-items/:id`, async ({ params, request }) => {
    const body = (await request.json()) as {
      title: string;
      sort_order?: number;
      available_from?: string | null;
      available_until?: string | null;
      video_id?: number;
    };
    return HttpResponse.json({
      success: true,
      code: 200,
      message: 'ok',
      data: {
        item: {
          id: Number(params.id),
          collection_id: 1,
          video_id: body.video_id ?? 2,
          title: body.title,
          sort_order: body.sort_order ?? 0,
          available_from: body.available_from ?? null,
          available_until: body.available_until ?? null,
          thumbnail_url: null,
          video_title: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      },
      timestamp: new Date().toISOString(),
    });
  }),
  http.delete(`${API_BASE_URL}/api/collection-items/:id`, () => {
    return HttpResponse.json({
      success: true,
      code: 200,
      message: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),
];
