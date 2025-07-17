# HLSmith 后端 API 接口文档

## 📋 目录
- [基础信息](#基础信息)
- [响应格式规范](#响应格式规范)
- [认证方式](#认证方式)
- [系统接口](#系统接口)
- [用户认证模块](#用户认证模块)
- [视频管理模块](#视频管理模块)
- [HLS转换模块](#hls转换模块)
- [流媒体播放模块](#流媒体播放模块)
- [视频分享模块](#视频分享模块)
- [队列管理模块](#队列管理模块)
- [分片上传模块](#分片上传模块)
- [错误码说明](#错误码说明)
- [数据结构定义](#数据结构定义)

## 基础信息

### 服务器信息
- **Base URL**: `http://localhost:3001`
- **默认端口**: 3001
- **API前缀**: `/api`
- **Content-Type**: `application/json`

### 版本信息
- **API版本**: v1.0.0
- **文档更新**: 2023年12月

## 响应格式规范

### 统一响应结构
所有API接口都遵循以下统一的响应格式：

```typescript
interface ApiResponse<T = any> {
  success: boolean;          // 请求是否成功
  code: number;             // HTTP状态码
  message: string;          // 响应消息
  data?: T;                 // 响应数据
  error?: ErrorDetail;      // 错误详情
  meta?: ResponseMeta;      // 元数据信息
  timestamp: string;        // 响应时间戳
}
```

### 成功响应示例
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": { ... },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### 分页响应示例
```json
{
  "success": true,
  "code": 200,
  "message": "获取列表成功",
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3,
      "has_next": true,
      "has_prev": false
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### 错误响应示例
```json
{
  "success": false,
  "code": 400,
  "message": "请求参数错误",
  "error": {
    "type": "VALIDATION_ERROR",
    "code": "INVALID_PARAMS",
    "message": "用户名和密码不能为空",
    "details": {
      "fields": ["username", "password"]
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

## 认证方式

### JWT Token 认证
- **认证方式**: Bearer Token
- **请求头**: `Authorization: Bearer <token>`
- **Token获取**: 通过登录接口获取
- **Token有效期**: 根据服务器配置

### 示例
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 系统接口

### 1. 服务状态检查

#### GET `/`
**描述**: 检查服务基本状态

**认证**: 无需认证

**响应**:
```json
{
  "success": true,
  "code": 200,
  "message": "HLSmith 后端服务运行正常",
  "data": {
    "message": "HLSmith Backend Server",
    "status": "running",
    "version": "1.0.0"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### 2. 健康检查

#### GET `/api/health`
**描述**: 详细的服务健康状态检查

**认证**: 无需认证

**响应**:
```json
{
  "success": true,
  "code": 200,
  "message": "服务健康检查通过",
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-01T10:00:00.000Z",
    "uptime": 3600,
    "memory": {
      "rss": 50331648,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 1024
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

## 用户认证模块

Base URL: `/api/auth`

### 1. 用户注册

#### POST `/api/auth/register`
**描述**: 注册新用户账号

**认证**: 无需认证

**请求参数**:
```json
{
  "username": "string",     // 用户名，必填
  "email": "string",        // 邮箱地址，必填，唯一
  "password": "string"      // 密码，必填，至少6位
}
```

**成功响应 (201)**:
```json
{
  "success": true,
  "code": 201,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "created_at": "2023-12-01T10:00:00.000Z",
      "updated_at": "2023-12-01T10:00:00.000Z"
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误（用户名/邮箱/密码为空，密码长度不足）
- `409` - 用户已存在（邮箱或用户名重复）

### 2. 用户登录

#### POST `/api/auth/login`
**描述**: 用户登录获取访问令牌

**认证**: 无需认证

**请求参数**:
```json
{
  "email": "string",        // 邮箱地址，必填
  "password": "string"      // 密码，必填
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "created_at": "2023-12-01T10:00:00.000Z",
      "updated_at": "2023-12-01T10:00:00.000Z"
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误（邮箱或密码为空）
- `401` - 认证失败（邮箱或密码错误）

### 3. 获取用户信息

#### GET `/api/auth/profile`
**描述**: 获取当前登录用户的详细信息

**认证**: 需要JWT Token

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取用户信息成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "created_at": "2023-12-01T10:00:00.000Z",
    "updated_at": "2023-12-01T10:00:00.000Z"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `401` - 未授权访问
- `404` - 用户不存在

## 视频管理模块

Base URL: `/api/videos`

**注意**: 所有视频接口都需要JWT认证

### 1. 上传视频

#### POST `/api/videos/upload`
**描述**: 上传视频文件到服务器

**认证**: 需要JWT Token

**请求格式**: `multipart/form-data`

**请求参数**:
- `video` (file): 视频文件，必填
- `title` (string): 视频标题，必填

**成功响应 (201)**:
```json
{
  "success": true,
  "code": 201,
  "message": "视频上传成功",
  "data": {
    "id": 1,
    "title": "测试视频",
    "original_filename": "video.mp4",
    "file_size": 10485760,
    "status": "uploaded",
    "conversion_progress": 0,
    "created_at": "2023-12-01T10:00:00.000Z",
    "updated_at": "2023-12-01T10:00:00.000Z"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误（未选择文件或标题为空）
- `401` - 未授权访问

### 2. 获取视频列表

#### GET `/api/videos`
**描述**: 获取当前用户的视频列表，支持分页、搜索、筛选和排序

**认证**: 需要JWT Token

**查询参数**:
- `page` (number, optional): 页码，默认为1
- `limit` (number, optional): 每页数量，默认为10，最大100
- `q` (string, optional): 搜索关键词（按标题搜索）
- `status` (string, optional): 状态筛选（uploaded/processing/completed/failed）
- `start_date` (string, optional): 开始日期（ISO 8601格式）
- `end_date` (string, optional): 结束日期（ISO 8601格式）
- `sort_by` (string, optional): 排序字段（created_at/updated_at/title/file_size/duration），默认为created_at
- `sort_order` (string, optional): 排序方向（ASC/DESC），默认为DESC

**查询参数示例**:
```
GET /api/videos?q=测试&status=completed&sort_by=file_size&sort_order=ASC&page=1&limit=20
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取视频列表成功",
  "data": [
    {
      "id": 1,
      "title": "测试视频",
      "original_filename": "video.mp4",
      "duration": 120,
      "file_size": 10485760,
      "status": "completed",
      "conversion_progress": 100,
      "thumbnail_url": "http://localhost:3001/thumbnails/2025/07/4/thumbnail.jpg",
      "hls_url": "http://localhost:3001/api/stream/1/playlist.m3u8",
      "created_at": "2023-12-01T10:00:00.000Z",
      "updated_at": "2023-12-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3,
      "has_next": true,
      "has_prev": false
    },
    "search": {
      "query": "测试",
      "status": "completed",
      "start_date": null,
      "end_date": null,
      "sort_by": "file_size",
      "sort_order": "ASC"
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 分页参数错误、状态参数错误或排序参数错误
- `401` - 未授权访问

### 3. 获取视频详情

#### GET `/api/videos/:id`
**描述**: 获取指定视频的详细信息

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取视频信息成功",
  "data": {
    "id": 1,
    "title": "测试视频",
    "original_filename": "video.mp4",
    "duration": 120,
    "file_size": 10485760,
    "status": "completed",
    "conversion_progress": 100,
    "thumbnail_url": "http://localhost:3001/thumbnails/2025/07/4/thumbnail.jpg",
    "hls_url": "http://localhost:3001/api/stream/1/playlist.m3u8",
    "created_at": "2023-12-01T10:00:00.000Z",
    "updated_at": "2023-12-01T10:00:00.000Z"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 视频ID无效
- `401` - 未授权访问
- `404` - 视频不存在

### 4. 获取视频状态

#### GET `/api/videos/:id/status`
**描述**: 获取视频处理状态（与获取视频详情相同）

**认证**: 需要JWT Token

**响应**: 同获取视频详情接口

### 5. 更新视频信息

#### PUT `/api/videos/:id`
**描述**: 更新视频标题

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**请求参数**:
```json
{
  "title": "string"      // 新的视频标题，必填
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "视频信息更新成功",
  "data": {
    "id": 1,
    "title": "新标题",
    "original_filename": "video.mp4",
    "duration": 120,
    "file_size": 10485760,
    "status": "completed",
    "conversion_progress": 100,
    "thumbnail_url": "http://localhost:3001/thumbnails/2025/07/4/thumbnail.jpg",
    "hls_url": "http://localhost:3001/api/stream/1/playlist.m3u8",
    "created_at": "2023-12-01T10:00:00.000Z",
    "updated_at": "2023-12-01T10:01:00.000Z"
  },
  "timestamp": "2023-12-01T10:01:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误（视频ID无效或标题为空）
- `401` - 未授权访问
- `404` - 视频不存在

### 6. 删除视频

#### DELETE `/api/videos/:id`
**描述**: 删除指定视频和相关文件

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "视频删除成功",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 视频ID无效
- `401` - 未授权访问
- `404` - 视频不存在

### 7. 重试视频处理

#### POST `/api/videos/:id/retry`
**描述**: 重试失败的视频处理任务

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "视频处理重启成功",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误或业务逻辑错误（只有失败状态的视频才能重试）
- `401` - 未授权访问
- `404` - 视频不存在

### 8. 生成分享链接

#### POST `/api/videos/:id/share`
**描述**: 为指定视频生成永久分享链接

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "生成分享链接成功",
  "data": {
    "id": 1,
    "video_id": 24,
    "access_token": "550e8400-e29b-41d4-a716-446655440000",
    "share_url": "http://localhost:3001/api/share/550e8400-e29b-41d4-a716-446655440000/playlist.m3u8",
    "created_at": "2024-07-16T12:00:00.000Z",
    "is_active": true,
    "access_count": 0
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 视频ID无效
- `401` - 未授权访问
- `404` - 视频不存在或尚未完成转换

### 9. 获取视频分享列表

#### GET `/api/videos/:id/shares`
**描述**: 获取指定视频的所有分享链接

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取分享链接列表成功",
  "data": [
    {
      "id": 1,
      "video_id": 24,
      "access_token": "550e8400-e29b-41d4-a716-446655440000",
      "share_url": "http://localhost:3001/api/share/550e8400-e29b-41d4-a716-446655440000/playlist.m3u8",
      "created_at": "2024-07-16T12:00:00.000Z",
      "is_active": true,
      "access_count": 15
    }
  ],
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 视频ID无效
- `401` - 未授权访问
- `404` - 视频不存在

### 10. 下载原始视频

#### GET `/api/videos/:id/download`
**描述**: 下载指定视频的原始文件

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**成功响应 (200)**:
返回视频文件的二进制流数据

**响应头**:
```
Content-Type: video/mp4
Content-Disposition: attachment; filename="原始文件名.mp4"
Content-Length: 文件大小（字节）
```

**错误响应**:
- `400` - 视频ID无效
- `401` - 未授权访问
- `404` - 视频不存在
- `500` - 原始文件不存在或下载失败

## HLS转换模块

Base URL: `/api/hls`

**注意**: 所有HLS接口都需要JWT认证

### 1. 转换视频为HLS

#### POST `/api/hls/:id/convert`
**描述**: 将视频转换为HLS格式

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**请求参数**:
```json
{
  "quality": "string",      // 可选，转换质量：low/medium/high，默认medium
  "resolution": "string"    // 可选，分辨率：480p/720p/1080p，默认720p
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "视频转换已加入队列",
  "data": {
    "videoId": 1,
    "jobId": 123,
    "status": "queued"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误或业务错误（视频正在处理或已完成）
- `401` - 未授权访问
- `404` - 视频不存在

### 2. 获取转换状态

#### GET `/api/hls/:id/status`
**描述**: 获取视频转换状态和队列信息

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取转换状态成功",
  "data": {
    "videoId": 1,
    "status": "processing",
    "progress": 75,
    "hlsUrl": "http://localhost:3001/api/stream/1/playlist.m3u8",
    "thumbnailUrl": "http://localhost:3001/thumbnails/2025/07/4/thumbnail.jpg",
    "queueJob": {
      "id": 123,
      "status": "processing",
      "priority": 1,
      "retryCount": 0,
      "maxRetries": 3,
      "errorMessage": null,
      "createdAt": "2023-12-01T10:00:00.000Z",
      "startedAt": "2023-12-01T10:01:00.000Z",
      "completedAt": null
    }
  },
  "timestamp": "2023-12-01T10:05:00.000Z"
}
```

**错误响应**:
- `400` - 视频ID无效
- `401` - 未授权访问
- `404` - 视频不存在

### 3. 重试转换

#### POST `/api/hls/:id/retry`
**描述**: 重试失败的转换任务

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**请求参数**:
```json
{
  "quality": "string",      // 可选，转换质量：low/medium/high，默认medium
  "resolution": "string"    // 可选，分辨率：480p/720p/1080p，默认720p
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "视频转换重试已开始",
  "data": {
    "videoId": 1,
    "jobId": 124,
    "status": "queued"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误或业务错误（只能重试失败的转换任务）
- `401` - 未授权访问
- `404` - 视频不存在

## 流媒体播放模块

Base URL: `/api/stream`

**注意**: 所有流媒体接口都需要JWT认证

### 1. 获取HLS播放列表

#### GET `/api/stream/:id/playlist.m3u8`
**描述**: 获取视频的HLS播放列表文件

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**响应格式**: `application/vnd.apple.mpegurl`

**成功响应 (200)**:
返回M3U8格式的播放列表文件内容

**响应头**:
```
Content-Type: application/vnd.apple.mpegurl
Cache-Control: no-cache
Access-Control-Allow-Origin: *
```

**错误响应**:
- `401` - 未授权访问
- `404` - 视频不存在或播放列表文件不存在
- `400` - 视频尚未准备好播放

### 2. 获取视频片段

#### GET `/api/stream/:id/segment_:segmentId.ts`
**描述**: 获取HLS视频片段文件

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID
- `segmentId` (string): 片段ID

**响应格式**: `video/mp2t`

**成功响应 (200)**:
返回视频片段二进制数据流

**响应头**:
```
Content-Type: video/mp2t
Cache-Control: public, max-age=31536000
Access-Control-Allow-Origin: *
```

**错误响应**:
- `401` - 未授权访问
- `404` - 视频不存在或片段文件不存在
- `400` - 视频尚未准备好播放

## 视频分享模块

Base URL: `/api/share`

### 管理端点（需要认证）

### 1. 切换分享状态

#### PUT `/api/share/manage/shares/:shareId/toggle`
**描述**: 启用或禁用指定的分享链接

**认证**: 需要JWT Token

**路径参数**:
- `shareId` (number): 分享ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "分享链接已启用", // 或 "分享链接已禁用"
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 分享ID无效
- `401` - 未授权访问
- `404` - 分享链接不存在

### 2. 删除分享链接

#### DELETE `/api/share/manage/shares/:shareId`
**描述**: 删除指定的分享链接

**认证**: 需要JWT Token

**路径参数**:
- `shareId` (number): 分享ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "分享链接删除成功",
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 分享ID无效
- `401` - 未授权访问
- `404` - 分享链接不存在

### 公开端点（无需认证）

### 3. 获取分享播放列表

#### GET `/api/share/:token/playlist.m3u8`
**描述**: 通过分享令牌获取HLS播放列表，无需用户认证

**认证**: 无需认证

**路径参数**:
- `token` (string): 分享访问令牌（UUID格式）

**响应格式**: `application/vnd.apple.mpegurl`

**成功响应 (200)**:
返回M3U8格式的播放列表文件内容，所有分片URL已转换为完整路径

**响应头**:
```
Content-Type: application/vnd.apple.mpegurl
Cache-Control: no-cache
Access-Control-Allow-Origin: *
```

**错误响应**:
- `400` - 分享令牌无效
- `404` - 分享链接无效或已失效

### 4. 获取分享视频分片

#### GET `/api/share/:token/segment_:segmentId.ts`
**描述**: 通过分享令牌获取HLS视频分片，无需用户认证

**认证**: 无需认证

**路径参数**:
- `token` (string): 分享访问令牌（UUID格式）
- `segmentId` (string): 视频分片ID

**响应格式**: `video/mp2t`

**成功响应 (200)**:
返回视频分片二进制数据流

**响应头**:
```
Content-Type: video/mp2t
Cache-Control: public, max-age=31536000
Access-Control-Allow-Origin: *
```

**错误响应**:
- `400` - 分享令牌或分片ID无效
- `404` - 分享链接无效或视频分片不存在

### 5. 获取分享信息

#### GET `/api/share/:token/info`
**描述**: 获取分享视频的基本信息

**认证**: 无需认证

**路径参数**:
- `token` (string): 分享访问令牌（UUID格式）

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取分享信息成功",
  "data": {
    "title": "测试视频",
    "duration": 2566,
    "shared_at": "2024-07-16T12:00:00.000Z",
    "view_count": 25
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 分享令牌无效
- `404` - 分享链接无效或已失效

### 分享链接特性

#### 安全特性
- **UUID随机性**: 使用加密安全的UUID v4，无法被遍历或猜测
- **状态控制**: 支持启用/禁用分享链接，便于管理
- **权限验证**: 只有视频所有者才能管理分享链接
- **访问统计**: 自动记录访问次数和最后访问时间

#### 性能优化
- **长期缓存**: 视频分片缓存1年，减少服务器负载
- **实时播放列表**: 播放列表不缓存，确保URL准确性
- **流式传输**: 使用Node.js流避免内存占用

#### 使用场景
- **永久分享**: 链接永久有效，适合长期分享
- **无认证访问**: 接收方无需注册账号即可观看
- **跨平台兼容**: 支持所有标准HLS播放器
- **统计追踪**: 可查看分享链接的访问情况

## 队列管理模块

Base URL: `/api/queue`

**注意**: 所有队列接口都需要JWT认证

### 1. 获取队列状态

#### GET `/api/queue/status`
**描述**: 获取整体队列状态概览

**认证**: 需要JWT Token

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取队列状态成功",
  "data": {
    "pending": 5,
    "processing": 2,
    "completed": 120,
    "failed": 3,
    "maxConcurrent": 3
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `401` - 未授权访问

### 2. 获取视频队列状态

#### GET `/api/queue/video/:id`
**描述**: 获取指定视频的队列任务状态

**认证**: 需要JWT Token

**路径参数**:
- `id` (number): 视频ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取视频队列状态成功",
  "data": {
    "id": 123,
    "videoId": 1,
    "status": "processing",
    "priority": 1,
    "retryCount": 0,
    "maxRetries": 3,
    "errorMessage": null,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "startedAt": "2023-12-01T10:01:00.000Z",
    "completedAt": null
  },
  "timestamp": "2023-12-01T10:05:00.000Z"
}
```

**错误响应**:
- `400` - 视频ID无效
- `401` - 未授权访问
- `404` - 未找到该视频的队列任务

### 3. 重试失败任务

#### POST `/api/queue/retry/:jobId`
**描述**: 重试指定的失败任务

**认证**: 需要JWT Token

**路径参数**:
- `jobId` (number): 任务ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "任务重试已开始",
  "data": {
    "jobId": 123,
    "status": "retrying"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 任务ID无效或任务不是失败状态
- `401` - 未授权访问

### 4. 设置最大并发数

#### POST `/api/queue/config/concurrency`
**描述**: 设置队列最大并发处理数

**认证**: 需要JWT Token

**请求参数**:
```json
{
  "maxConcurrent": 5      // 最大并发数，范围1-10
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "最大并发数更新成功",
  "data": {
    "maxConcurrent": 5
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误（并发数不在1-10范围内）
- `401` - 未授权访问

### 5. 清理已完成任务

#### POST `/api/queue/cleanup`
**描述**: 清理已完成的任务记录

**认证**: 需要JWT Token

**请求参数**:
```json
{
  "keepCount": 100        // 保留的任务数量，范围1-1000，默认100
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "任务清理完成",
  "data": {
    "keepCount": 100
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误（保留数量不在1-1000范围内）
- `401` - 未授权访问

## 分片上传模块

Base URL: `/api/upload`

**注意**: 所有分片上传接口都需要JWT认证

### 1. 初始化分片上传

#### POST `/api/upload/init`
**描述**: 初始化分片上传会话，为大文件上传做准备

**认证**: 需要JWT Token

**请求参数**:
```json
{
  "filename": "string",      // 原始文件名，必填
  "fileSize": "number",      // 文件总大小（字节），必填
  "chunkSize": "number"      // 分片大小（字节），可选，默认5MB
}
```

**成功响应 (201)**:
```json
{
  "success": true,
  "code": 201,
  "message": "分片上传初始化成功",
  "data": {
    "id": "upload_uuid_123",
    "filename": "video.mp4",
    "file_size": 104857600,
    "total_chunks": 20,
    "chunk_size": 5242880,
    "uploaded_chunks": [],
    "status": "uploading",
    "expires_at": "2024-07-17T12:00:00.000Z",
    "created_at": "2024-07-16T12:00:00.000Z",
    "updated_at": "2024-07-16T12:00:00.000Z"
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误（文件名或大小无效）
- `401` - 未授权访问

### 2. 上传分片

#### POST `/api/upload/chunk`
**描述**: 上传单个文件分片

**认证**: 需要JWT Token

**请求格式**: `multipart/form-data`

**请求参数**:
- `uploadId` (string): 上传会话ID，必填
- `chunkNumber` (number): 分片序号（从0开始），必填
- `chunk` (file): 分片文件数据，必填

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "分片上传成功",
  "data": {
    "uploadId": "upload_uuid_123",
    "chunkNumber": 5,
    "uploadedChunks": [0, 1, 2, 3, 4, 5],
    "totalChunks": 20,
    "isComplete": false
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误或上传会话无效
- `401` - 未授权访问
- `404` - 上传会话不存在

### 3. 完成上传

#### POST `/api/upload/complete`
**描述**: 完成分片上传，合并所有分片并创建视频记录

**认证**: 需要JWT Token

**请求参数**:
```json
{
  "uploadId": "string",      // 上传会话ID，必填
  "title": "string"          // 视频标题，必填
}
```

**成功响应 (201)**:
```json
{
  "success": true,
  "code": 201,
  "message": "上传完成",
  "data": {
    "id": 1,
    "title": "测试视频",
    "original_filename": "video.mp4",
    "file_size": 104857600,
    "status": "uploaded",
    "conversion_progress": 0,
    "created_at": "2024-07-16T12:00:00.000Z",
    "updated_at": "2024-07-16T12:00:00.000Z"
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 参数错误或分片不完整
- `401` - 未授权访问
- `404` - 上传会话不存在

### 4. 获取上传状态

#### GET `/api/upload/status/:uploadId`
**描述**: 获取分片上传会话的当前状态

**认证**: 需要JWT Token

**路径参数**:
- `uploadId` (string): 上传会话ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取上传状态成功",
  "data": {
    "id": "upload_uuid_123",
    "filename": "video.mp4",
    "file_size": 104857600,
    "total_chunks": 20,
    "chunk_size": 5242880,
    "uploaded_chunks": [0, 1, 2, 3, 4, 5],
    "status": "uploading",
    "expires_at": "2024-07-17T12:00:00.000Z",
    "created_at": "2024-07-16T12:00:00.000Z",
    "updated_at": "2024-07-16T12:00:00.000Z"
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 上传ID无效
- `401` - 未授权访问
- `404` - 上传会话不存在

### 5. 取消上传

#### DELETE `/api/upload/:uploadId`
**描述**: 取消分片上传会话并清理临时文件

**认证**: 需要JWT Token

**路径参数**:
- `uploadId` (string): 上传会话ID

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "上传已取消",
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `400` - 上传ID无效
- `401` - 未授权访问
- `404` - 上传会话不存在

### 6. 手动清理过期上传

#### POST `/api/upload/cleanup`
**描述**: 手动触发清理过期的上传会话和临时文件

**认证**: 需要JWT Token

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "清理完成",
  "data": {
    "cleaned_sessions": 5,
    "cleaned_files": 23,
    "freed_space": 1073741824
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `401` - 未授权访问

### 7. 获取清理状态

#### GET `/api/upload/cleanup/status`
**描述**: 获取上传清理服务的状态信息

**认证**: 需要JWT Token

**成功响应 (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取清理状态成功",
  "data": {
    "last_cleanup": "2024-07-16T10:00:00.000Z",
    "active_sessions": 3,
    "expired_sessions": 0,
    "total_temp_size": 52428800,
    "next_scheduled_cleanup": "2024-07-16T14:00:00.000Z"
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**错误响应**:
- `401` - 未授权访问

### 分片上传特性

#### 技术特性
- **断点续传**: 支持上传中断后从已上传的分片继续
- **并发上传**: 支持多个分片并行上传，提高传输效率
- **自动重试**: 分片上传失败时自动重试，提高成功率
- **过期清理**: 自动清理过期的上传会话和临时文件

#### 性能优化
- **分片大小**: 默认5MB，可根据网络环境调整
- **并发控制**: 客户端控制并发数量，避免过载
- **内存优化**: 流式处理大文件，减少内存占用
- **存储效率**: 临时文件统一管理，定期清理

#### 使用场景
- **大文件上传**: 推荐文件大小超过10MB时使用分片上传
- **网络不稳定**: 在网络条件不佳时提供更好的上传体验
- **移动设备**: 移动端上传大文件的理想选择
- **批量处理**: 支持多文件并行上传

## 静态文件访问

### 1. 缩略图访问
- **URL**: `/thumbnails/*`
- **描述**: 访问视频缩略图文件
- **认证**: 无需认证（通过静态文件服务）

## 错误码说明

### HTTP状态码
- `200` - 请求成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未授权/认证失败
- `403` - 权限不足
- `404` - 资源不存在
- `409` - 资源冲突
- `500` - 服务器内部错误

### 业务错误类型
- `VALIDATION_ERROR` - 验证错误
- `AUTHENTICATION_ERROR` - 认证错误
- `AUTHORIZATION_ERROR` - 授权错误
- `NOT_FOUND_ERROR` - 资源不存在
- `CONFLICT_ERROR` - 资源冲突
- `BUSINESS_ERROR` - 业务逻辑错误
- `INTERNAL_ERROR` - 内部服务器错误

### 业务错误代码
- `INVALID_PARAMS` - 无效参数
- `MISSING_REQUIRED_FIELDS` - 缺少必填字段
- `INVALID_CREDENTIALS` - 认证信息无效
- `ACCESS_DENIED` - 访问被拒绝
- `RESOURCE_NOT_FOUND` - 资源不存在
- `RESOURCE_ALREADY_EXISTS` - 资源已存在
- `VIDEO_ALREADY_PROCESSING` - 视频正在处理中
- `VIDEO_NOT_READY` - 视频未准备好
- `QUEUE_FULL` - 队列已满
- `FILE_OPERATION_ERROR` - 文件操作错误

### 视频状态说明
- `uploaded` - 已上传，等待处理
- `processing` - 正在处理中
- `completed` - 处理完成，可以播放
- `failed` - 处理失败
- `deleted` - 已删除

## 数据结构定义

### 用户相关

#### UserResponse
```typescript
{
  id: number;              // 用户ID
  username: string;        // 用户名
  email: string;           // 邮箱地址
  created_at: string;      // 创建时间
  updated_at: string;      // 更新时间
}
```

#### AuthResponse
```typescript
{
  token: string;           // JWT访问令牌
  user: UserResponse;      // 用户信息
}
```

### 视频相关

#### VideoResponse
```typescript
{
  id: number;                    // 视频ID
  title: string;                 // 视频标题
  original_filename: string;     // 原始文件名
  duration?: number;             // 视频时长（秒）
  file_size: number;             // 文件大小（字节）
  status: VideoStatus;           // 视频状态
  conversion_progress: number;   // 转换进度（0-100）
  thumbnail_url?: string;       // 缩略图完整URL
  hls_url?: string;            // HLS播放完整URL
  created_at: string;           // 创建时间
  updated_at: string;           // 更新时间
}
```

#### VideoStatus枚举
```typescript
enum VideoStatus {
  UPLOADED = 'uploaded',     // 已上传
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed',   // 已完成
  FAILED = 'failed',         // 失败
  DELETED = 'deleted'        // 已删除
}
```

### 分页相关

#### PaginationMeta
```typescript
{
  page: number;            // 当前页码
  limit: number;           // 每页数量
  total: number;           // 总记录数
  pages: number;           // 总页数
  has_next: boolean;       // 是否有下一页
  has_prev: boolean;       // 是否有上一页
}
```

#### SearchMeta
```typescript
{
  query?: string | null;     // 搜索关键词
  status?: string | null;    // 状态筛选
  start_date?: string | null; // 开始日期
  end_date?: string | null;   // 结束日期
  sort_by?: string;          // 排序字段
  sort_order?: string;       // 排序方向
}
```

### 队列相关

#### QueueJob
```typescript
{
  id: number;              // 任务ID
  videoId: number;         // 视频ID
  status: string;          // 任务状态：pending/processing/completed/failed
  priority: number;        // 任务优先级
  retryCount: number;      // 重试次数
  maxRetries: number;      // 最大重试次数
  errorMessage?: string;   // 错误信息
  createdAt: string;       // 创建时间
  startedAt?: string;      // 开始时间
  completedAt?: string;    // 完成时间
}
```

### 分享相关

#### ShareResponse
```typescript
{
  id: number;              // 分享记录ID
  video_id: number;        // 视频ID
  access_token: string;    // 访问令牌（UUID格式）
  share_url: string;       // 完整的分享URL
  created_at: string;      // 创建时间
  is_active: boolean;      // 是否启用
  access_count: number;    // 访问次数
}
```

#### ShareInfo
```typescript
{
  title: string;           // 视频标题
  duration?: number;       // 视频时长（秒）
  shared_at: string;       // 分享创建时间
  view_count: number;      // 观看次数
}
```

### 分片上传相关

#### UploadSession
```typescript
{
  id: string;              // 上传会话ID（UUID格式）
  filename: string;        // 原始文件名
  file_size: number;       // 文件总大小（字节）
  total_chunks: number;    // 总分片数
  chunk_size: number;      // 分片大小（字节）
  uploaded_chunks: number[]; // 已上传的分片序号数组
  status: UploadSessionStatus; // 上传状态
  expires_at: string;      // 过期时间
  created_at: string;      // 创建时间
  updated_at: string;      // 更新时间
}
```

#### UploadSessionStatus枚举
```typescript
enum UploadSessionStatus {
  UPLOADING = 'uploading',   // 上传中
  COMPLETED = 'completed',   // 已完成
  FAILED = 'failed',         // 失败
  CANCELLED = 'cancelled',   // 已取消
  EXPIRED = 'expired'        // 已过期
}
```

#### InitChunkedUploadRequest
```typescript
{
  filename: string;        // 原始文件名
  fileSize: number;        // 文件总大小（字节）
  chunkSize?: number;      // 分片大小（字节），可选
}
```

#### UploadChunkResponse
```typescript
{
  uploadId: string;        // 上传会话ID
  chunkNumber: number;     // 当前分片序号
  uploadedChunks: number[]; // 已上传的分片序号数组
  totalChunks: number;     // 总分片数
  isComplete: boolean;     // 是否所有分片都已上传
}
```

#### CleanupStatusResponse
```typescript
{
  last_cleanup: string;           // 上次清理时间
  active_sessions: number;        // 活跃会话数
  expired_sessions: number;       // 过期会话数
  total_temp_size: number;        // 临时文件总大小（字节）
  next_scheduled_cleanup: string; // 下次计划清理时间
}
```

---

**文档版本**: v1.4.0  
**最后更新**: 2024年7月  
**维护者**: HLSmith 开发团队  

### 更新日志

#### v1.4.0 (2024-07-16)
- 🔄 **重大变更**: API响应字段名称更新
  - `thumbnail_path` → `thumbnail_url` 
  - `hls_path` → `hls_url`
- ✨ 所有视频相关接口现在返回完整的URL而不是相对路径
  - 缩略图URL: `http://localhost:3001/thumbnails/2025/07/4/thumbnail.jpg`
  - HLS播放URL: `http://localhost:3001/api/stream/4/playlist.m3u8`
- 🔧 优化URL构建逻辑，支持BASE_URL环境变量配置
- 📝 更新API文档和数据结构定义

#### v1.3.0 (2024-07-16)
- ✨ 新增视频搜索功能，支持按标题关键词搜索
- ✨ 新增视频筛选功能，支持按状态、日期范围筛选
- ✨ 新增视频排序功能，支持多字段排序（创建时间、更新时间、标题、文件大小、时长）
- ✨ 新增搜索元数据返回，包含当前搜索和排序条件
- 🔧 扩展API响应结构，支持搜索相关的元数据
- 📝 完善视频列表API文档，添加搜索参数说明

#### v1.2.0 (2024-07-16)
- ✨ 新增分片上传模块，支持大文件上传
- ✨ 新增断点续传功能，提升上传体验
- ✨ 新增上传会话管理和状态查询
- ✨ 新增自动清理过期上传的机制
- 🔧 完善错误处理和重试逻辑
- 📝 新增分片上传API完整文档

#### v1.1.0 (2024-07-16)
- ✨ 新增视频分享模块
- ✨ 新增UUID永久分享链接功能
- ✨ 新增无认证的公开播放端点
- ✨ 新增分享链接管理功能
- ✨ 新增访问统计和状态控制
- 📝 完善API文档结构和示例