import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FormMessages from '@/components/collections/FormMessages';

type CollectionFormProps = {
  title: string;
  description: string;
  cover: string;
  editing: boolean;
  message?: string | null;
  error?: string | null;
  coverUploading?: boolean;
  coverUploadError?: string | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCoverFileChange: (file: File | null) => void;
  onCoverClear: () => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function CollectionForm({
  title,
  description,
  cover,
  editing,
  message,
  error,
  coverUploading,
  coverUploadError,
  onTitleChange,
  onDescriptionChange,
  onCoverFileChange,
  onCoverClear,
  onSubmit,
  onCancel,
}: CollectionFormProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{editing ? '编辑合集' : '新增合集'}</CardTitle>
        <CardDescription>填写合集基础信息</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="collection-title" className="text-sm font-medium text-gray-700">
              合集标题
            </label>
            <Input
              id="collection-title"
              placeholder="例如：高效剪辑训练营"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
            />
            <p className="text-xs text-gray-500">必填，用于前端展示课程名称。</p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="collection-description" className="text-sm font-medium text-gray-700">
              合集描述
            </label>
            <Input
              id="collection-description"
              placeholder="一句话说明这个合集内容"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
            <p className="text-xs text-gray-500">可选，帮助运营快速识别课程。</p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="collection-cover" className="text-sm font-medium text-gray-700">
              合集封面
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                id="collection-cover"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => onCoverFileChange(event.target.files?.[0] || null)}
              />
              {cover && (
                <Button type="button" variant="outline" onClick={onCoverClear}>
                  移除封面
                </Button>
              )}
            </div>
            {coverUploading && <p className="text-xs text-blue-600">封面上传中...</p>}
            {coverUploadError && <p className="text-xs text-red-600">{coverUploadError}</p>}
            {cover && (
              <div className="mt-2">
                <img src={cover} alt="cover preview" className="h-24 w-40 rounded object-cover" />
              </div>
            )}
            <p className="text-xs text-gray-500">支持 JPG/PNG/WEBP，建议 16:9。</p>
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
