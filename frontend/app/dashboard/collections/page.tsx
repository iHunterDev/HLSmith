'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import { collectionsApi } from '@/api/collections';
import type { Collection } from '@/lib/types';
import CollectionForm from '@/components/collections/CollectionForm';
import CollectionCard from '@/components/collections/CollectionCard';
import { Input } from '@/components/ui/input';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);

  const filteredCollections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return collections;
    return collections.filter((collection) => {
      return (
        collection.title.toLowerCase().includes(term) ||
        (collection.description || '').toLowerCase().includes(term)
      );
    });
  }, [collections, searchTerm]);

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
    setCoverUploadError(null);
  };

  const handleSubmit = async () => {
    setActionMessage(null);
    setActionError(null);
    if (!formTitle.trim()) {
      setActionError('请输入合集标题');
      return;
    }
    if (coverUploading) {
      setActionError('封面上传中，请稍后再提交');
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
    setCoverUploadError(null);
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

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    setCoverUploadError(null);
    setCoverUploading(true);
    try {
      const result = await collectionsApi.uploadCover(file);
      setFormCover(result.cover_url || '');
    } catch (err) {
      setCoverUploadError(err instanceof Error ? err.message : '封面上传失败');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverClear = () => {
    setFormCover('');
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

          {!loading && !error && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    共 {collections.length} 个合集
                    {searchTerm.trim() && ` · 匹配 ${filteredCollections.length} 个`}
                  </div>
                  <Input
                    placeholder="搜索合集标题或描述"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="max-w-sm"
                  />
                </div>

                {collections.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 p-6 text-gray-600">
                    暂无合集，先在右侧创建一个合集。
                  </div>
                )}

                {collections.length > 0 && filteredCollections.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 p-6 text-gray-600">
                    没有找到匹配的合集，请调整搜索关键词。
                  </div>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  {filteredCollections.map((collection) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>

              <aside className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {editingId ? '编辑合集' : '新增合集'}
                      </h2>
                      <p className="text-sm text-gray-600">创建或编辑合集基础信息</p>
                    </div>
                    <div className="text-xs text-gray-500">创建后在列表里管理集数</div>
                  </div>
                  <div className="mt-4">
                    <CollectionForm
                      title={formTitle}
                      description={formDescription}
                      cover={formCover}
                      editing={Boolean(editingId)}
                      message={actionMessage}
                      error={actionError}
                      coverUploading={coverUploading}
                      coverUploadError={coverUploadError}
                      onTitleChange={setFormTitle}
                      onDescriptionChange={setFormDescription}
                      onCoverFileChange={handleCoverUpload}
                      onCoverClear={handleCoverClear}
                      onSubmit={handleSubmit}
                      onCancel={resetForm}
                    />
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
