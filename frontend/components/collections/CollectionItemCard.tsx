import type { CollectionItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatWindow(item: CollectionItem): string {
  const from = item.available_from;
  const until = item.available_until;
  if (!from && !until) {
    return '可随时观看';
  }
  if (from && until) {
    return `${formatDateTime(from)} ~ ${formatDateTime(until)}`;
  }
  if (from) {
    return `开始: ${formatDateTime(from)}`;
  }
  return `截止: ${formatDateTime(until as string)}`;
}

type CollectionItemCardProps = {
  item: CollectionItem;
  onEdit: (item: CollectionItem) => void;
  onDelete: (item: CollectionItem) => void;
};

export default function CollectionItemCard({ item, onEdit, onDelete }: CollectionItemCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
        <CardDescription>排序: {item.sort_order ?? '未设置'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <div className="h-20 w-28 overflow-hidden rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
            {item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt={item.video_title || item.title}
                className="h-full w-full object-cover"
              />
            ) : (
              '暂无封面'
            )}
          </div>
          <div className="flex-1 space-y-2 text-sm text-gray-600">
            <div>视频ID: {item.video_id}</div>
            {item.video_title && <div>视频标题: {item.video_title}</div>}
            <div>播放时间: {formatWindow(item)}</div>
          </div>
          <div className="ml-auto flex gap-2 self-start">
            <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
              编辑
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(item)}>
              删除
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
