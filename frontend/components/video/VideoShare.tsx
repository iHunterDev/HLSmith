'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { videoApi, shareApi, getErrorMessage } from '@/lib/api';
import { ShareResponse } from '@/lib/types';
import { Share2, Copy, Eye, EyeOff, Trash2, AlertCircle } from 'lucide-react';

interface VideoShareProps {
  videoId: number;
  videoTitle: string;
}

export default function VideoShare({ videoId, videoTitle }: VideoShareProps) {
  const [shares, setShares] = useState<ShareResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  // 加载分享列表
  const loadShares = async () => {
    setLoading(true);
    setError('');
    try {
      const shareList = await videoApi.getVideoShares(videoId);
      setShares(shareList);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`加载分享列表失败: ${errorMessage}`);
      console.error('Failed to load shares:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShares();
  }, [videoId]);

  // 生成新的分享链接
  const handleGenerateShare = async () => {
    setGenerating(true);
    setError('');
    try {
      const newShare = await videoApi.generateShareLink(videoId);
      setShares(prev => [newShare, ...prev]);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`生成分享链接失败: ${errorMessage}`);
      console.error('Failed to generate share:', error);
    } finally {
      setGenerating(false);
    }
  };

  // 切换分享状态
  const handleToggleStatus = async (shareId: number, currentStatus: boolean) => {
    try {
      await shareApi.toggleShareStatus(shareId);
      setShares(prev => prev.map(share => 
        share.id === shareId 
          ? { ...share, is_active: !currentStatus }
          : share
      ));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`切换分享状态失败: ${errorMessage}`);
      console.error('Failed to toggle share status:', error);
    }
  };

  // 删除分享链接
  const handleDeleteShare = async (shareId: number) => {
    if (!confirm('确定要删除这个分享链接吗？删除后将无法恢复。')) return;

    try {
      await shareApi.deleteShare(shareId);
      setShares(prev => prev.filter(share => share.id !== shareId));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`删除分享链接失败: ${errorMessage}`);
      console.error('Failed to delete share:', error);
    }
  };

  // 复制链接到剪贴板
  const handleCopyLink = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // 这里可以添加一个toast通知
      alert('链接已复制到剪贴板');
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('复制失败，请手动复制链接');
    }
  };


  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              分享视频
            </CardTitle>
            <CardDescription>
              为 &quot;{videoTitle}&quot; 创建和管理分享链接
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateShare}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            生成新的分享链接
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="ml-auto text-red-700 hover:text-red-800 h-auto p-1"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">加载中...</p>
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Share2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>还没有创建任何分享链接</p>
            <p className="text-sm mt-1">点击上方按钮创建第一个分享链接</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shares.map((share) => (
              <div
                key={share.id}
                className={`p-4 border rounded-lg ${
                  share.is_active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        share.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {share.is_active ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            已启用
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            已禁用
                          </>
                        )}
                      </span>
                      <span className="text-sm text-gray-500">
                        访问次数: {share.access_count}
                      </span>
                    </div>

                    <div className="font-mono text-sm bg-white p-2 rounded border break-all mb-2">
                      {share.share_url}
                    </div>

                    <p className="text-xs text-gray-500">
                      创建时间: {formatDate(share.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    {/* 复制链接 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(share.share_url)}
                      title="复制链接"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>


                    {/* 切换状态 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(share.id, share.is_active)}
                      title={share.is_active ? "禁用分享" : "启用分享"}
                    >
                      {share.is_active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>

                    {/* 删除分享 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteShare(share.id)}
                      title="删除分享链接"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分享功能说明 */}
        {shares.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">分享说明</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 分享链接永久有效，接收方无需注册即可观看</li>
              <li>• 可以随时启用或禁用分享链接</li>
              <li>• 支持所有标准HLS播放器和浏览器</li>
              <li>• 系统会自动统计访问次数</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}