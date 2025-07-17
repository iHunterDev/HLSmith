'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import VideoUpload from './VideoUpload';
import VideoList from './VideoList';

export default function DashboardPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">控制台</h1>
            <p className="text-gray-600">上传和管理您的视频文件</p>
          </div>

          <VideoUpload onUploadComplete={handleUploadComplete} />
          <VideoList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </ProtectedRoute>
  );
}