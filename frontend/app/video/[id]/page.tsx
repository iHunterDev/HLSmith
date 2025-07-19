'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import VideoPlayer from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { videoApi } from '@/api/video';
import { Video, VideoStatus } from '@/lib/types';

interface VideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function VideoPage({ params }: VideoPageProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const router = useRouter();

  const loadVideo = useCallback(async () => {
    if (!videoId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await videoApi.getVideoStatus(parseInt(videoId));
      setVideo(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || '视频加载失败'
        : '视频加载失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    params.then(resolvedParams => {
      setVideoId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (videoId) {
      loadVideo();
    }
  }, [videoId, loadVideo]);

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载视频中...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !video) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">加载失败</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">{error || '视频不存在'}</p>
              <Button onClick={handleBack}>返回控制台</Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  if (video.status !== VideoStatus.COMPLETED) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回控制台
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>{video.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                {video.status === VideoStatus.UPLOADED && (
                  <div>
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600">视频正在等待处理...</p>
                  </div>
                )}
                
                {video.status === VideoStatus.PROCESSING && (
                  <div>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600">视频处理中...</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${video.conversion_progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {video.conversion_progress}% 完成
                    </p>
                  </div>
                )}
                
                {video.status === VideoStatus.FAILED && (
                  <div>
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-8 h-8 text-red-500">✕</div>
                    </div>
                    <p className="text-red-600">视频处理失败</p>
                    <p className="text-sm text-gray-500">请重新上传或联系支持</p>
                  </div>
                )}
                
                <Button onClick={handleBack}>返回控制台</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const videoUrl = video.hls_url || '';
  const posterUrl = video.thumbnail_url;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回控制台
          </Button>

          <div className="space-y-6">
            {/* Video Player */}
            <Card>
              <CardContent className="p-0">
                <VideoPlayer
                  src={videoUrl}
                  title={video.title}
                  poster={posterUrl}
                  className="w-full aspect-video"
                />
              </CardContent>
            </Card>

            {/* Video Info */}
            <Card>
              <CardHeader>
                <CardTitle>{video.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">文件名</p>
                    <p className="font-medium">{video.original_filename}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">文件大小</p>
                    <p className="font-medium">{(video.file_size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  {video.duration && (
                    <div>
                      <p className="text-gray-500">时长</p>
                      <p className="font-medium">
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toFixed(0).padStart(2, '0')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">上传时间</p>
                    <p className="font-medium">
                      {new Date(video.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}