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
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCoverChange: (value: string) => void;
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
  onTitleChange,
  onDescriptionChange,
  onCoverChange,
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
        <div className="grid gap-3">
          <Input placeholder="标题" value={title} onChange={(event) => onTitleChange(event.target.value)} />
          <Input
            placeholder="描述"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
          <Input placeholder="封面 URL" value={cover} onChange={(event) => onCoverChange(event.target.value)} />
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
