# HLSmith - Video to HLS Management Platform

A modern video streaming management tool based on Next.js 15 + Express that supports efficient HLS conversion, user management, and video sharing.

## ✨ Core Features

- 🎥 **Smart Video Conversion** - Efficient HLS format conversion supporting multiple video formats
- 📤 **Chunked Upload** - Large file chunked upload with resume capability
- 👥 **User Management** - Complete user registration, login, and basic permission control
- 📺 **Streaming Playback** - High-performance video playback based on HLS.js
- 🔗 **Video Sharing** - Generate sharing links for video playback without login
- 🖼️ **Thumbnail Generation** - Automatic video cover thumbnail generation
- ⚡ **Queue Processing** - Background task queue supporting concurrent video processing
- 🗑️ **Storage Management** - Complete video lifecycle management

## 🏗️ Technical Architecture

### Frontend Tech Stack
- **Next.js 15** (App Router) - React full-stack framework
- **React 19** - Latest version of React
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Modern CSS framework
- **shadcn/ui** - High-quality UI component library
- **HLS.js** - Video streaming playback library
- **Zustand** - Lightweight state management

### Backend Tech Stack
- **Node.js + Express** - High-performance server framework
- **TypeScript** - Type-safe backend development
- **SQLite** - Lightweight relational database
- **JWT** - Secure user authentication
- **FFmpeg** - Powerful video processing engine
- **Multer** - File upload middleware

## 🚀 Quick Start

### Quick Experience (Docker)

```bash
# Clone the project
git clone <repository-url>
cd HLSmith

# Create storage directories
mkdir -p storage/{uploads,hls,thumbnails,chunks,temp/chunks}

# Start services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Local Development

```bash
# Install dependencies
cd backend && pnpm install
cd ../frontend && pnpm install

# Start development servers
cd backend && pnpm dev    # Port 3001
cd ../frontend && pnpm dev  # Port 3000
```

> 📋 **Detailed Deployment Documentation**: For production deployment, configuration optimization, monitoring and maintenance, please see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📁 Project Structure

```
HLSmith/
├── frontend/                    # Next.js frontend application
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── share/              # Share page
│   │   └── video/              # Video playback page
│   ├── components/             # Reusable components
│   │   ├── auth/               # Authentication components
│   │   ├── layout/             # Layout components
│   │   ├── ui/                 # UI base components
│   │   └── video/              # Video-related components
│   └── lib/                    # Utilities and configuration
├── backend/                     # Express backend service
│   ├── src/
│   │   ├── controllers/        # Business logic controllers
│   │   │   ├── authController.ts
│   │   │   ├── videoController.ts
│   │   │   ├── shareController.ts
│   │   │   └── chunkedUploadController.ts
│   │   ├── middleware/         # Middleware
│   │   ├── models/            # Data models
│   │   ├── routes/            # Route definitions
│   │   ├── services/          # Business services
│   │   │   ├── hlsService.ts
│   │   │   ├── queueService.ts
│   │   │   └── uploadCleanupService.ts
│   │   └── utils/             # Utility functions
│   └── storage/               # Data storage
│       ├── uploads/           # Original video files
│       ├── hls/              # HLS conversion output
│       ├── thumbnails/       # Video thumbnails
│       ├── chunks/           # Chunked upload temporary files
│       └── database.sqlite   # SQLite database
└── docker-compose.yml          # Docker compose configuration
```

## 📡 API Endpoints

### 🔐 Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `GET /api/auth/profile` - Get current user information

### 📤 File Upload
- `POST /api/upload/init` - Initialize chunked upload
- `POST /api/upload/chunk` - Upload file chunk
- `POST /api/upload/complete` - Complete chunked upload

### 🎬 Video Management
- `GET /api/videos` - Get video list
- `GET /api/videos/:id` - Get video details
- `GET /api/videos/:id/status` - Query conversion status
- `DELETE /api/videos/:id` - Delete video

### 📺 Video Playback
- `POST /api/playback/authorize` - Authorize playback, return `playback_token` + `playback_url`
- `GET /api/playback/stream/:token/playlist.m3u8` - Get tokenized HLS playlist
- `GET /api/playback/stream/:token/segment_*.ts` - Get tokenized HLS segments
- `GET /api/stream/:id/playlist.m3u8` - Get HLS playlist
- `GET /api/stream/:id/segment_*.ts` - Get HLS video segments
- `GET /api/thumbnails/:id` - Get video thumbnail

### 🔗 Video Sharing
- `POST /api/videos/:id/share` - Generate sharing link
- `GET /api/share/:token/playlist.m3u8` - Access shared video

### ⚡ System Status
- `GET /api/queue/status` - Get queue status
- `GET /api/videos/:id/status` - Get conversion progress

> 📋 **Detailed API Documentation**: For complete interface documentation, request parameters, response formats, please see [backend/API-Documentation.md](./backend/API-Documentation.md)

## 🔧 Basic Configuration

### Environment Variables
```bash
# Modify key configurations
JWT_SECRET=your-strong-jwt-secret        # CRITICAL: Must be changed to a strong random secret
ALLOW_REGISTRATION=true                  # Allow registration
UPLOAD_MAX_SIZE=2147483648              # Max upload size (2GB)
MAX_CONCURRENT=2                        # Concurrent conversion count
```

> ⚠️ **CRITICAL SECURITY WARNING**: You MUST change the JWT_SECRET to a strong, randomly generated secret before deploying to production. Use `openssl rand -hex 32` to generate a secure secret.

### Storage Directories
- `storage/uploads/` - Original video files
- `storage/hls/` - HLS conversion output
- `storage/thumbnails/` - Video thumbnails
- `storage/database.sqlite` - SQLite database

> 🔧 **Detailed Configuration**: For complete environment variable configuration, performance optimization, security settings, please see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🎯 Core Features

### Chunked Upload
- Support for large file chunked upload
- Resume capability
- Automatic temporary file cleanup
- Upload progress tracking

### Video Conversion
- High-quality conversion based on FFmpeg
- Support for multiple input formats
- Automatic thumbnail generation
- Queued processing with concurrency support

### User System
- JWT authentication mechanism
- User data isolation
- Secure password encryption
- Permission control

### Video Sharing
- Generate permanent sharing links
- Support for viewing without login
- Sharing link management

## 📊 Performance Features

- **High Concurrency**: Support for multiple users uploading and converting simultaneously
- **Memory Optimization**: Stream processing to reduce memory usage
- **Storage Efficiency**: Smart file organization and cleanup mechanisms
- **Fast Response**: Asynchronous processing and queued tasks

## 🛠️ Development Guide

### Adding New Features
1. Backend: `backend/src/controllers/` → `backend/src/routes/`
2. Frontend: `frontend/app/` → `frontend/components/`

### Debugging
```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Enter container
docker-compose exec backend sh
```

> 🛠️ **Development Details**: For complete development guide, debugging methods, database migrations, please see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

### ⚠️ Attribution Requirements

**Important**: According to the license terms, any publicly deployed or hosted instance of HLSmith must retain the "HLSmith" project name attribution in the website footer.

Example footer format:
```
Powered by HLSmith
```

This is a mandatory requirement of the license to ensure sustainable development of the project and the health of the open source community.
