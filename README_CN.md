# HLSmith - 视频转HLS管理平台

基于 Next.js 15 + Express 的现代化视频流媒体管理工具，支持高效的HLS转换、用户管理和视频分享。

## ✨ 核心功能

- 🎥 **智能视频转换** - 高效的HLS格式转换，支持多种视频格式
- 📤 **分片上传** - 大文件分片上传，支持断点续传
- 👥 **用户管理** - 完整的用户注册、登录和基本权限控制
- 📺 **流媒体播放** - 基于 HLS.js 的高性能视频播放
- 🔗 **视频分享** - 生成分享链接，支持视频的免登录播放
- 🖼️ **缩略图生成** - 自动生成视频封面缩略图
- ⚡ **队列处理** - 后台任务队列，支持并发视频处理
- 🗑️ **存储管理** - 完整的视频生命周期管理

## 🏗️ 技术架构

### 前端技术栈
- **Next.js 15** (App Router) - React 全栈框架
- **React 19** - 最新版本的React
- **TypeScript** - 类型安全的JavaScript
- **Tailwind CSS 4** - 现代化的CSS框架
- **shadcn/ui** - 高质量的UI组件库
- **HLS.js** - 视频流播放库
- **Zustand** - 轻量级状态管理

### 后端技术栈
- **Node.js + Express** - 高性能的服务器框架
- **TypeScript** - 类型安全的后端开发
- **SQLite** - 轻量级关系型数据库
- **JWT** - 安全的用户认证
- **FFmpeg** - 强大的视频处理引擎
- **Multer** - 文件上传中间件

## 🚀 快速开始

### 快速体验 (Docker)

```bash
# 克隆项目
git clone <repository-url>
cd HLSmith

# 创建存储目录
mkdir -p storage/{uploads,hls,thumbnails,chunks,temp/chunks}

# 启动服务
docker-compose up -d

# 访问应用
# 前端: http://localhost:3000
# 后端: http://localhost:3001
```

### 本地开发

```bash
# 安装依赖
cd backend && pnpm install
cd ../frontend && pnpm install

# 启动开发服务器
cd backend && pnpm dev    # 端口 3001
cd ../frontend && pnpm dev  # 端口 3000
```

> 📋 **详细部署文档**: 生产环境部署、配置优化、监控维护等完整指南请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📁 项目结构

```
HLSmith/
├── frontend/                    # Next.js 前端应用
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── dashboard/          # 仪表板页面
│   │   ├── login/              # 登录页面
│   │   ├── register/           # 注册页面
│   │   ├── share/              # 分享页面
│   │   └── video/              # 视频播放页面
│   ├── components/             # 可复用组件
│   │   ├── auth/               # 认证组件
│   │   ├── layout/             # 布局组件
│   │   ├── ui/                 # UI基础组件
│   │   └── video/              # 视频相关组件
│   └── lib/                    # 工具库和配置
├── backend/                     # Express 后端服务
│   ├── src/
│   │   ├── controllers/        # 业务逻辑控制器
│   │   │   ├── authController.ts
│   │   │   ├── videoController.ts
│   │   │   ├── shareController.ts
│   │   │   └── chunkedUploadController.ts
│   │   ├── middleware/         # 中间件
│   │   ├── models/            # 数据模型
│   │   ├── routes/            # 路由定义
│   │   ├── services/          # 业务服务
│   │   │   ├── hlsService.ts
│   │   │   ├── queueService.ts
│   │   │   └── uploadCleanupService.ts
│   │   └── utils/             # 工具函数
│   └── storage/               # 数据存储
│       ├── uploads/           # 原始视频文件
│       ├── hls/              # HLS 转换输出
│       ├── thumbnails/       # 视频缩略图
│       ├── chunks/           # 分片上传临时文件
│       └── database.sqlite   # SQLite 数据库
└── docker-compose.yml          # Docker 编排配置
```

## 📡 API 接口

### 🔐 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录  
- `GET /api/auth/profile` - 获取当前用户信息

### 📤 文件上传
- `POST /api/upload/init` - 初始化分片上传
- `POST /api/upload/chunk` - 上传文件分片
- `POST /api/upload/complete` - 完成分片上传

### 🎬 视频管理
- `GET /api/videos` - 获取视频列表
- `GET /api/videos/:id` - 获取视频详情
- `GET /api/videos/:id/status` - 查询转换状态
- `DELETE /api/videos/:id` - 删除视频

### 📺 视频播放
- `GET /api/stream/:id/playlist.m3u8` - 获取HLS播放列表
- `GET /api/stream/:id/segment_*.ts` - 获取HLS视频片段
- `GET /api/thumbnails/:id` - 获取视频缩略图

### 🔗 视频分享
- `POST /api/videos/:id/share` - 生成分享链接
- `GET /api/share/:token/playlist.m3u8` - 访问分享视频

### ⚡ 系统状态
- `GET /api/queue/status` - 获取队列状态
- `GET /api/videos/:id/status` - 获取转换进度

> 📋 **详细 API 文档**: 完整的接口文档、请求参数、响应格式等详细说明请查看 [backend/API-Documentation.md](./backend/API-Documentation.md)

## 🔧 基础配置

### 环境变量
```bash
# 修改关键配置
JWT_SECRET=your-strong-jwt-secret        # 关键：必须修改为强随机密钥
ALLOW_REGISTRATION=true                  # 允许注册
UPLOAD_MAX_SIZE=2147483648              # 最大上传 (2GB)
MAX_CONCURRENT=2                        # 并发转换数
```

> ⚠️ **关键安全警告**: 在部署到生产环境之前，您必须将 JWT_SECRET 更改为强随机生成的密钥。使用 `openssl rand -hex 32` 生成安全的密钥。

### 存储目录
- `storage/uploads/` - 原始视频文件
- `storage/hls/` - HLS转换输出
- `storage/thumbnails/` - 视频缩略图
- `storage/database.sqlite` - SQLite数据库

> 🔧 **详细配置**: 完整的环境变量配置、性能优化、安全设置请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🎯 核心特性

### 分片上传
- 支持大文件分片上传
- 断点续传功能
- 自动清理临时文件
- 上传进度追踪

### 视频转换
- 基于FFmpeg的高质量转换
- 支持多种输入格式
- 自动生成缩略图
- 队列化处理，支持并发

### 用户系统
- JWT认证机制
- 用户数据隔离
- 安全的密码加密
- 权限控制

### 视频分享
- 生成永久分享链接
- 支持无需登录观看
- 分享链接管理

## 📊 性能特点

- **高并发**: 支持多用户同时上传和转换
- **内存优化**: 采用流式处理，减少内存占用
- **存储高效**: 智能的文件组织和清理机制
- **响应迅速**: 异步处理和队列化任务

## 🛠️ 开发指南

### 添加新功能
1. 后端: `backend/src/controllers/` → `backend/src/routes/`
2. 前端: `frontend/app/` → `frontend/components/`

### 调试
```bash
# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 进入容器
docker-compose exec backend sh
```

> 🛠️ **开发详情**: 完整的开发指南、调试方法、数据库迁移等请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件

### ⚠️ 署名要求

**重要**: 根据许可证条款，任何公开部署或托管的 HLSmith 实例都必须在网页的 footer 中保留 "HLSmith" 项目名称署名。

示例 footer 格式：
```
Powered by HLSmith
```

这是许可证的强制要求，确保项目的可持续发展和开源社区的健康。