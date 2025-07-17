import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../utils/jwt';
import { DatabaseManager } from '../database/init';
import { CreateVideoData, VideoResponse, VideoListResponse, VideoStatus } from '../models/Video';
import hlsService from '../services/hlsService';
import { ResponseHelper, ErrorCode } from '../utils/response';
import { StorageUtils } from '../utils/storageUtils';

const db = DatabaseManager.getInstance();

export async function uploadVideo(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const file = req.file;
    if (!file) {
      return ResponseHelper.validationError(res, '请选择要上传的视频文件');
    }

    const { title } = req.body;
    if (!title) {
      return ResponseHelper.validationError(res, '视频标题不能为空');
    }

    // Get file stats
    const stats = fs.statSync(file.path);
    const fileSize = stats.size;

    // Create video record
    const videoData: CreateVideoData = {
      user_id: userId,
      title,
      original_filename: file.originalname,
      original_filepath: file.path,
      file_size: fileSize
    };

    await db.run(
      'INSERT INTO videos (user_id, title, original_filename, original_filepath, file_size, status) VALUES (?, ?, ?, ?, ?, ?)',
      [videoData.user_id, videoData.title, videoData.original_filename, videoData.original_filepath, videoData.file_size, VideoStatus.UPLOADED]
    );

    // Get created video
    const video = await db.get(
      'SELECT id, title, original_filename, file_size, status, conversion_progress, created_at, updated_at FROM videos WHERE user_id = ? AND original_filepath = ?',
      [userId, file.path]
    );

    if (!video) {
      return ResponseHelper.internalError(res, '创建视频记录失败');
    }

    const videoResponse: VideoResponse = {
      id: video.id,
      title: video.title,
      original_filename: video.original_filename,
      file_size: video.file_size,
      status: video.status,
      conversion_progress: video.conversion_progress,
      created_at: video.created_at,
      updated_at: video.updated_at
    };

    // Add video to conversion queue
    try {
      const { QueueService } = await import('../services/queueService');
      const queueService = QueueService.getInstance();
      const jobId = await queueService.addJob(video.id, { quality: 'medium', resolution: '720p' }, 1);
      console.log(`Video ${video.id} added to conversion queue with job ID ${jobId}`);
    } catch (error) {
      console.error(`Failed to add video ${video.id} to conversion queue:`, error);
    }

    ResponseHelper.success(res, videoResponse, '视频上传成功', 201);
  } catch (error) {
    console.error('Video upload error:', error);
    ResponseHelper.internalError(res, '视频上传失败，请稍后重试');
  }
}

export async function getVideos(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // 搜索参数
    const searchQuery = req.query.q as string;
    const statusFilter = req.query.status as VideoStatus;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const sortBy = req.query.sort_by as string || 'created_at';
    const sortOrder = req.query.sort_order as string || 'DESC';

    // 验证分页参数
    if (page < 1 || limit < 1 || limit > 100) {
      return ResponseHelper.validationError(res, '分页参数错误', {
        page: '页码必须大于0',
        limit: '每页数量必须在1-100之间'
      });
    }

    // 验证状态筛选参数
    if (statusFilter && !Object.values(VideoStatus).includes(statusFilter)) {
      return ResponseHelper.validationError(res, '状态参数错误', {
        status: '状态值无效'
      });
    }

    // 验证排序参数
    const validSortFields = ['created_at', 'updated_at', 'title', 'file_size', 'duration'];
    const validSortOrders = ['ASC', 'DESC'];
    if (!validSortFields.includes(sortBy) || !validSortOrders.includes(sortOrder.toUpperCase())) {
      return ResponseHelper.validationError(res, '排序参数错误', {
        sort_by: '排序字段无效',
        sort_order: '排序方向无效（ASC/DESC）'
      });
    }

    // 构建查询条件
    let whereConditions = ['user_id = ?', 'status != ?'];
    let queryParams: any[] = [userId, VideoStatus.DELETED];

    // 标题搜索
    if (searchQuery) {
      whereConditions.push('title LIKE ?');
      queryParams.push(`%${searchQuery}%`);
    }

    // 状态筛选
    if (statusFilter) {
      whereConditions.push('status = ?');
      queryParams.push(statusFilter);
    }

    // 日期范围筛选
    if (startDate) {
      whereConditions.push('created_at >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      whereConditions.push('created_at <= ?');
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const totalResult = await db.get(
      `SELECT COUNT(*) as total FROM videos WHERE ${whereClause}`,
      queryParams
    );
    const total = totalResult.total;

    // Get videos with search and sort
    const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    const videos = await db.all(
      `SELECT id, title, original_filename, duration, file_size, status, conversion_progress, thumbnail_path, hls_path, created_at, updated_at FROM videos WHERE ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const videoResponses: VideoResponse[] = videos.map(video => ({
      id: video.id,
      title: video.title,
      original_filename: video.original_filename,
      duration: video.duration,
      file_size: video.file_size,
      status: video.status,
      conversion_progress: video.conversion_progress,
      thumbnail_url: StorageUtils.buildThumbnailUrl(video.thumbnail_path, req),
      hls_url: StorageUtils.buildHlsUrl(video.hls_path, video.id, req),
      created_at: video.created_at,
      updated_at: video.updated_at
    }));

    // 创建分页信息
    const pagination = ResponseHelper.createPaginationMeta(page, limit, total);

    // 添加搜索信息到响应元数据
    const meta = {
      pagination,
      search: {
        query: searchQuery || null,
        status: statusFilter || null,
        start_date: startDate || null,
        end_date: endDate || null,
        sort_by: sortBy,
        sort_order: sortOrder.toUpperCase()
      }
    };

    // 返回带搜索信息的分页响应
    ResponseHelper.success(res, videoResponses, '获取视频列表成功', 200, meta);
  } catch (error) {
    console.error('Get videos error:', error);
    ResponseHelper.internalError(res, '获取视频列表失败');
  }
}

export async function getVideo(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    const video = await db.get(
      'SELECT id, title, original_filename, duration, file_size, status, conversion_progress, thumbnail_path, hls_path, created_at, updated_at FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    const videoResponse: VideoResponse = {
      id: video.id,
      title: video.title,
      original_filename: video.original_filename,
      duration: video.duration,
      file_size: video.file_size,
      status: video.status,
      conversion_progress: video.conversion_progress,
      thumbnail_url: StorageUtils.buildThumbnailUrl(video.thumbnail_path, req),
      hls_url: StorageUtils.buildHlsUrl(video.hls_path, video.id, req),
      created_at: video.created_at,
      updated_at: video.updated_at
    };

    ResponseHelper.success(res, videoResponse, '获取视频信息成功');
  } catch (error) {
    console.error('Get video error:', error);
    ResponseHelper.internalError(res, '获取视频信息失败');
  }
}

export async function deleteVideo(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    // Get video info
    const video = await db.get(
      'SELECT id, original_filepath, hls_path, thumbnail_path FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    // Mark as deleted in database
    await db.run(
      'UPDATE videos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [VideoStatus.DELETED, videoId]
    );

    // Clean up files (optional - could be done in background)
    try {
      if (video.original_filepath && fs.existsSync(video.original_filepath)) {
        fs.unlinkSync(video.original_filepath);
      }
      
      // Use HLS service to properly clean up HLS files and thumbnails
      // Get video creation date for proper cleanup
      const videoDetail = await db.get('SELECT created_at FROM videos WHERE id = ?', [videoId]);
      const createdAt = videoDetail?.created_at ? new Date(videoDetail.created_at) : undefined;
      await hlsService.cleanupHLSFiles(videoId, createdAt);
    } catch (fileError) {
      console.warn('File cleanup error:', fileError);
    }

    ResponseHelper.successWithoutData(res, '视频删除成功');
  } catch (error) {
    console.error('Delete video error:', error);
    ResponseHelper.internalError(res, '删除视频失败');
  }
}

export async function updateVideoStatus(videoId: number, status: VideoStatus): Promise<void> {
  try {
    await db.run(
      'UPDATE videos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, videoId]
    );
  } catch (error) {
    console.error('Update video status error:', error);
  }
}

export async function updateVideo(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    const { title } = req.body;
    if (!title) {
      return ResponseHelper.validationError(res, '视频标题不能为空');
    }

    // Check if video exists
    const existingVideo = await db.get(
      'SELECT id FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!existingVideo) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    // Update video
    await db.run(
      'UPDATE videos SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, videoId]
    );

    // Get updated video
    const video = await db.get(
      'SELECT id, title, original_filename, duration, file_size, status, conversion_progress, thumbnail_path, hls_path, created_at, updated_at FROM videos WHERE id = ?',
      [videoId]
    );

    const videoResponse: VideoResponse = {
      id: video.id,
      title: video.title,
      original_filename: video.original_filename,
      duration: video.duration,
      file_size: video.file_size,
      status: video.status,
      conversion_progress: video.conversion_progress,
      thumbnail_url: StorageUtils.buildThumbnailUrl(video.thumbnail_path, req),
      hls_url: StorageUtils.buildHlsUrl(video.hls_path, video.id, req),
      created_at: video.created_at,
      updated_at: video.updated_at
    };

    ResponseHelper.success(res, videoResponse, '视频信息更新成功');
  } catch (error) {
    console.error('Update video error:', error);
    ResponseHelper.internalError(res, '更新视频信息失败');
  }
}

export async function retryVideoProcessing(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    // Get video info
    const video = await db.get(
      'SELECT id, original_filepath, status FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    // Only allow retry for failed videos
    if (video.status !== VideoStatus.FAILED) {
      return ResponseHelper.businessError(res, ErrorCode.VIDEO_ALREADY_PROCESSING, '只有处理失败的视频才能重试');
    }

    // Check if original file still exists
    if (!fs.existsSync(video.original_filepath)) {
      return ResponseHelper.businessError(res, ErrorCode.FILE_OPERATION_ERROR, '原始视频文件不存在');
    }

    // Reset video status and clear previous conversion data
    await db.run(
      'UPDATE videos SET status = ?, conversion_progress = 0, hls_path = NULL, thumbnail_path = NULL, duration = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [VideoStatus.UPLOADED, videoId]
    );

    // Add video to conversion queue
    try {
      const { QueueService } = await import('../services/queueService');
      const queueService = QueueService.getInstance();
      const jobId = await queueService.addJob(videoId, { quality: 'medium', resolution: '720p' }, 1);
      console.log(`Video ${videoId} added to retry queue with job ID ${jobId}`);
    } catch (error) {
      console.error(`Failed to add video ${videoId} to retry queue:`, error);
      return ResponseHelper.internalError(res, '重启视频处理失败');
    }

    ResponseHelper.successWithoutData(res, '视频处理重启成功');
  } catch (error) {
    console.error('Retry video processing error:', error);
    ResponseHelper.internalError(res, '重启视频处理失败');
  }
}

export async function downloadVideo(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const videoId = parseInt(req.params.id);
    if (!videoId) {
      return ResponseHelper.validationError(res, '视频ID无效');
    }

    // Get video info
    const video = await db.get(
      'SELECT id, title, original_filename, original_filepath, file_size FROM videos WHERE id = ? AND user_id = ? AND status != ?',
      [videoId, userId, VideoStatus.DELETED]
    );

    if (!video) {
      return ResponseHelper.notFoundError(res, '视频不存在');
    }

    // Check if original file exists
    if (!fs.existsSync(video.original_filepath)) {
      return ResponseHelper.businessError(res, ErrorCode.FILE_OPERATION_ERROR, '原始视频文件不存在');
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(video.original_filename)}"`);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', video.file_size.toString());

    // Stream the file
    const fileStream = fs.createReadStream(video.original_filepath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        ResponseHelper.internalError(res, '文件下载失败');
      }
    });

  } catch (error) {
    console.error('Download video error:', error);
    if (!res.headersSent) {
      ResponseHelper.internalError(res, '下载视频失败');
    }
  }
}