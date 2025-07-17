# HLSmith Backend API Documentation

## 📋 Table of Contents
- [Basic Information](#basic-information)
- [Response Format Specification](#response-format-specification)
- [Authentication Methods](#authentication-methods)
- [System Endpoints](#system-endpoints)
- [User Authentication Module](#user-authentication-module)
- [Video Management Module](#video-management-module)
- [HLS Conversion Module](#hls-conversion-module)
- [Streaming Playback Module](#streaming-playback-module)
- [Video Sharing Module](#video-sharing-module)
- [Queue Management Module](#queue-management-module)
- [Chunked Upload Module](#chunked-upload-module)
- [Error Code Reference](#error-code-reference)
- [Data Structure Definitions](#data-structure-definitions)

## Basic Information

### Server Information
- **Base URL**: `http://localhost:3001`
- **Default Port**: 3001
- **API Prefix**: `/api`
- **Content-Type**: `application/json`

### Version Information
- **API Version**: v1.0.0
- **Documentation Updated**: December 2023

## Response Format Specification

### Unified Response Structure
All API endpoints follow this unified response format:

```typescript
interface ApiResponse<T = any> {
  success: boolean;          // Request success status
  code: number;             // HTTP status code
  message: string;          // Response message
  data?: T;                 // Response data
  error?: ErrorDetail;      // Error details
  meta?: ResponseMeta;      // Metadata information
  timestamp: string;        // Response timestamp
}
```

### Success Response Example
```json
{
  "success": true,
  "code": 200,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### Paginated Response Example
```json
{
  "success": true,
  "code": 200,
  "message": "List retrieved successfully",
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

### Error Response Example
```json
{
  "success": false,
  "code": 400,
  "message": "Request parameter error",
  "error": {
    "type": "VALIDATION_ERROR",
    "code": "INVALID_PARAMS",
    "message": "Username and password cannot be empty",
    "details": {
      "fields": ["username", "password"]
    }
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

## Authentication Methods

### JWT Token Authentication
- **Authentication Method**: Bearer Token
- **Request Header**: `Authorization: Bearer <token>`
- **Token Acquisition**: Obtained through login endpoint
- **Token Validity**: According to server configuration

### Example
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## System Endpoints

### 1. Service Status Check

#### GET `/`
**Description**: Check basic service status

**Authentication**: No authentication required

**Response**:
```json
{
  "success": true,
  "code": 200,
  "message": "HLSmith backend service is running normally",
  "data": {
    "message": "HLSmith Backend Server",
    "status": "running",
    "version": "1.0.0"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### 2. Health Check

#### GET `/api/health`
**Description**: Detailed service health status check

**Authentication**: No authentication required

**Response**:
```json
{
  "success": true,
  "code": 200,
  "message": "Service health check passed",
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

## User Authentication Module

Base URL: `/api/auth`

### 1. User Registration

#### POST `/api/auth/register`
**Description**: Register new user account

**Authentication**: No authentication required

**Request Parameters**:
```json
{
  "username": "string",     // Username, required
  "email": "string",        // Email address, required, unique
  "password": "string"      // Password, required, minimum 6 characters
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "code": 201,
  "message": "Registration successful",
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

**Error Responses**:
- `400` - Parameter error (username/email/password empty, password too short)
- `409` - User already exists (email or username duplicate)

### 2. User Login

#### POST `/api/auth/login`
**Description**: User login to obtain access token

**Authentication**: No authentication required

**Request Parameters**:
```json
{
  "email": "string",        // Email address, required
  "password": "string"      // Password, required
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Login successful",
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

**Error Responses**:
- `400` - Parameter error (email or password empty)
- `401` - Authentication failed (incorrect email or password)

### 3. Get User Information

#### GET `/api/auth/profile`
**Description**: Get current logged-in user's detailed information

**Authentication**: JWT Token required

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "User information retrieved successfully",
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

**Error Responses**:
- `401` - Unauthorized access
- `404` - User not found

## Video Management Module

Base URL: `/api/videos`

**Note**: All video endpoints require JWT authentication

### 1. Upload Video

#### POST `/api/videos/upload`
**Description**: Upload video file to server

**Authentication**: JWT Token required

**Request Format**: `multipart/form-data`

**Request Parameters**:
- `video` (file): Video file, required
- `title` (string): Video title, required

**Success Response (201)**:
```json
{
  "success": true,
  "code": 201,
  "message": "Video uploaded successfully",
  "data": {
    "id": 1,
    "title": "Test Video",
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

**Error Responses**:
- `400` - Parameter error (no file selected or empty title)
- `401` - Unauthorized access

### 2. Get Video List

#### GET `/api/videos`
**Description**: Get current user's video list with pagination, search, filtering, and sorting support

**Authentication**: JWT Token required

**Query Parameters**:
- `page` (number, optional): Page number, default 1
- `limit` (number, optional): Items per page, default 10, max 100
- `q` (string, optional): Search keywords (search by title)
- `status` (string, optional): Status filter (uploaded/processing/completed/failed)
- `start_date` (string, optional): Start date (ISO 8601 format)
- `end_date` (string, optional): End date (ISO 8601 format)
- `sort_by` (string, optional): Sort field (created_at/updated_at/title/file_size/duration), default created_at
- `sort_order` (string, optional): Sort direction (ASC/DESC), default DESC

**Query Parameter Example**:
```
GET /api/videos?q=test&status=completed&sort_by=file_size&sort_order=ASC&page=1&limit=20
```

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Video list retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "Test Video",
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
      "query": "test",
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

**Error Responses**:
- `400` - Pagination parameter error, status parameter error, or sort parameter error
- `401` - Unauthorized access

### 3. Get Video Details

#### GET `/api/videos/:id`
**Description**: Get detailed information of specified video

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Video information retrieved successfully",
  "data": {
    "id": 1,
    "title": "Test Video",
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

**Error Responses**:
- `400` - Invalid video ID
- `401` - Unauthorized access
- `404` - Video not found

### 4. Get Video Status

#### GET `/api/videos/:id/status`
**Description**: Get video processing status (same as get video details)

**Authentication**: JWT Token required

**Response**: Same as get video details endpoint

### 5. Update Video Information

#### PUT `/api/videos/:id`
**Description**: Update video title

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Request Parameters**:
```json
{
  "title": "string"      // New video title, required
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Video information updated successfully",
  "data": {
    "id": 1,
    "title": "New Title",
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

**Error Responses**:
- `400` - Parameter error (invalid video ID or empty title)
- `401` - Unauthorized access
- `404` - Video not found

### 6. Delete Video

#### DELETE `/api/videos/:id`
**Description**: Delete specified video and related files

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Video deleted successfully",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**Error Responses**:
- `400` - Invalid video ID
- `401` - Unauthorized access
- `404` - Video not found

### 7. Retry Video Processing

#### POST `/api/videos/:id/retry`
**Description**: Retry failed video processing task

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Video processing restarted successfully",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**Error Responses**:
- `400` - Parameter error or business logic error (only failed status videos can be retried)
- `401` - Unauthorized access
- `404` - Video not found

### 8. Generate Sharing Link

#### POST `/api/videos/:id/share`
**Description**: Generate permanent sharing link for specified video

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Sharing link generated successfully",
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

**Error Responses**:
- `400` - Invalid video ID
- `401` - Unauthorized access
- `404` - Video not found or not yet converted

### 9. Get Video Sharing List

#### GET `/api/videos/:id/shares`
**Description**: Get all sharing links for specified video

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Sharing link list retrieved successfully",
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

**Error Responses**:
- `400` - Invalid video ID
- `401` - Unauthorized access
- `404` - Video not found

### 10. Download Original Video

#### GET `/api/videos/:id/download`
**Description**: Download original file of specified video

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Success Response (200)**:
Returns binary stream data of the video file

**Response Headers**:
```
Content-Type: video/mp4
Content-Disposition: attachment; filename="original_filename.mp4"
Content-Length: file_size_in_bytes
```

**Error Responses**:
- `400` - Invalid video ID
- `401` - Unauthorized access
- `404` - Video not found
- `500` - Original file not found or download failed

## HLS Conversion Module

Base URL: `/api/hls`

**Note**: All HLS endpoints require JWT authentication

### 1. Convert Video to HLS

#### POST `/api/hls/:id/convert`
**Description**: Convert video to HLS format

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Request Parameters**:
```json
{
  "quality": "string",      // Optional, conversion quality: low/medium/high, default medium
  "resolution": "string"    // Optional, resolution: 480p/720p/1080p, default 720p
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Video conversion added to queue",
  "data": {
    "videoId": 1,
    "jobId": 123,
    "status": "queued"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**Error Responses**:
- `400` - Parameter error or business error (video is processing or already completed)
- `401` - Unauthorized access
- `404` - Video not found

### 2. Get Conversion Status

#### GET `/api/hls/:id/status`
**Description**: Get video conversion status and queue information

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Conversion status retrieved successfully",
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

**Error Responses**:
- `400` - Invalid video ID
- `401` - Unauthorized access
- `404` - Video not found

### 3. Retry Conversion

#### POST `/api/hls/:id/retry`
**Description**: Retry failed conversion task

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Request Parameters**:
```json
{
  "quality": "string",      // Optional, conversion quality: low/medium/high, default medium
  "resolution": "string"    // Optional, resolution: 480p/720p/1080p, default 720p
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Video conversion retry started",
  "data": {
    "videoId": 1,
    "jobId": 124,
    "status": "queued"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**Error Responses**:
- `400` - Parameter error or business error (only failed conversion tasks can be retried)
- `401` - Unauthorized access
- `404` - Video not found

## Streaming Playback Module

Base URL: `/api/stream`

**Note**: All streaming endpoints require JWT authentication

### 1. Get HLS Playlist

#### GET `/api/stream/:id/playlist.m3u8`
**Description**: Get HLS playlist file for video

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Response Format**: `application/vnd.apple.mpegurl`

**Success Response (200)**:
Returns M3U8 format playlist file content

**Response Headers**:
```
Content-Type: application/vnd.apple.mpegurl
Cache-Control: no-cache
Access-Control-Allow-Origin: *
```

**Error Responses**:
- `401` - Unauthorized access
- `404` - Video not found or playlist file not found
- `400` - Video not ready for playback

### 2. Get Video Segments

#### GET `/api/stream/:id/segment_:segmentId.ts`
**Description**: Get HLS video segment files

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID
- `segmentId` (string): Segment ID

**Response Format**: `video/mp2t`

**Success Response (200)**:
Returns video segment binary data stream

**Response Headers**:
```
Content-Type: video/mp2t
Cache-Control: public, max-age=31536000
Access-Control-Allow-Origin: *
```

**Error Responses**:
- `401` - Unauthorized access
- `404` - Video not found or segment file not found
- `400` - Video not ready for playback

## Video Sharing Module

Base URL: `/api/share`

### Management Endpoints (Authentication Required)

### 1. Toggle Sharing Status

#### PUT `/api/share/manage/shares/:shareId/toggle`
**Description**: Enable or disable specified sharing link

**Authentication**: JWT Token required

**Path Parameters**:
- `shareId` (number): Share ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Sharing link enabled", // or "Sharing link disabled"
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**Error Responses**:
- `400` - Invalid share ID
- `401` - Unauthorized access
- `404` - Sharing link not found

### 2. Delete Sharing Link

#### DELETE `/api/share/manage/shares/:shareId`
**Description**: Delete specified sharing link

**Authentication**: JWT Token required

**Path Parameters**:
- `shareId` (number): Share ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Sharing link deleted successfully",
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**Error Responses**:
- `400` - Invalid share ID
- `401` - Unauthorized access
- `404` - Sharing link not found

### Public Endpoints (No Authentication Required)

### 3. Get Shared Playlist

#### GET `/api/share/:token/playlist.m3u8`
**Description**: Get HLS playlist through sharing token, no user authentication required

**Authentication**: No authentication required

**Path Parameters**:
- `token` (string): Share access token (UUID format)

**Response Format**: `application/vnd.apple.mpegurl`

**Success Response (200)**:
Returns M3U8 format playlist file content with all segment URLs converted to full paths

**Response Headers**:
```
Content-Type: application/vnd.apple.mpegurl
Cache-Control: no-cache
Access-Control-Allow-Origin: *
```

**Error Responses**:
- `400` - Invalid sharing token
- `404` - Invalid or expired sharing link

### 4. Get Shared Video Segments

#### GET `/api/share/:token/segment_:segmentId.ts`
**Description**: Get HLS video segments through sharing token, no user authentication required

**Authentication**: No authentication required

**Path Parameters**:
- `token` (string): Share access token (UUID format)
- `segmentId` (string): Video segment ID

**Response Format**: `video/mp2t`

**Success Response (200)**:
Returns video segment binary data stream

**Response Headers**:
```
Content-Type: video/mp2t
Cache-Control: public, max-age=31536000
Access-Control-Allow-Origin: *
```

**Error Responses**:
- `400` - Invalid sharing token or segment ID
- `404` - Invalid sharing link or video segment not found

### 5. Get Sharing Information

#### GET `/api/share/:token/info`
**Description**: Get basic information of shared video

**Authentication**: No authentication required

**Path Parameters**:
- `token` (string): Share access token (UUID format)

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Sharing information retrieved successfully",
  "data": {
    "title": "Test Video",
    "duration": 2566,
    "shared_at": "2024-07-16T12:00:00.000Z",
    "view_count": 25
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**Error Responses**:
- `400` - Invalid sharing token
- `404` - Invalid or expired sharing link

### Sharing Link Features

#### Security Features
- **UUID Randomness**: Uses cryptographically secure UUID v4, cannot be traversed or guessed
- **Status Control**: Supports enable/disable sharing links for easy management
- **Permission Verification**: Only video owners can manage sharing links
- **Access Statistics**: Automatically records access count and last access time

#### Performance Optimization
- **Long-term Caching**: Video segments cached for 1 year, reducing server load
- **Real-time Playlist**: Playlist not cached, ensuring URL accuracy
- **Streaming Transfer**: Uses Node.js streams to avoid memory usage

#### Use Cases
- **Permanent Sharing**: Links are permanently valid, suitable for long-term sharing
- **No Authentication Access**: Recipients can watch without registering an account
- **Cross-platform Compatibility**: Supports all standard HLS players
- **Statistics Tracking**: Can view access statistics for sharing links

## Queue Management Module

Base URL: `/api/queue`

**Note**: All queue endpoints require JWT authentication

### 1. Get Queue Status

#### GET `/api/queue/status`
**Description**: Get overall queue status overview

**Authentication**: JWT Token required

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Queue status retrieved successfully",
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

**Error Responses**:
- `401` - Unauthorized access

### 2. Get Video Queue Status

#### GET `/api/queue/video/:id`
**Description**: Get queue task status for specified video

**Authentication**: JWT Token required

**Path Parameters**:
- `id` (number): Video ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Video queue status retrieved successfully",
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

**Error Responses**:
- `400` - Invalid video ID
- `401` - Unauthorized access
- `404` - No queue task found for this video

### 3. Retry Failed Task

#### POST `/api/queue/retry/:jobId`
**Description**: Retry specified failed task

**Authentication**: JWT Token required

**Path Parameters**:
- `jobId` (number): Task ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Task retry started",
  "data": {
    "jobId": 123,
    "status": "retrying"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**Error Responses**:
- `400` - Invalid task ID or task is not in failed status
- `401` - Unauthorized access

### 4. Set Maximum Concurrency

#### POST `/api/queue/config/concurrency`
**Description**: Set queue maximum concurrent processing number

**Authentication**: JWT Token required

**Request Parameters**:
```json
{
  "maxConcurrent": 5      // Maximum concurrency, range 1-10
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Maximum concurrency updated successfully",
  "data": {
    "maxConcurrent": 5
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**Error Responses**:
- `400` - Parameter error (concurrency not in 1-10 range)
- `401` - Unauthorized access

### 5. Cleanup Completed Tasks

#### POST `/api/queue/cleanup`
**Description**: Clean up completed task records

**Authentication**: JWT Token required

**Request Parameters**:
```json
{
  "keepCount": 100        // Number of tasks to keep, range 1-1000, default 100
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Task cleanup completed",
  "data": {
    "keepCount": 100
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**Error Responses**:
- `400` - Parameter error (keep count not in 1-1000 range)
- `401` - Unauthorized access

## Chunked Upload Module

Base URL: `/api/upload`

**Note**: All chunked upload endpoints require JWT authentication

### 1. Initialize Chunked Upload

#### POST `/api/upload/init`
**Description**: Initialize chunked upload session for large file upload preparation

**Authentication**: JWT Token required

**Request Parameters**:
```json
{
  "filename": "string",      // Original filename, required
  "fileSize": "number",      // Total file size (bytes), required
  "chunkSize": "number"      // Chunk size (bytes), optional, default 5MB
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "code": 201,
  "message": "Chunked upload initialized successfully",
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

**Error Responses**:
- `400` - Parameter error (invalid filename or size)
- `401` - Unauthorized access

### 2. Upload Chunk

#### POST `/api/upload/chunk`
**Description**: Upload single file chunk

**Authentication**: JWT Token required

**Request Format**: `multipart/form-data`

**Request Parameters**:
- `uploadId` (string): Upload session ID, required
- `chunkNumber` (number): Chunk number (starting from 0), required
- `chunk` (file): Chunk file data, required

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Chunk uploaded successfully",
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

**Error Responses**:
- `400` - Parameter error or invalid upload session
- `401` - Unauthorized access
- `404` - Upload session not found

### 3. Complete Upload

#### POST `/api/upload/complete`
**Description**: Complete chunked upload, merge all chunks and create video record

**Authentication**: JWT Token required

**Request Parameters**:
```json
{
  "uploadId": "string",      // Upload session ID, required
  "title": "string"          // Video title, required
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "code": 201,
  "message": "Upload completed",
  "data": {
    "id": 1,
    "title": "Test Video",
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

**Error Responses**:
- `400` - Parameter error or incomplete chunks
- `401` - Unauthorized access
- `404` - Upload session not found

### 4. Get Upload Status

#### GET `/api/upload/status/:uploadId`
**Description**: Get current status of chunked upload session

**Authentication**: JWT Token required

**Path Parameters**:
- `uploadId` (string): Upload session ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Upload status retrieved successfully",
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

**Error Responses**:
- `400` - Invalid upload ID
- `401` - Unauthorized access
- `404` - Upload session not found

### 5. Cancel Upload

#### DELETE `/api/upload/:uploadId`
**Description**: Cancel chunked upload session and cleanup temporary files

**Authentication**: JWT Token required

**Path Parameters**:
- `uploadId` (string): Upload session ID

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Upload cancelled",
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**Error Responses**:
- `400` - Invalid upload ID
- `401` - Unauthorized access
- `404` - Upload session not found

### 6. Manual Cleanup Expired Uploads

#### POST `/api/upload/cleanup`
**Description**: Manually trigger cleanup of expired upload sessions and temporary files

**Authentication**: JWT Token required

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Cleanup completed",
  "data": {
    "cleaned_sessions": 5,
    "cleaned_files": 23,
    "freed_space": 1073741824
  },
  "timestamp": "2024-07-16T12:00:00.000Z"
}
```

**Error Responses**:
- `401` - Unauthorized access

### 7. Get Cleanup Status

#### GET `/api/upload/cleanup/status`
**Description**: Get upload cleanup service status information

**Authentication**: JWT Token required

**Success Response (200)**:
```json
{
  "success": true,
  "code": 200,
  "message": "Cleanup status retrieved successfully",
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

**Error Responses**:
- `401` - Unauthorized access

### Chunked Upload Features

#### Technical Features
- **Resume Capability**: Supports resuming upload from uploaded chunks after interruption
- **Concurrent Upload**: Supports multiple chunks uploading in parallel, improving transfer efficiency
- **Automatic Retry**: Automatically retries when chunk upload fails, improving success rate
- **Expiration Cleanup**: Automatically cleans up expired upload sessions and temporary files

#### Performance Optimization
- **Chunk Size**: Default 5MB, adjustable based on network environment
- **Concurrency Control**: Client controls concurrency count to avoid overload
- **Memory Optimization**: Stream processing for large files, reducing memory usage
- **Storage Efficiency**: Unified temporary file management, regular cleanup

#### Use Cases
- **Large File Upload**: Recommended for files larger than 10MB
- **Unstable Network**: Provides better upload experience in poor network conditions
- **Mobile Devices**: Ideal choice for mobile large file uploads
- **Batch Processing**: Supports multiple file parallel uploads

## Static File Access

### 1. Thumbnail Access
- **URL**: `/thumbnails/*`
- **Description**: Access video thumbnail files
- **Authentication**: No authentication required (through static file service)

## Error Code Reference

### HTTP Status Codes
- `200` - Request successful
- `201` - Created successfully
- `400` - Request parameter error
- `401` - Unauthorized/authentication failed
- `403` - Insufficient permissions
- `404` - Resource not found
- `409` - Resource conflict
- `500` - Internal server error

### Business Error Types
- `VALIDATION_ERROR` - Validation error
- `AUTHENTICATION_ERROR` - Authentication error
- `AUTHORIZATION_ERROR` - Authorization error
- `NOT_FOUND_ERROR` - Resource not found
- `CONFLICT_ERROR` - Resource conflict
- `BUSINESS_ERROR` - Business logic error
- `INTERNAL_ERROR` - Internal server error

### Business Error Codes
- `INVALID_PARAMS` - Invalid parameters
- `MISSING_REQUIRED_FIELDS` - Missing required fields
- `INVALID_CREDENTIALS` - Invalid credentials
- `ACCESS_DENIED` - Access denied
- `RESOURCE_NOT_FOUND` - Resource not found
- `RESOURCE_ALREADY_EXISTS` - Resource already exists
- `VIDEO_ALREADY_PROCESSING` - Video is already processing
- `VIDEO_NOT_READY` - Video not ready
- `QUEUE_FULL` - Queue is full
- `FILE_OPERATION_ERROR` - File operation error

### Video Status Descriptions
- `uploaded` - Uploaded, waiting for processing
- `processing` - Processing in progress
- `completed` - Processing completed, ready for playback
- `failed` - Processing failed
- `deleted` - Deleted

## Data Structure Definitions

### User Related

#### UserResponse
```typescript
{
  id: number;              // User ID
  username: string;        // Username
  email: string;           // Email address
  created_at: string;      // Creation time
  updated_at: string;      // Update time
}
```

#### AuthResponse
```typescript
{
  token: string;           // JWT access token
  user: UserResponse;      // User information
}
```

### Video Related

#### VideoResponse
```typescript
{
  id: number;                    // Video ID
  title: string;                 // Video title
  original_filename: string;     // Original filename
  duration?: number;             // Video duration (seconds)
  file_size: number;             // File size (bytes)
  status: VideoStatus;           // Video status
  conversion_progress: number;   // Conversion progress (0-100)
  thumbnail_url?: string;       // Thumbnail complete URL
  hls_url?: string;            // HLS playback complete URL
  created_at: string;           // Creation time
  updated_at: string;           // Update time
}
```

#### VideoStatus Enum
```typescript
enum VideoStatus {
  UPLOADED = 'uploaded',     // Uploaded
  PROCESSING = 'processing', // Processing
  COMPLETED = 'completed',   // Completed
  FAILED = 'failed',         // Failed
  DELETED = 'deleted'        // Deleted
}
```

### Pagination Related

#### PaginationMeta
```typescript
{
  page: number;            // Current page number
  limit: number;           // Items per page
  total: number;           // Total records
  pages: number;           // Total pages
  has_next: boolean;       // Has next page
  has_prev: boolean;       // Has previous page
}
```

#### SearchMeta
```typescript
{
  query?: string | null;     // Search keywords
  status?: string | null;    // Status filter
  start_date?: string | null; // Start date
  end_date?: string | null;   // End date
  sort_by?: string;          // Sort field
  sort_order?: string;       // Sort direction
}
```

### Queue Related

#### QueueJob
```typescript
{
  id: number;              // Task ID
  videoId: number;         // Video ID
  status: string;          // Task status: pending/processing/completed/failed
  priority: number;        // Task priority
  retryCount: number;      // Retry count
  maxRetries: number;      // Maximum retries
  errorMessage?: string;   // Error message
  createdAt: string;       // Creation time
  startedAt?: string;      // Start time
  completedAt?: string;    // Completion time
}
```

### Sharing Related

#### ShareResponse
```typescript
{
  id: number;              // Share record ID
  video_id: number;        // Video ID
  access_token: string;    // Access token (UUID format)
  share_url: string;       // Complete share URL
  created_at: string;      // Creation time
  is_active: boolean;      // Is enabled
  access_count: number;    // Access count
}
```

#### ShareInfo
```typescript
{
  title: string;           // Video title
  duration?: number;       // Video duration (seconds)
  shared_at: string;       // Share creation time
  view_count: number;      // View count
}
```

### Chunked Upload Related

#### UploadSession
```typescript
{
  id: string;              // Upload session ID (UUID format)
  filename: string;        // Original filename
  file_size: number;       // Total file size (bytes)
  total_chunks: number;    // Total chunks
  chunk_size: number;      // Chunk size (bytes)
  uploaded_chunks: number[]; // Uploaded chunk numbers array
  status: UploadSessionStatus; // Upload status
  expires_at: string;      // Expiration time
  created_at: string;      // Creation time
  updated_at: string;      // Update time
}
```

#### UploadSessionStatus Enum
```typescript
enum UploadSessionStatus {
  UPLOADING = 'uploading',   // Uploading
  COMPLETED = 'completed',   // Completed
  FAILED = 'failed',         // Failed
  CANCELLED = 'cancelled',   // Cancelled
  EXPIRED = 'expired'        // Expired
}
```

#### InitChunkedUploadRequest
```typescript
{
  filename: string;        // Original filename
  fileSize: number;        // Total file size (bytes)
  chunkSize?: number;      // Chunk size (bytes), optional
}
```

#### UploadChunkResponse
```typescript
{
  uploadId: string;        // Upload session ID
  chunkNumber: number;     // Current chunk number
  uploadedChunks: number[]; // Uploaded chunk numbers array
  totalChunks: number;     // Total chunks
  isComplete: boolean;     // Are all chunks uploaded
}
```

#### CleanupStatusResponse
```typescript
{
  last_cleanup: string;           // Last cleanup time
  active_sessions: number;        // Active sessions count
  expired_sessions: number;       // Expired sessions count
  total_temp_size: number;        // Total temporary file size (bytes)
  next_scheduled_cleanup: string; // Next scheduled cleanup time
}
```

---

**Documentation Version**: v1.4.0  
**Last Updated**: July 2024  
**Maintainer**: HLSmith Development Team  

### Change Log

#### v1.4.0 (2024-07-16)
- 🔄 **Breaking Change**: API response field name updates
  - `thumbnail_path` → `thumbnail_url` 
  - `hls_path` → `hls_url`
- ✨ All video-related endpoints now return complete URLs instead of relative paths
  - Thumbnail URL: `http://localhost:3001/thumbnails/2025/07/4/thumbnail.jpg`
  - HLS playback URL: `http://localhost:3001/api/stream/4/playlist.m3u8`
- 🔧 Optimized URL building logic, supports BASE_URL environment variable configuration
- 📝 Updated API documentation and data structure definitions

#### v1.3.0 (2024-07-16)
- ✨ Added video search functionality, supports search by title keywords
- ✨ Added video filtering functionality, supports filtering by status and date range
- ✨ Added video sorting functionality, supports multi-field sorting (creation time, update time, title, file size, duration)
- ✨ Added search metadata return, including current search and sort conditions
- 🔧 Extended API response structure to support search-related metadata
- 📝 Improved video list API documentation, added search parameter descriptions

#### v1.2.0 (2024-07-16)
- ✨ Added chunked upload module, supports large file uploads
- ✨ Added resume capability functionality, improving upload experience
- ✨ Added upload session management and status queries
- ✨ Added automatic cleanup mechanism for expired uploads
- 🔧 Improved error handling and retry logic
- 📝 Added complete chunked upload API documentation

#### v1.1.0 (2024-07-16)
- ✨ Added video sharing module
- ✨ Added UUID permanent sharing link functionality
- ✨ Added public playback endpoints without authentication
- ✨ Added sharing link management functionality
- ✨ Added access statistics and status control
- 📝 Improved API documentation structure and examples