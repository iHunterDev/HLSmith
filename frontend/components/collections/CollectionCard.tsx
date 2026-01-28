'use client';

import { useRouter } from 'next/navigation';
import type { Collection } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('zh-CN');
}

type CollectionCardProps = {
  collection: Collection;
  onEdit: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
};

export default function CollectionCard({ collection, onEdit, onDelete }: CollectionCardProps) {
  const router = useRouter();

  return (
    <Card className="overflow-hidden">
      <div className="relative h-44 w-full bg-gray-100">
        {collection.cover ? (
          <img
            src={collection.cover}
            alt={`${collection.title} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            暂无封面
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{collection.title}</CardTitle>
        {collection.description && <CardDescription>{collection.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>合集ID: {collection.id}</span>
          <span>更新于 {formatDate(collection.updated_at)}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/collections/${collection.id}`)}
          >
            集数管理
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(collection)}>
            编辑
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(collection)}>
            删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
