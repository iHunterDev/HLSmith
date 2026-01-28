import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ToolsPage from '@/app/dashboard/tools/page';

vi.mock('@/components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

describe('ToolsPage', () => {
  it('shows authorize result after submit', async () => {
    render(<ToolsPage />);

    fireEvent.change(screen.getAllByPlaceholderText('viewer_key')[0], {
      target: { value: 'viewer' },
    });
    fireEvent.change(screen.getByPlaceholderText('collection_item_id'), {
      target: { value: '10' },
    });

    fireEvent.click(screen.getByText('提交授权'));

    await screen.findByText('playable=true token=viewer-10');
  });

  it('shows watch summary and items after submit', async () => {
    render(<ToolsPage />);

    const inputs = screen.getAllByPlaceholderText('viewer_key');
    fireEvent.change(inputs[1], { target: { value: 'viewer-key' } });

    fireEvent.click(screen.getByText('查询'));

    await screen.findByText('total_seconds=120');
    await screen.findByText('item:10 120s');
  });
});
