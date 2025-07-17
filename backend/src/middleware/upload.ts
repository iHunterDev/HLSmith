import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_PATH = process.env.STORAGE_PATH || './storage';
const MAX_FILE_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE || '2147483648'); // 2GB default

// Supported video formats (mimetypes)
const SUPPORTED_MIMETYPES = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/mkv',
  'video/x-matroska',
  'application/octet-stream' // Sometimes files are detected as this
];

// Supported video extensions
const SUPPORTED_EXTENSIONS = [
  '.mp4',
  '.avi',
  '.mov',
  '.webm',
  '.mkv',
  '.m4v',
  '.3gp',
  '.flv'
];

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, path.join(UPLOAD_PATH, 'uploads'));
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('File mimetype:', file.mimetype, 'Original name:', file.originalname);
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check both mimetype and extension
  const isValidMimetype = SUPPORTED_MIMETYPES.includes(file.mimetype);
  const isValidExtension = SUPPORTED_EXTENSIONS.includes(ext);
  
  if (isValidMimetype && isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file format. File: ${file.originalname}, Type: ${file.mimetype}, Extension: ${ext}. Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}`));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Multer error handler
export const handleMulterError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'File too large',
          message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files',
          message: 'Only one file is allowed'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected file field',
          message: 'File field name should be "video"'
        });
      default:
        return res.status(400).json({
          error: 'File upload error',
          message: error.message
        });
    }
  }
  
  if (error.message.includes('Unsupported file format')) {
    return res.status(400).json({
      error: 'Unsupported file format',
      message: error.message
    });
  }
  
  next(error);
};