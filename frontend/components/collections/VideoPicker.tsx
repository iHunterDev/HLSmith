'use client';

import { useEffect, useState } from 'react';
import { videoApi } from '@/api/video';
import { Video, VideoStatus, PaginationMeta } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type VideoPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (video: Video) => void;
};

export default function VideoPicker({ open, onClose, onSelect }: VideoPickerProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    has_next: false,
    has_prev: false,
  });

  const loadVideos = async (page = 1, q = query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await videoApi.getVideos({
        page,
        limit: 10,
        q: q || undefined,
        status: VideoStatus.COMPLETED,
        sort_by: 'created_at',
        sort_order: 'DESC',
      });
      setVideos(response.videos);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载视频失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadVideos(1);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] m-4 overflow-y-auto">
        <Card className="shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>选择视频</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="搜索视频标题"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    loadVideos(1, query);
                  }
                }}
              />
              <Button onClick={() => loadVideos(1, query)}>搜索</Button>
            </div>

            {loading && <div className="text-sm text-gray-600">加载中...</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}

            {!loading && videos.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-gray-600">
                没有找到可用的视频（仅展示已完成的视频）。
              </div>
            )}

            <div className="space-y-3">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50"
                >
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="h-14 w-20 rounded object-cover"
                    />
                  ) : (
                    <div className="h-14 w-20 rounded bg-gray-200" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{video.title}</div>
                    <div className="text-xs text-gray-500">
                      ID: {video.id} · {Math.round(video.file_size / 1024 / 1024)}MB
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onSelect(video)}>
                    选择
                  </Button>
                </div>
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadVideos(pagination.page - 1)}
                  disabled={!pagination.has_prev}
                >
                  上一页
                </Button>
                <span>
                  第 {pagination.page} / {pagination.pages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadVideos(pagination.page + 1)}
                  disabled={!pagination.has_next}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
