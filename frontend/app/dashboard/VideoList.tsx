'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { videoApi } from '@/api/video';
import { getErrorMessage } from '@/lib/http';
import { useVideoStore } from '@/lib/store';
import { VideoStatus, PaginationMeta, SearchMeta, VideoSearchOptions } from '@/lib/types';
import { Play, Trash2, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, Share2, Search, Filter, X, Download, Edit3, Save, X as Cancel } from 'lucide-react';
import Image from 'next/image';

// 动态导入VideoShare组件
const VideoShare = dynamic(() => import('@/components/video/VideoShare'), {
  ssr: false,
  loading: () => <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
});

interface VideoListProps {
  refreshTrigger?: number;
}

export default function VideoList({ refreshTrigger }: VideoListProps) {
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ id: number; title: string } | null>(null);
  
  // 视频标题编辑状态
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    has_next: false,
    has_prev: false
  });
  const [searchMeta, setSearchMeta] = useState<SearchMeta | undefined>();
  
  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title' | 'file_size' | 'duration'>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [showFilters, setShowFilters] = useState(false);
  
  const { videos, loading, setVideos, removeVideo, setLoading } = useVideoStore();

  const loadVideos = useCallback(async (page = 1, searchOptions?: Partial<VideoSearchOptions>) => {
    setLoading(true);
    setError('');
    try {
      const options: VideoSearchOptions = {
        page,
        limit: 20,
        q: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...searchOptions
      };

      const response = await videoApi.getVideos(options);
      // Filter out any invalid video objects
      const validVideos = response.videos.filter(video => video && video.id);
      setVideos(validVideos);
      setPagination(response.pagination);
      setSearchMeta(response.search);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`加载视频列表失败: ${errorMessage}`);
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setVideos, searchQuery, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos, refreshTrigger]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个视频吗？')) return;

    try {
      await videoApi.deleteVideo(id);
      removeVideo(id);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`删除失败: ${errorMessage}`);
      console.error('Delete failed:', error);
    }
  };

  const handleRetry = async (id: number) => {
    if (!confirm('确定要重新处理这个视频吗？')) return;

    try {
      await videoApi.retryVideoProcessing(id);
      // Refresh the video list to get updated status
      await loadVideos();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`重试失败: ${errorMessage}`);
      console.error('Retry failed:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      loadVideos(newPage);
    }
  };

  const handleShare = (video: { id: number; title: string }) => {
    setSelectedVideo(video);
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSelectedVideo(null);
  };

  const handleSearch = () => {
    loadVideos(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('created_at');
    setSortOrder('DESC');
    loadVideos(1, { q: undefined, status: undefined, sort_by: 'created_at', sort_order: 'DESC' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDownload = async (id: number) => {
    try {
      await videoApi.downloadVideo(id);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`下载失败: ${errorMessage}`);
      console.error('Download failed:', error);
    }
  };

  // 视频标题编辑处理函数
  const handleStartEdit = (videoId: number, currentTitle: string) => {
    setEditingVideoId(videoId);
    setTempTitle(currentTitle);
  };

  const handleSaveEdit = async (videoId: number) => {
    if (!tempTitle.trim()) {
      setError('视频标题不能为空');
      return;
    }

    try {
      const updatedVideo = await videoApi.updateVideo(videoId, { title: tempTitle.trim() });
      
      // 更新本地视频列表中的标题
      const updatedVideos = videos.map(video => 
        video.id === videoId ? { ...video, title: updatedVideo.title } : video
      );
      setVideos(updatedVideos);
      
      // 退出编辑模式
      setEditingVideoId(null);
      setTempTitle('');
      
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`更新标题失败: ${errorMessage}`);
      console.error('Update title failed:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingVideoId(null);
    setTempTitle('');
  };

  const getStatusIcon = (status: VideoStatus) => {
    switch (status) {
      case VideoStatus.UPLOADED:
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case VideoStatus.PROCESSING:
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case VideoStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case VideoStatus.FAILED:
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: VideoStatus) => {
    switch (status) {
      case VideoStatus.UPLOADED:
        return '等待处理';
      case VideoStatus.PROCESSING:
        return '处理中';
      case VideoStatus.COMPLETED:
        return '已完成';
      case VideoStatus.FAILED:
        return '处理失败';
      default:
        return status;
    }
  };

  return (
    <>
      {/* Error Display */}
      {error && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="ml-auto text-red-700 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索视频标题..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} size="sm">
                搜索
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                size="sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                筛选
              </Button>
              {(searchQuery || statusFilter !== 'all' || sortBy !== 'created_at' || sortOrder !== 'DESC') && (
                <Button
                  variant="outline"
                  onClick={handleClearSearch}
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  清除
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-2">状态筛选</label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as VideoStatus | 'all')}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value={VideoStatus.UPLOADED}>等待处理</SelectItem>
                      <SelectItem value={VideoStatus.PROCESSING}>处理中</SelectItem>
                      <SelectItem value={VideoStatus.COMPLETED}>已完成</SelectItem>
                      <SelectItem value={VideoStatus.FAILED}>处理失败</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">排序字段</label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'created_at' | 'updated_at' | 'title' | 'file_size' | 'duration')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">创建时间</SelectItem>
                      <SelectItem value="updated_at">更新时间</SelectItem>
                      <SelectItem value="title">标题</SelectItem>
                      <SelectItem value="file_size">文件大小</SelectItem>
                      <SelectItem value="duration">时长</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">排序方向</label>
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'ASC' | 'DESC')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DESC">降序</SelectItem>
                      <SelectItem value="ASC">升序</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Search Results Info */}
            {searchMeta && (searchMeta.query || searchMeta.status) && (
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <span className="font-medium">搜索条件：</span>
                {searchMeta.query && <span className="ml-2">关键词: &quot;{searchMeta.query}&quot;</span>}
                {searchMeta.status && <span className="ml-2">状态: {getStatusText(searchMeta.status as VideoStatus)}</span>}
                {searchMeta.sort_by && (
                  <span className="ml-2">
                    排序: {searchMeta.sort_by === 'created_at' ? '创建时间' : 
                           searchMeta.sort_by === 'updated_at' ? '更新时间' :
                           searchMeta.sort_by === 'title' ? '标题' :
                           searchMeta.sort_by === 'file_size' ? '文件大小' : '时长'} 
                    ({searchMeta.sort_order === 'DESC' ? '降序' : '升序'})
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Videos List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>我的视频</CardTitle>
              <CardDescription>
                {pagination.total} 个视频，第 {pagination.page} / {pagination.pages} 页
              </CardDescription>
            </div>
            {!loading && (
              <Button
                variant="outline"
                onClick={() => loadVideos(pagination.page)}
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">加载中...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              还没有上传任何视频
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="group flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-16 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <Play className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {editingVideoId === video.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                className="text-base font-medium h-8"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(video.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                              />
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSaveEdit(video.id)}
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                                >
                                  <Cancel className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-medium flex-1">{video.title}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(video.id, video.title)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {(video.file_size / 1024 / 1024).toFixed(1)} MB
                          {video.duration && ` • ${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(video.status)}
                          <span className="text-sm text-gray-600">
                            {getStatusText(video.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {video.status === VideoStatus.COMPLETED && video.hls_url && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/video/${video.id}`, '_blank')}
                            disabled={editingVideoId === video.id}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            播放
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShare({ id: video.id, title: video.title })}
                            className="text-green-600 hover:text-green-700"
                            disabled={editingVideoId === video.id}
                          >
                            <Share2 className="w-4 h-4 mr-1" />
                            分享
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(video.id)}
                        className="text-blue-600 hover:text-blue-700"
                        disabled={editingVideoId === video.id}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        下载
                      </Button>
                      
                      {video.status === VideoStatus.FAILED && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(video.id)}
                          className="text-blue-600 hover:text-blue-700"
                          disabled={editingVideoId === video.id}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          重试
                        </Button>
                      )}
                      
                      {(video.status === VideoStatus.COMPLETED || 
                        video.status === VideoStatus.FAILED ||
                        (video.status === VideoStatus.PROCESSING && 
                         Date.now() - new Date(video.created_at + 'Z').getTime() > 2 * 60 * 60 * 1000)) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(video.id)}
                          disabled={editingVideoId === video.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                  >
                    上一页
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    第 {pagination.page} 页，共 {pagination.pages} 页
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 分享模态框 */}
      {showShareModal && selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black opacity-80"
            onClick={handleCloseShareModal}
          />
          
          {/* 模态框内容 */}
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] m-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-semibold">分享视频</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseShareModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
              
              <div className="p-4">
                <VideoShare
                  videoId={selectedVideo.id}
                  videoTitle={selectedVideo.title}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}