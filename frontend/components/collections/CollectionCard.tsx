import type { Collection } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(0, 10);
}

type CollectionCardProps = {
  collection: Collection;
  onEdit: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
};

export default function CollectionCard({ collection, onEdit, onDelete }: CollectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{collection.title}</CardTitle>
        {collection.description && <CardDescription>{collection.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {collection.cover && (
            <img
              src={collection.cover}
              alt={`${collection.title} cover`}
              className="h-16 w-24 rounded object-cover"
            />
          )}
          <div className="text-sm text-gray-600">更新于 {formatDate(collection.updated_at)}</div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(collection)}>
              编辑
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(collection)}>
              删除
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
