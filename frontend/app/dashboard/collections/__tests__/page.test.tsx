import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import CollectionsPage from '@/app/dashboard/collections/page';
import { collectionsApi } from '@/api/collections';
import { server } from '@/test/msw/server';

const API_BASE_URL = 'http://localhost:3001';

vi.mock('@/components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('CollectionsPage', () => {
  it('initial load calls getCollections', async () => {
    const spy = vi.spyOn(collectionsApi, 'getCollections');
    render(<CollectionsPage />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockRestore();
  });

  it('renders empty state', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/collections`, () => {
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          data: { collections: [], total: 0 },
          timestamp: new Date().toISOString(),
        });
      })
    );

    render(<CollectionsPage />);
    await screen.findByText('暂无合集，先在右侧创建一个合集。');
  });

  it('renders collection list with cover and updated time', async () => {
    render(<CollectionsPage />);
    await screen.findByText('Series A');
    expect(screen.getByText('desc')).toBeInTheDocument();
    expect(screen.getByAltText('Series A cover')).toBeInTheDocument();
    expect(screen.getByText(/更新于/)).toBeInTheDocument();
  });

  it('creates collection successfully', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/collections`, () => {
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          data: { collections: [], total: 0 },
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
              id: 2,
              title: body.title,
              description: body.description ?? null,
              cover: body.cover ?? null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
          timestamp: new Date().toISOString(),
        }, { status: 201 });
      })
    );

    render(<CollectionsPage />);
    await screen.findByText('暂无合集，先在右侧创建一个合集。');

    fireEvent.change(screen.getByLabelText('合集标题'), { target: { value: 'Series B' } });
    fireEvent.click(screen.getByText('创建'));

    await screen.findByText('创建成功');
    await screen.findByText('Series B');
  });

  it('shows validation error when title missing', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/collections`, () => {
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          data: { collections: [], total: 0 },
          timestamp: new Date().toISOString(),
        });
      })
    );

    render(<CollectionsPage />);
    await screen.findByText('暂无合集，先在右侧创建一个合集。');
    fireEvent.click(screen.getByText('创建'));
    await screen.findByText('请输入合集标题');
  });

  it('updates collection successfully', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/collections`, () => {
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          data: {
            collections: [
              {
                id: 3,
                title: 'Series C',
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
      })
    );

    render(<CollectionsPage />);
    await screen.findByText('Series C');
    fireEvent.click(screen.getByText('编辑'));
    fireEvent.change(screen.getByLabelText('合集标题'), { target: { value: 'Series C Updated' } });
    fireEvent.click(screen.getByText('保存'));
    await screen.findByText('更新成功');
    await screen.findByText('Series C Updated');
  });

  it('deletes collection successfully', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    server.use(
      http.get(`${API_BASE_URL}/api/collections`, () => {
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          data: {
            collections: [
              {
                id: 4,
                title: 'Series D',
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
      http.delete(`${API_BASE_URL}/api/collections/:id`, () => {
        return HttpResponse.json({
          success: true,
          code: 200,
          message: 'ok',
          timestamp: new Date().toISOString(),
        });
      })
    );

    render(<CollectionsPage />);
    await screen.findByText('Series D');
    fireEvent.click(screen.getByText('删除'));
    await screen.findByText('删除成功');
    await waitFor(() => {
      expect(screen.queryByText('Series D')).toBeNull();
    });
    confirmSpy.mockRestore();
  });
});
