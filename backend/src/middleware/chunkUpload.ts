import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { UPLOAD_CONFIG } from '../utils/uploadConfig';
import { StorageUtils } from '../utils/storageUtils';

const CHUNK_TEMP_PATH = path.join(UPLOAD_CONFIG.TEMP_DIR, 'chunks');

const chunkStorage = multer.diskStorage({
  destination: async (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    try {
      await StorageUtils.ensureDirectoryExists(CHUNK_TEMP_PATH);
      cb(null, CHUNK_TEMP_PATH);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const { uploadId, chunkNumber } = req.body;
    const filename = `${uploadId}_chunk_${chunkNumber}_${Date.now()}`;
    cb(null, filename);
  }
});

const chunkFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  cb(null, true);
};

export const chunkUpload = multer({
  storage: chunkStorage,
  fileFilter: chunkFileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_CHUNK_SIZE,
    files: 1
  }
});

export const handleChunkUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `分片大小超过限制 ${UPLOAD_CONFIG.MAX_CHUNK_SIZE / 1024 / 1024}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: '只能上传一个分片文件'
        });
      default:
        return res.status(400).json({
          success: false,
          message: '分片上传错误：' + error.message
        });
    }
  }
  
  next(error);
};