'use client';

import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Upload, Shield } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { isAuthenticated } = useAuthStore();


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">HLSmith</h1>
            </div>
            <div className="space-x-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button>控制台</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline">登录</Button>
                  </Link>
                  <Link href="/register">
                    <Button>注册</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              专业的视频转换平台
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              将您的视频轻松转换为 HLS 流媒体格式，支持多种视频格式，快速、安全、可靠
            </p>
            <div className="space-x-4">
              <Link href="/register">
                <Button size="lg" className="px-8">
                  开始使用
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-8">
                  立即登录
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              为什么选择 HLSmith？
            </h2>
            <p className="text-lg text-gray-600">
              我们提供最专业的视频转换服务
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>简单上传</CardTitle>
                <CardDescription>
                  支持拖拽上传，多种视频格式，最大 2GB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  支持 MP4, AVI, MOV, WMV 等主流视频格式，操作简单直观
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>高质量转换</CardTitle>
                <CardDescription>
                  专业的 HLS 转换技术，保证视频质量
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  使用 FFmpeg 技术，确保转换后的视频质量和兼容性
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>安全可靠</CardTitle>
                <CardDescription>
                  用户数据安全保护，私密文件管理
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  完整的用户认证系统，确保您的视频文件安全私密
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              准备开始了吗？
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              立即注册账户，体验专业的视频转换服务
            </p>
            <Link href="/register">
              <Button size="lg" className="px-8">
                免费注册
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-200">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 HLSmith. 专业的视频转换平台.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
