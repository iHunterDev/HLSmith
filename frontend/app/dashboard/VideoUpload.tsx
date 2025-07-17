'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { videoApi, getErrorMessage } from '@/lib/api';
import { useVideoStore } from '@/lib/store';
import { ChunkedUploadManager, getUploadSession } from '@/lib/chunkedUpload';
import { ChunkedUploadProgress, ChunkUploadInfo } from '@/lib/types';
import { Upload, AlertCircle, Pause, Play, X, RotateCcw } from 'lucide-react';

interface VideoUploadProps {
  onUploadComplete?: () => void;
}

export default function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [useChunkedUpload] = useState(true);
  const [chunkProgress, setChunkProgress] = useState<ChunkedUploadProgress | null>(null);
  const [chunkInfos, setChunkInfos] = useState<ChunkUploadInfo[]>([]);
  const [uploadManager, setUploadManager] = useState<ChunkedUploadManager | null>(null);
  const [resumableUploadId, setResumableUploadId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addVideo } = useVideoStore();

  // Load resumable upload on component mount
  useEffect(() => {
    const savedUploadId = localStorage.getItem('resumableUploadId');
    if (savedUploadId) {
      setResumableUploadId(savedUploadId);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    // Auto-populate title with filename if title is empty
    if (!title.trim()) {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      setTitle(fileName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        handleFileSelect(file);
      } else {
        setError('请选择视频文件');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClickUploadArea = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    
    // Use filename if no title provided
    const finalTitle = title.trim() || uploadFile.name.replace(/\.[^/.]+$/, '');

    setIsUploading(true);
    setIsPaused(false);
    setUploadProgress(0);
    setError('');

    try {
      if (useChunkedUpload && uploadFile.size > 10 * 1024 * 1024) { // Use chunked upload for files > 10MB
        await handleChunkedUpload(finalTitle);
      } else {
        await handleRegularUpload(finalTitle);
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setError(`视频上传失败: ${errorMessage}`);
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      setIsPaused(false);
    }
  };

  const handleRegularUpload = async (finalTitle: string) => {
    const formData = new FormData();
    formData.append('video', uploadFile!);
    formData.append('title', finalTitle);

    const response = await videoApi.uploadVideo(formData, setUploadProgress);
    addVideo(response);
    
    // Reset form
    resetForm();
    
    // Notify parent component
    onUploadComplete?.();
  };

  const handleChunkedUpload = async (finalTitle: string) => {
    const manager = new ChunkedUploadManager(uploadFile!, finalTitle, {
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      maxConcurrent: 3,
      maxRetries: 3,
      onProgress: (progress) => {
        setChunkProgress(progress);
        setUploadProgress(progress.progress);
      },
      onChunkProgress: (chunkInfo) => {
        setChunkInfos(prev => {
          const newInfos = [...prev];
          const existingIndex = newInfos.findIndex(info => info.chunkNumber === chunkInfo.chunkNumber);
          if (existingIndex >= 0) {
            newInfos[existingIndex] = chunkInfo;
          } else {
            newInfos.push(chunkInfo);
          }
          return newInfos;
        });
      },
      onError: (error) => {
        setError(`分片上传失败: ${error.message}`);
      }
    });

    setUploadManager(manager);
    
    try {
      await manager.start();
      
      // Save upload session for potential resume
      if (manager.getProgress().uploadId) {
        localStorage.setItem('resumableUploadId', manager.getProgress().uploadId);
      }
      
      // Upload completed successfully
      resetForm();
      onUploadComplete?.();
      
    } catch (error) {
      throw error;
    }
  };

  const handleResumeUpload = async () => {
    if (!resumableUploadId || !uploadFile) return;

    try {
      const session = await getUploadSession(resumableUploadId);
      const finalTitle = title.trim() || uploadFile.name.replace(/\.[^/.]+$/, '');
      
      const manager = new ChunkedUploadManager(uploadFile, finalTitle, {
        chunkSize: session.chunk_size,
        maxConcurrent: 3,
        maxRetries: 3,
        onProgress: (progress) => {
          setChunkProgress(progress);
          setUploadProgress(progress.progress);
        },
        onChunkProgress: (chunkInfo) => {
          setChunkInfos(prev => {
            const newInfos = [...prev];
            const existingIndex = newInfos.findIndex(info => info.chunkNumber === chunkInfo.chunkNumber);
            if (existingIndex >= 0) {
              newInfos[existingIndex] = chunkInfo;
            } else {
              newInfos.push(chunkInfo);
            }
            return newInfos;
          });
        },
        onError: (error) => {
          setError(`断点续传失败: ${error.message}`);
        }
      });

      setUploadManager(manager);
      setIsUploading(true);
      setIsPaused(false);
      
      await manager.resume({
        uploadId: resumableUploadId,
        session,
        file: uploadFile,
        title: finalTitle
      });
      
      // Resume completed successfully
      resetForm();
      onUploadComplete?.();
      
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(`断点续传失败: ${errorMessage}`);
      console.error('Resume failed:', error);
    } finally {
      setIsUploading(false);
      setIsPaused(false);
    }
  };

  const handlePauseUpload = () => {
    if (uploadManager) {
      uploadManager.pause();
      setIsPaused(true);
    }
  };

  const handleCancelUpload = async () => {
    if (uploadManager) {
      await uploadManager.cancel();
      setUploadManager(null);
      resetForm();
    }
  };

  const resetForm = () => {
    setUploadFile(null);
    setTitle('');
    setUploadProgress(0);
    setChunkProgress(null);
    setChunkInfos([]);
    setUploadManager(null);
    localStorage.removeItem('resumableUploadId');
    setResumableUploadId(null);
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

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传视频
          </CardTitle>
          <CardDescription>
            支持 MP4, AVI, MOV, WMV 等格式，最大 2GB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">视频标题</Label>
            <Input
              id="title"
              type="text"
              placeholder="请输入视频标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>选择视频文件</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : uploadFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClickUploadArea}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {uploadFile ? (
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">
                    已选择: {uploadFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    大小: {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                    {uploadFile.size > 10 * 1024 * 1024 && ' (将使用分片上传)'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    拖拽视频文件到此处或点击选择
                  </p>
                  <p className="text-xs text-gray-500">
                    支持 MP4, AVI, MOV, WMV 等格式，最大 2GB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Resume Upload Section */}
          {resumableUploadId && !isUploading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">发现未完成的上传</span>
              </div>
              <p className="text-xs text-yellow-600 mb-3">
                可以继续之前的上传进度，避免重新开始
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleResumeUpload}
                  size="sm"
                  variant="outline"
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                >
                  继续上传
                </Button>
                <Button
                  onClick={() => {
                    localStorage.removeItem('resumableUploadId');
                    setResumableUploadId(null);
                  }}
                  size="sm"
                  variant="ghost"
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  忽略
                </Button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>上传进度</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              
              {/* Chunked Upload Details */}
              {chunkProgress && (
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>分片: {chunkProgress.uploadedChunks}/{chunkProgress.totalChunks}</span>
                    <span>速度: {(chunkProgress.speed / 1024 / 1024).toFixed(1)} MB/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>预计剩余: {Math.floor(chunkProgress.eta / 60)}:{(chunkProgress.eta % 60).toString().padStart(2, '0')}</span>
                    <span>状态: {chunkProgress.status}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Controls */}
          <div className="flex gap-2">
            {!isUploading ? (
              <Button
                onClick={handleUpload}
                disabled={!uploadFile}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                上传视频
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button
                    onClick={handlePauseUpload}
                    variant="outline"
                    className="flex-1"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    暂停上传
                  </Button>
                ) : (
                  <Button
                    onClick={handleUpload}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    继续上传
                  </Button>
                )}
                <Button
                  onClick={handleCancelUpload}
                  variant="destructive"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  取消上传
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}