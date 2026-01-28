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
  selectedVideoLabel?: string | null;
  onTitleChange: (value: string) => void;
  onVideoIdChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onAvailableFromChange: (value: string) => void;
  onAvailableUntilChange: (value: string) => void;
  onOpenVideoPicker: () => void;
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
  selectedVideoLabel,
  onTitleChange,
  onVideoIdChange,
  onSortOrderChange,
  onAvailableFromChange,
  onAvailableUntilChange,
  onOpenVideoPicker,
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
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="collection-item-title" className="text-sm font-medium text-gray-700">
              集数标题
            </label>
            <Input
              id="collection-item-title"
              placeholder="例如：第 1 课 - 开始剪辑"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="collection-item-video" className="text-sm font-medium text-gray-700">
              选择视频
            </label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="collection-item-video"
                type="number"
                placeholder="视频库里的数字 ID"
                value={videoId}
                onChange={(event) => onVideoIdChange(event.target.value)}
              />
              <Button type="button" variant="outline" onClick={onOpenVideoPicker}>
                从视频库选择
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {selectedVideoLabel ? `已选择：${selectedVideoLabel}` : '必填，用于绑定视频。'}
            </p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="collection-item-order" className="text-sm font-medium text-gray-700">
              排序
            </label>
            <Input
              id="collection-item-order"
              type="number"
              placeholder="数字越小越靠前"
              value={sortOrder}
              onChange={(event) => onSortOrderChange(event.target.value)}
            />
            <p className="text-xs text-gray-500">可选，不填则按创建时间排序。</p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="collection-item-available-from" className="text-sm font-medium text-gray-700">
              可播开始时间
            </label>
            <Input
              id="collection-item-available-from"
              type="datetime-local"
              placeholder="YYYY-MM-DD HH:mm"
              value={availableFrom}
              onChange={(event) => onAvailableFromChange(event.target.value)}
            />
            <p className="text-xs text-gray-500">可选，不填则不限制开始时间（本地时间）。</p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="collection-item-available-until" className="text-sm font-medium text-gray-700">
              可播结束时间
            </label>
            <Input
              id="collection-item-available-until"
              type="datetime-local"
              placeholder="YYYY-MM-DD HH:mm"
              value={availableUntil}
              onChange={(event) => onAvailableUntilChange(event.target.value)}
            />
            <p className="text-xs text-gray-500">可选，不填则不限制结束时间（本地时间）。</p>
          </div>
          <div className="flex flex-wrap gap-2">
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
