'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import { collectionsApi } from '@/api/collections';
import type { Collection } from '@/lib/types';
import CollectionForm from '@/components/collections/CollectionForm';
import CollectionCard from '@/components/collections/CollectionCard';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCover, setFormCover] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await collectionsApi.getCollections();
        if (!mounted) return;
        setCollections(data.collections || []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCover('');
    setEditingId(null);
  };

  const handleSubmit = async () => {
    setActionMessage(null);
    setActionError(null);
    if (!formTitle.trim()) {
      setActionError('请输入合集标题');
      return;
    }
    try {
      if (editingId) {
        const updated = await collectionsApi.updateCollection(editingId, {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          cover: formCover.trim() || null,
        });
        setCollections((prev) =>
          prev.map((item) => (item.id === editingId ? updated : item))
        );
        setActionMessage('更新成功');
      } else {
        const created = await collectionsApi.createCollection({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          cover: formCover.trim() || null,
        });
        setCollections((prev) => [created, ...prev]);
        setActionMessage('创建成功');
      }
      resetForm();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleEdit = (collection: Collection) => {
    setEditingId(collection.id);
    setFormTitle(collection.title);
    setFormDescription(collection.description || '');
    setFormCover(collection.cover || '');
  };

  const handleDelete = async (collection: Collection) => {
    setActionMessage(null);
    setActionError(null);
    if (!window.confirm(`确认删除合集「${collection.title}」?`)) {
      return;
    }
    try {
      await collectionsApi.deleteCollection(collection.id);
      setCollections((prev) => prev.filter((item) => item.id !== collection.id));
      setActionMessage('删除成功');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">合集管理</h1>
            <p className="text-gray-600">管理课程合集与集数内容</p>
          </div>

          {loading && <div className="text-gray-600">加载中...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && !error && collections.length === 0 && (
            <div className="text-gray-600">暂无合集</div>
          )}

          <CollectionForm
            title={formTitle}
            description={formDescription}
            cover={formCover}
            editing={Boolean(editingId)}
            message={actionMessage}
            error={actionError}
            onTitleChange={setFormTitle}
            onDescriptionChange={setFormDescription}
            onCoverChange={setFormCover}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />

          <div className="grid gap-4">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
