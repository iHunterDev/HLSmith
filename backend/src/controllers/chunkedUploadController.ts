import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../utils/jwt';
import { DatabaseManager } from '../database/init';
import { 
  CreateUploadSessionData, 
  UploadSessionStatus, 
  UploadSessionResponse,
  ChunkUploadData 
} from '../models/UploadSession';
import { CreateVideoData, VideoResponse, VideoStatus } from '../models/Video';
import { ResponseHelper, ErrorCode } from '../utils/response';
import { 
  UPLOAD_CONFIG, 
  getChunkPath, 
  getChunkFilePath, 
  getTempFilePath,
  getFinalFilePath,
  calculateTotalChunks,
  getSessionExpireTime
} from '../utils/uploadConfig';
import { StorageUtils } from '../utils/storageUtils';

const db = DatabaseManager.getInstance();

export async function initChunkedUpload(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const { filename, fileSize, chunkSize } = req.body;

    if (!filename || !fileSize) {
      return ResponseHelper.validationError(res, '缺少必要参数', {
        filename: '文件名不能为空',
        fileSize: '文件大小不能为空'
      });
    }

    if (fileSize > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      return ResponseHelper.validationError(res, `文件大小超过限制 ${UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const finalChunkSize = chunkSize || UPLOAD_CONFIG.CHUNK_SIZE;
    if (finalChunkSize < UPLOAD_CONFIG.MIN_CHUNK_SIZE || finalChunkSize > UPLOAD_CONFIG.MAX_CHUNK_SIZE) {
      return ResponseHelper.validationError(res, '分片大小不在允许范围内');
    }

    const fileExt = path.extname(filename).toLowerCase();
    if (!UPLOAD_CONFIG.SUPPORTED_EXTENSIONS.includes(fileExt)) {
      return ResponseHelper.validationError(res, '不支持的文件格式', {
        supportedFormats: UPLOAD_CONFIG.SUPPORTED_EXTENSIONS.join(', ')
      });
    }

    const uploadId = uuidv4();
    const totalChunks = calculateTotalChunks(fileSize, finalChunkSize);
    const currentDate = new Date();
    const chunksPath = getChunkPath(uploadId, currentDate);
    const expiresAt = getSessionExpireTime();

    await StorageUtils.createChunkDirectory(uploadId, currentDate);

    const sessionData: CreateUploadSessionData = {
      id: uploadId,
      user_id: userId,
      filename,
      file_size: fileSize,
      total_chunks: totalChunks,
      chunk_size: finalChunkSize,
      chunks_path: chunksPath,
      expires_at: expiresAt
    };

    await db.run(
      `INSERT INTO upload_sessions (id, user_id, filename, file_size, total_chunks, chunk_size, chunks_path, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionData.id, sessionData.user_id, sessionData.filename, sessionData.file_size, 
       sessionData.total_chunks, sessionData.chunk_size, sessionData.chunks_path, sessionData.expires_at]
    );

    const response: UploadSessionResponse = {
      id: uploadId,
      filename,
      file_size: fileSize,
      total_chunks: totalChunks,
      chunk_size: finalChunkSize,
      uploaded_chunks: [],
      status: UploadSessionStatus.UPLOADING,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    ResponseHelper.success(res, response, '上传会话创建成功', 201);
  } catch (error) {
    console.error('Init chunked upload error:', error);
    ResponseHelper.internalError(res, '创建上传会话失败');
  }
}

export async function uploadChunk(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const { uploadId, chunkNumber } = req.body;
    const chunkFile = req.file;

    if (!uploadId || chunkNumber === undefined || !chunkFile) {
      return ResponseHelper.validationError(res, '缺少必要参数');
    }

    const chunkNum = parseInt(chunkNumber);
    if (isNaN(chunkNum) || chunkNum < 0) {
      return ResponseHelper.validationError(res, '无效的分片编号');
    }

    const session = await db.get(
      'SELECT * FROM upload_sessions WHERE id = ? AND user_id = ?',
      [uploadId, userId]
    );

    if (!session) {
      return ResponseHelper.notFoundError(res, '上传会话不存在');
    }

    if (session.status !== UploadSessionStatus.UPLOADING) {
      return ResponseHelper.businessError(res, ErrorCode.UPLOAD_SESSION_INVALID, '上传会话状态无效');
    }

    if (new Date() > new Date(session.expires_at)) {
      await updateSessionStatus(uploadId, UploadSessionStatus.EXPIRED);
      return ResponseHelper.businessError(res, ErrorCode.UPLOAD_SESSION_EXPIRED, '上传会话已过期');
    }

    if (chunkNum >= session.total_chunks) {
      return ResponseHelper.validationError(res, '分片编号超出范围');
    }

    const uploadedChunks: number[] = JSON.parse(session.uploaded_chunks || '[]');
    
    // 检查文件是否已存在，而不仅仅检查数据库记录
    const chunkFilePath = getChunkFilePath(uploadId, chunkNum);
    const chunkExists = await StorageUtils.fileExists(chunkFilePath);
    
    if (uploadedChunks.includes(chunkNum) && chunkExists) {
      return ResponseHelper.businessError(res, ErrorCode.CHUNK_ALREADY_UPLOADED, '分片已存在');
    }
    
    // 如果数据库记录存在但文件不存在，从数据库记录中移除
    if (uploadedChunks.includes(chunkNum) && !chunkExists) {
      const index = uploadedChunks.indexOf(chunkNum);
      uploadedChunks.splice(index, 1);
      await db.run(
        'UPDATE upload_sessions SET uploaded_chunks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(uploadedChunks), uploadId]
      );
      console.log(`Removed orphaned chunk ${chunkNum} from database for session ${uploadId}`);
    }
    
    try {
      // 使用事务确保文件保存和数据库更新的原子性
      await fs.promises.rename(chunkFile.path, chunkFilePath);

      uploadedChunks.push(chunkNum);
      uploadedChunks.sort((a, b) => a - b);

      await db.run(
        'UPDATE upload_sessions SET uploaded_chunks = ?, last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(uploadedChunks), uploadId]
      );
    } catch (error) {
      // 如果数据库更新失败，清理已保存的文件
      try {
        await StorageUtils.removeFile(chunkFilePath);
      } catch (cleanupError) {
        console.error(`Failed to cleanup chunk file ${chunkFilePath}:`, cleanupError);
      }
      throw error;
    }

    const response = {
      uploadId,
      chunkNumber: chunkNum,
      uploadedChunks,
      totalChunks: session.total_chunks,
      isComplete: uploadedChunks.length === session.total_chunks
    };

    ResponseHelper.success(res, response, '分片上传成功');
  } catch (error) {
    console.error('Upload chunk error:', error);
    ResponseHelper.internalError(res, '分片上传失败');
  }
}

export async function completeUpload(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const { uploadId, title } = req.body;

    if (!uploadId || !title) {
      return ResponseHelper.validationError(res, '缺少必要参数');
    }

    const session = await db.get(
      'SELECT * FROM upload_sessions WHERE id = ? AND user_id = ?',
      [uploadId, userId]
    );

    if (!session) {
      return ResponseHelper.notFoundError(res, '上传会话不存在');
    }

    if (session.status !== UploadSessionStatus.UPLOADING) {
      return ResponseHelper.businessError(res, ErrorCode.UPLOAD_SESSION_INVALID, '上传会话状态无效');
    }

    const uploadedChunks: number[] = JSON.parse(session.uploaded_chunks || '[]');
    
    // 首先验证文件系统中的分片完整性
    const isValidSequence = await StorageUtils.validateChunkSequence(session.chunks_path, session.total_chunks);
    if (!isValidSequence) {
      return ResponseHelper.businessError(res, ErrorCode.CHUNK_VALIDATION_FAILED, '分片验证失败');
    }

    // 如果文件完整但数据库记录不完整，同步数据库状态
    if (uploadedChunks.length !== session.total_chunks) {
      console.log(`Syncing database state for session ${uploadId}: DB has ${uploadedChunks.length} chunks, but files show ${session.total_chunks} chunks`);
      
      // 生成完整的分片编号数组
      const completeChunks = Array.from({length: session.total_chunks}, (_, i) => i);
      
      await db.run(
        'UPDATE upload_sessions SET uploaded_chunks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(completeChunks), uploadId]
      );
      
      console.log(`Database state synchronized for session ${uploadId}`);
    }

    const uniqueFilename = `${uuidv4()}${path.extname(session.filename)}`;
    const currentDate = new Date();
    const finalPath = getFinalFilePath(uniqueFilename, currentDate);
    
    await StorageUtils.ensureDirectoryExists(path.dirname(finalPath));
    await StorageUtils.mergeChunks(session.chunks_path, session.total_chunks, finalPath);

    const stats = await fs.promises.stat(finalPath);
    if (stats.size !== session.file_size) {
      await StorageUtils.removeFile(finalPath);
      return ResponseHelper.businessError(res, ErrorCode.FILE_SIZE_MISMATCH, '合并后文件大小不匹配');
    }

    const videoData: CreateVideoData = {
      user_id: userId,
      title,
      original_filename: session.filename,
      original_filepath: finalPath,
      file_size: session.file_size
    };

    await db.run(
      'INSERT INTO videos (user_id, title, original_filename, original_filepath, file_size, status) VALUES (?, ?, ?, ?, ?, ?)',
      [videoData.user_id, videoData.title, videoData.original_filename, videoData.original_filepath, videoData.file_size, VideoStatus.UPLOADED]
    );

    const video = await db.get(
      'SELECT id, title, original_filename, file_size, status, conversion_progress, created_at, updated_at FROM videos WHERE user_id = ? AND original_filepath = ?',
      [userId, finalPath]
    );

    await updateSessionStatus(uploadId, UploadSessionStatus.COMPLETED);

    StorageUtils.cleanupChunkDirectory(uploadId, currentDate).catch(error => {
      console.warn(`Failed to cleanup chunks for session ${uploadId}:`, error);
    });

    try {
      const { QueueService } = await import('../services/queueService');
      const queueService = QueueService.getInstance();
      const jobId = await queueService.addJob(video.id, { quality: 'medium', resolution: '720p' }, 1);
      console.log(`Video ${video.id} added to conversion queue with job ID ${jobId}`);
    } catch (error) {
      console.error(`Failed to add video ${video.id} to conversion queue:`, error);
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

    ResponseHelper.success(res, videoResponse, '视频上传完成', 201);
  } catch (error) {
    console.error('Complete upload error:', error);
    ResponseHelper.internalError(res, '完成上传失败');
  }
}

export async function getUploadStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const uploadId = req.params.uploadId;
    if (!uploadId) {
      return ResponseHelper.validationError(res, '上传ID不能为空');
    }

    const session = await db.get(
      'SELECT * FROM upload_sessions WHERE id = ? AND user_id = ?',
      [uploadId, userId]
    );

    if (!session) {
      return ResponseHelper.notFoundError(res, '上传会话不存在');
    }

    const uploadedChunks: number[] = JSON.parse(session.uploaded_chunks || '[]');

    const response: UploadSessionResponse = {
      id: session.id,
      filename: session.filename,
      file_size: session.file_size,
      total_chunks: session.total_chunks,
      chunk_size: session.chunk_size,
      uploaded_chunks: uploadedChunks,
      status: session.status,
      expires_at: session.expires_at,
      created_at: session.created_at,
      updated_at: session.updated_at
    };

    ResponseHelper.success(res, response, '获取上传状态成功');
  } catch (error) {
    console.error('Get upload status error:', error);
    ResponseHelper.internalError(res, '获取上传状态失败');
  }
}

export async function cancelUpload(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const uploadId = req.params.uploadId;
    if (!uploadId) {
      return ResponseHelper.validationError(res, '上传ID不能为空');
    }

    const session = await db.get(
      'SELECT * FROM upload_sessions WHERE id = ? AND user_id = ?',
      [uploadId, userId]
    );

    if (!session) {
      return ResponseHelper.notFoundError(res, '上传会话不存在');
    }

    await updateSessionStatus(uploadId, UploadSessionStatus.CANCELLED);

    StorageUtils.cleanupChunkDirectory(uploadId).catch(error => {
      console.warn(`Failed to cleanup chunks for cancelled session ${uploadId}:`, error);
    });

    ResponseHelper.successWithoutData(res, '上传已取消');
  } catch (error) {
    console.error('Cancel upload error:', error);
    ResponseHelper.internalError(res, '取消上传失败');
  }
}

export async function syncUploadStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.authenticationError(res, '未授权访问');
    }

    const uploadId = req.params.uploadId;
    if (!uploadId) {
      return ResponseHelper.validationError(res, '上传ID不能为空');
    }

    const session = await db.get(
      'SELECT * FROM upload_sessions WHERE id = ? AND user_id = ?',
      [uploadId, userId]
    );

    if (!session) {
      return ResponseHelper.notFoundError(res, '上传会话不存在');
    }

    // 检查实际文件状态
    const actualChunks: number[] = [];
    for (let i = 0; i < session.total_chunks; i++) {
      const chunkPath = getChunkFilePath(uploadId, i);
      if (await StorageUtils.fileExists(chunkPath)) {
        actualChunks.push(i);
      }
    }

    // 更新数据库状态
    await db.run(
      'UPDATE upload_sessions SET uploaded_chunks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(actualChunks), uploadId]
    );

    const response = {
      uploadId,
      totalChunks: session.total_chunks,
      actualChunks: actualChunks.length,
      syncedChunks: actualChunks,
      isComplete: actualChunks.length === session.total_chunks
    };

    ResponseHelper.success(res, response, '状态同步完成');
  } catch (error) {
    console.error('Sync upload status error:', error);
    ResponseHelper.internalError(res, '状态同步失败');
  }
}

async function updateSessionStatus(uploadId: string, status: UploadSessionStatus): Promise<void> {
  await db.run(
    'UPDATE upload_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, uploadId]
  );
}