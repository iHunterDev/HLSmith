import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UPLOAD_CONFIG } from '../utils/uploadConfig';

const MAX_COVER_SIZE = parseInt(process.env.COVER_MAX_SIZE || '10485760'); // 10MB default

const SUPPORTED_IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const dirPath = path.join(UPLOAD_CONFIG.STORAGE_BASE, 'covers', year, month);
    fs.mkdirSync(dirPath, { recursive: true });
    cb(null, dirPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMimetype = SUPPORTED_IMAGE_MIMETYPES.includes(file.mimetype);
  const isValidExtension = SUPPORTED_IMAGE_EXTENSIONS.includes(ext);

  if (isValidMimetype && isValidExtension) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported cover format. File: ${file.originalname}, Type: ${file.mimetype}, Extension: ${ext}. Supported extensions: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}`
      )
    );
  }
};

export const coverUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_COVER_SIZE,
    files: 1,
  },
});

export const handleCoverMulterError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'File too large',
          message: `Maximum file size is ${MAX_COVER_SIZE / 1024 / 1024}MB`,
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files',
          message: 'Only one file is allowed',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected file field',
          message: 'File field name should be "cover"',
        });
      default:
        return res.status(400).json({
          error: 'File upload error',
          message: error.message,
        });
    }
  }

  if (error.message?.includes('Unsupported cover format')) {
    return res.status(400).json({
      error: 'Unsupported file format',
      message: error.message,
    });
  }

  next(error);
};
