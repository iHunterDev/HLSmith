import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import CollectionDetailPage from '@/app/dashboard/collections/[id]/page';
import { collectionsApi } from '@/api/collections';
import { server } from '@/test/msw/server';

const API_BASE_URL = 'http://localhost:3001';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '2' }),
}));

vi.mock('@/components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

describe('CollectionDetailPage', () => {
  it('initial load calls getCollectionDetail', async () => {
    const spy = vi.spyOn(collectionsApi, 'getCollectionDetail');
    render(<CollectionDetailPage />);
    await waitFor(() => expect(spy).toHaveBeenCalledWith(2));
    spy.mockRestore();
  });

  it('renders items list', async () => {
    render(<CollectionDetailPage />);
    await screen.findByText('Episode 1');
    expect(screen.getByText('排序: 1')).toBeInTheDocument();
  });

  it('formats time window correctly', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/collections/:id`, () => {
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          data: {
            collection: {
              id: 2,
              title: 'Series 2',
              description: 'desc',
              cover: 'cover',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            items: [
              {
                id: 11,
                collection_id: 2,
                video_id: 2,
                title: 'Episode 2',
                sort_order: 2,
                available_from: '2024-01-02T00:00:00Z',
                available_until: '2024-01-03T00:00:00Z',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
            ],
          },
          timestamp: new Date().toISOString(),
        });
      })
    );

    render(<CollectionDetailPage />);
    await screen.findByText('Episode 2');
    expect(screen.getByText('播放时间: 2024-01-02 00:00 ~ 2024-01-03 00:00')).toBeInTheDocument();
  });

  it('creates collection item successfully', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/collections/:id`, () => {
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          data: {
            collection: {
              id: 2,
              title: 'Series 2',
              description: 'desc',
              cover: 'cover',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            items: [],
          },
          timestamp: new Date().toISOString(),
        });
      }),
      http.post(`${API_BASE_URL}/api/collection-items`, async ({ request }) => {
        const body = (await request.json()) as { title: string; video_id: number; collection_id: number };
        return HttpResponse.json({
          success: true,
          code: 201,
          message: 'ok',
          data: {
            item: {
              id: 20,
              collection_id: body.collection_id,
              video_id: body.video_id,
              title: body.title,
              sort_order: 0,
              available_from: null,
              available_until: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
          timestamp: new Date().toISOString(),
        }, { status: 201 });
      })
    );

    render(<CollectionDetailPage />);
    await screen.findByText('Series 2');
    fireEvent.change(screen.getByPlaceholderText('标题'), { target: { value: 'Episode New' } });
    fireEvent.change(screen.getByPlaceholderText('video_id'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('创建'));

    await screen.findByText('创建成功');
    await screen.findByText('Episode New');
  });

  it('validates sort_order integer', async () => {
    render(<CollectionDetailPage />);
    await screen.findByText('Episode 1');
    fireEvent.change(screen.getByPlaceholderText('标题'), { target: { value: 'Episode X' } });
    fireEvent.change(screen.getByPlaceholderText('video_id'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('sort_order'), { target: { value: '1.2' } });
    fireEvent.click(screen.getByText('创建'));
    await screen.findByText('sort_order 必须整数');
  });

  it('validates available window', async () => {
    render(<CollectionDetailPage />);
    await screen.findByText('Episode 1');
    fireEvent.change(screen.getByPlaceholderText('标题'), { target: { value: 'Episode X' } });
    fireEvent.change(screen.getByPlaceholderText('video_id'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('available_from'), { target: { value: '2024-02-01T00:00:00Z' } });
    fireEvent.change(screen.getByPlaceholderText('available_until'), { target: { value: '2024-01-01T00:00:00Z' } });
    fireEvent.click(screen.getByText('创建'));
    await screen.findByText('available_from 不能晚于 available_until');
  });

  it('updates and deletes item successfully', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    server.use(
      http.get(`${API_BASE_URL}/api/collections/:id`, () => {
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          data: {
            collection: {
              id: 2,
              title: 'Series 2',
              description: 'desc',
              cover: 'cover',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            items: [
              {
                id: 30,
                collection_id: 2,
                video_id: 2,
                title: 'Episode Edit',
                sort_order: 1,
                available_from: null,
                available_until: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
            ],
          },
          timestamp: new Date().toISOString(),
        });
      }),
      http.patch(`${API_BASE_URL}/api/collection-items/:id`, async ({ params, request }) => {
        const body = (await request.json()) as { title: string; video_id: number };
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          data: {
            item: {
              id: Number(params.id),
              collection_id: 2,
              video_id: body.video_id,
              title: body.title,
              sort_order: 1,
              available_from: null,
              available_until: null,
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
      })
    );

    render(<CollectionDetailPage />);
    await screen.findByText('Episode Edit');
    fireEvent.click(screen.getByText('编辑'));
    fireEvent.change(screen.getByPlaceholderText('标题'), { target: { value: 'Episode Updated' } });
    fireEvent.change(screen.getByPlaceholderText('video_id'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('保存'));
    await screen.findByText('更新成功');
    await screen.findByText('Episode Updated');

    fireEvent.click(screen.getByText('删除'));
    await screen.findByText('删除成功');
    await waitFor(() => {
      expect(screen.queryByText('Episode Updated')).toBeNull();
    });
    confirmSpy.mockRestore();
  });
});
