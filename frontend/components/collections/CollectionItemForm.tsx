import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FormMessages from '@/components/collections/FormMessages';

type CollectionItemFormProps = {
  title: string;
  videoId: string;
  sortOrder: string;
  availableFrom: string;
  availableUntil: string;
  editing: boolean;
  message?: string | null;
  error?: string | null;
  onTitleChange: (value: string) => void;
  onVideoIdChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onAvailableFromChange: (value: string) => void;
  onAvailableUntilChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function CollectionItemForm({
  title,
  videoId,
  sortOrder,
  availableFrom,
  availableUntil,
  editing,
  message,
  error,
  onTitleChange,
  onVideoIdChange,
  onSortOrderChange,
  onAvailableFromChange,
  onAvailableUntilChange,
  onSubmit,
  onCancel,
}: CollectionItemFormProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{editing ? '编辑集数' : '新增集数'}</CardTitle>
        <CardDescription>管理合集内的集数信息</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <Input placeholder="标题" value={title} onChange={(event) => onTitleChange(event.target.value)} />
          <Input placeholder="video_id" value={videoId} onChange={(event) => onVideoIdChange(event.target.value)} />
          <Input
            placeholder="sort_order"
            value={sortOrder}
            onChange={(event) => onSortOrderChange(event.target.value)}
          />
          <Input
            placeholder="available_from"
            value={availableFrom}
            onChange={(event) => onAvailableFromChange(event.target.value)}
          />
          <Input
            placeholder="available_until"
            value={availableUntil}
            onChange={(event) => onAvailableUntilChange(event.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={onSubmit}>{editing ? '保存' : '创建'}</Button>
            {editing && (
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
          </div>
          <FormMessages success={message} error={error} />
        </div>
      </CardContent>
    </Card>
  );
}
