import type { CollectionItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(0, 16).replace('T', ' ');
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
        <CardDescription>排序: {item.sort_order}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>播放时间: {formatWindow(item)}</span>
          <div className="ml-auto flex gap-2">
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
