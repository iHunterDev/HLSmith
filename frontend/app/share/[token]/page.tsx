'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { shareApi } from '@/api/share';
import { getErrorMessage } from '@/lib/http';
import { ShareInfo } from '@/lib/types';
import { AlertCircle, Clock, Eye } from 'lucide-react';
import dynamic from 'next/dynamic';

// 动态导入VideoPlayer组件，避免SSR问题
const VideoPlayer = dynamic(() => import('@/components/video/VideoPlayer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">加载播放器...</p>
      </div>
    </div>
  )
});

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string;
  
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('无效的分享令牌');
      setLoading(false);
      return;
    }

    loadShareInfo();
  }, [token]);

  const loadShareInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const info = await shareApi.getShareInfo(token);
      setShareInfo(info);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`加载分享信息失败: ${errorMessage}`);
      console.error('Failed to load share info:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '未知';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">访问失败</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                请检查分享链接是否正确，或联系分享者获取新的链接。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">内容不存在</h2>
              <p className="text-gray-600">无法找到分享的视频内容</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const playlistUrl = shareApi.getSharePlaylistUrl(token);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">HLSmith 视频分享</h1>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 视频播放器 */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                  <VideoPlayer 
                    src={playlistUrl}
                    poster={undefined}
                    title={shareInfo.title}
                    className="w-full h-full"
                  />
                </div>
                
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {shareInfo.title}
                  </h2>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {shareInfo.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(shareInfo.duration)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{shareInfo.view_count} 次观看</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>分享于 {formatDate(shareInfo.shared_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 分享说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">关于此分享</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">播放说明</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 支持所有现代浏览器播放</li>
                    <li>• 支持自适应码率和画质调节</li>
                    <li>• 支持全屏播放和快进快退</li>
                    <li>• 移动设备友好的触控操作</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">技术规格</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 格式: HLS (HTTP Live Streaming)</li>
                    <li>• 编码: H.264 视频 + AAC 音频</li>
                    <li>• 分片: 10秒时长片段</li>
                    <li>• 兼容: iOS、Android、桌面浏览器</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 推广信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">HLSmith</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  专业的视频处理和分享平台，提供高质量的视频转码和流媒体服务。
                </p>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    ✨ 支持多种视频格式上传
                  </div>
                  <div className="text-xs text-gray-500">
                    🚀 快速的云端视频处理
                  </div>
                  <div className="text-xs text-gray-500">
                    🔗 安全的分享链接管理
                  </div>
                  <div className="text-xs text-gray-500">
                    📱 跨平台兼容播放
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Powered by HLSmith - 专业视频处理平台</p>
          </div>
        </div>
      </footer>
    </div>
  );
}