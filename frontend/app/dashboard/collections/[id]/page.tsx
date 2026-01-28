'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import { collectionsApi } from '@/api/collections';
import { collectionItemsApi } from '@/api/collectionItems';
import type { CollectionDetailResponse, CollectionItem } from '@/lib/types';
import CollectionItemForm from '@/components/collections/CollectionItemForm';
import CollectionItemCard from '@/components/collections/CollectionItemCard';
import VideoPicker from '@/components/collections/VideoPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const toLocalInputValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const toIsoValue = (value: string) => {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
};

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const collectionId = useMemo(() => Number(params?.id), [params]);
  const [detail, setDetail] = useState<CollectionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemVideoId, setItemVideoId] = useState('');
  const [itemSortOrder, setItemSortOrder] = useState('');
  const [itemAvailableFrom, setItemAvailableFrom] = useState('');
  const [itemAvailableUntil, setItemAvailableUntil] = useState('');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemMessage, setItemMessage] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [selectedVideoLabel, setSelectedVideoLabel] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await collectionsApi.getCollectionDetail(collectionId);
        if (!mounted) return;
        setDetail(data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    if (Number.isFinite(collectionId)) {
      load();
    } else {
      setError('合集ID无效');
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [collectionId]);

  const resetItemForm = () => {
    setItemTitle('');
    setItemVideoId('');
    setItemSortOrder('');
    setItemAvailableFrom('');
    setItemAvailableUntil('');
    setEditingItemId(null);
    setSelectedVideoLabel(null);
  };

  const validateItemForm = () => {
    if (!itemTitle.trim() || !itemVideoId.trim()) {
      return '请输入集数标题和视频ID';
    }
    const videoIdValue = Number(itemVideoId);
    if (!Number.isFinite(videoIdValue)) {
      return '视频ID必须是数字';
    }
    if (itemSortOrder.trim()) {
      const sortValue = Number(itemSortOrder);
      if (!Number.isInteger(sortValue)) {
        return 'sort_order 必须整数';
      }
    }
    if (itemAvailableFrom.trim() && Number.isNaN(Date.parse(itemAvailableFrom))) {
      return 'available_from 无效';
    }
    if (itemAvailableUntil.trim() && Number.isNaN(Date.parse(itemAvailableUntil))) {
      return 'available_until 无效';
    }
    if (itemAvailableFrom.trim() && itemAvailableUntil.trim()) {
      const fromDate = new Date(itemAvailableFrom);
      const untilDate = new Date(itemAvailableUntil);
      if (fromDate > untilDate) {
        return 'available_from 不能晚于 available_until';
      }
    }
    return null;
  };

  const handleItemSubmit = async () => {
    setItemMessage(null);
    setItemError(null);
    const validation = validateItemForm();
    if (validation) {
      setItemError(validation);
      return;
    }
    const sortValue = itemSortOrder.trim() ? Number(itemSortOrder) : undefined;
    const videoId = Number(itemVideoId);
    const availableFromValue = toIsoValue(itemAvailableFrom);
    const availableUntilValue = toIsoValue(itemAvailableUntil);
    try {
      if (editingItemId) {
        const updated = await collectionItemsApi.updateCollectionItem(editingItemId, {
          title: itemTitle.trim(),
          sort_order: sortValue,
          available_from: availableFromValue,
          available_until: availableUntilValue,
          video_id: videoId,
        });
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((item) => (item.id === editingItemId ? updated : item)),
              }
            : prev
        );
        setItemMessage('更新成功');
      } else {
        const created = await collectionItemsApi.createCollectionItem({
          collection_id: collectionId,
          video_id: videoId,
          title: itemTitle.trim(),
          sort_order: sortValue,
          available_from: availableFromValue,
          available_until: availableUntilValue,
        });
        setDetail((prev) =>
          prev ? { ...prev, items: [created, ...prev.items] } : prev
        );
        setItemMessage('创建成功');
      }
      resetItemForm();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleItemEdit = (item: CollectionItem) => {
    setEditingItemId(item.id);
    setItemTitle(item.title);
    setItemVideoId(String(item.video_id));
    setItemSortOrder(item.sort_order ? String(item.sort_order) : '');
    setItemAvailableFrom(toLocalInputValue(item.available_from));
    setItemAvailableUntil(toLocalInputValue(item.available_until));
    setSelectedVideoLabel(null);
  };

  const handleItemDelete = async (item: CollectionItem) => {
    setItemMessage(null);
    setItemError(null);
    if (!window.confirm(`确认删除集数「${item.title}」?`)) {
      return;
    }
    try {
      await collectionItemsApi.deleteCollectionItem(item.id);
      setDetail((prev) =>
        prev ? { ...prev, items: prev.items.filter((row) => row.id !== item.id) } : prev
      );
      setItemMessage('删除成功');
    } catch (err) {
      setItemError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading && <div className="text-gray-600">加载中...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {detail && (
            <>
              <div className="mb-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {detail.collection.title}
                    </h1>
                    {detail.collection.description && (
                      <p className="text-gray-600">{detail.collection.description}</p>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => router.push('/dashboard/collections')}>
                    返回合集列表
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      共 {detail.items.length} 集
                      {itemSearch.trim() && (
                        <span>
                          {' '}
                          · 匹配{' '}
                          {
                            detail.items.filter((item) =>
                              item.title.toLowerCase().includes(itemSearch.trim().toLowerCase())
                            ).length
                          }{' '}
                          集
                        </span>
                      )}
                    </div>
                    <Input
                      placeholder="搜索集数标题"
                      value={itemSearch}
                      onChange={(event) => setItemSearch(event.target.value)}
                      className="max-w-xs"
                    />
                  </div>

                  {detail.items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 p-6 text-gray-600">
                      还没有集数，先在右侧新增集数。
                    </div>
                  )}

                  <div className="grid gap-4">
                    {detail.items
                      .filter((item) =>
                        item.title.toLowerCase().includes(itemSearch.trim().toLowerCase())
                      )
                      .map((item) => (
                        <CollectionItemCard
                          key={item.id}
                          item={item}
                          onEdit={handleItemEdit}
                          onDelete={handleItemDelete}
                        />
                      ))}
                  </div>
                </section>

                <aside className="space-y-4">
                  <CollectionItemForm
                    title={itemTitle}
                    videoId={itemVideoId}
                    sortOrder={itemSortOrder}
                    availableFrom={itemAvailableFrom}
                    availableUntil={itemAvailableUntil}
                    editing={Boolean(editingItemId)}
                    message={itemMessage}
                    error={itemError}
                    selectedVideoLabel={selectedVideoLabel}
                    onTitleChange={setItemTitle}
                    onVideoIdChange={(value) => {
                      setItemVideoId(value);
                      setSelectedVideoLabel(null);
                    }}
                    onSortOrderChange={setItemSortOrder}
                    onAvailableFromChange={setItemAvailableFrom}
                    onAvailableUntilChange={setItemAvailableUntil}
                    onOpenVideoPicker={() => setShowVideoPicker(true)}
                    onSubmit={handleItemSubmit}
                    onCancel={resetItemForm}
                  />
                  <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
                    <div className="font-medium text-gray-900">可播时间说明</div>
                    <div className="mt-2">不填写即代表不限制时间。</div>
                    <div className="mt-1">时间将按本地时区输入并保存。</div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
      <VideoPicker
        open={showVideoPicker}
        onClose={() => setShowVideoPicker(false)}
        onSelect={(video) => {
          setItemVideoId(String(video.id));
          setSelectedVideoLabel(`${video.title} (ID ${video.id})`);
          setShowVideoPicker(false);
        }}
      />
    </ProtectedRoute>
  );
}
