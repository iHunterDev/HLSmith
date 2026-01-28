'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import { playbackApi } from '@/api/playback';
import { watchApi } from '@/api/watch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ToolsPage() {
  const [viewerKey, setViewerKey] = useState('');
  const [collectionItemId, setCollectionItemId] = useState('');
  const [authResult, setAuthResult] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [summaryViewerKey, setSummaryViewerKey] = useState('');
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [summaryItems, setSummaryItems] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleAuthorize = async () => {
    setAuthError(null);
    setAuthResult(null);
    const id = Number(collectionItemId);
    if (!viewerKey || !Number.isFinite(id)) {
      setAuthError('请输入 viewer_key 和集数 ID');
      return;
    }
    try {
      const result = await playbackApi.authorizePlayback({
        viewer_key: viewerKey,
        collection_item_id: id,
      });
      setAuthResult(`playable=${result.playable} token=${result.playback_token}`);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '授权失败');
    }
  };

  const handleSummary = async () => {
    setSummaryError(null);
    setSummaryResult(null);
    setSummaryItems(null);
    if (!summaryViewerKey) {
      setSummaryError('请输入 viewer_key');
      return;
    }
    try {
      const result = await watchApi.getWatchSummary(summaryViewerKey);
      setSummaryResult(`total_seconds=${result.total_seconds}`);
      if (result.items.length > 0) {
        const itemsText = result.items
          .map((item) => `item:${item.collection_item_id} ${item.total_seconds}s`)
          .join(' | ');
        setSummaryItems(itemsText);
      }
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : '查询失败');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">工具</h1>
            <p className="text-gray-600">播放授权与学习时长查询</p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>播放授权检查</CardTitle>
                <CardDescription>输入 viewer_key 与集数 ID 获取播放令牌</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Input
                    placeholder="viewer_key"
                    value={viewerKey}
                    onChange={(event) => setViewerKey(event.target.value)}
                  />
                  <Input
                    placeholder="collection_item_id"
                    value={collectionItemId}
                    onChange={(event) => setCollectionItemId(event.target.value)}
                  />
                  <Button onClick={handleAuthorize}>提交授权</Button>
                  {authResult && <div className="text-sm text-gray-700">{authResult}</div>}
                  {authError && <div className="text-sm text-red-600">{authError}</div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>学习时长查询</CardTitle>
                <CardDescription>输入 viewer_key 获取学习时长汇总</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Input
                    placeholder="viewer_key"
                    value={summaryViewerKey}
                    onChange={(event) => setSummaryViewerKey(event.target.value)}
                  />
                  <Button onClick={handleSummary}>查询</Button>
                  {summaryResult && <div className="text-sm text-gray-700">{summaryResult}</div>}
                  {summaryItems && <div className="text-sm text-gray-700">{summaryItems}</div>}
                  {summaryError && <div className="text-sm text-red-600">{summaryError}</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
