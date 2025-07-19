import { config } from 'dotenv';

// Load environment variables first before any other imports
config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './database/init';
import { QueueService } from './services/queueService';
import { uploadCleanupService } from './services/uploadCleanupService';
import { StorageUtils } from './utils/storageUtils';
import { ResponseHelper } from './utils/response';
import authRoutes from './routes/auth';
import videoRoutes from './routes/video';
import hlsRoutes from './routes/hls';
import streamRoutes from './routes/stream';
import queueRoutes from './routes/queue';
import chunkedUploadRoutes from './routes/chunkedUpload';
import shareRoutes from './routes/share';


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic route for health check
app.get('/', (req, res) => {
  const data = {
    message: 'HLSmith Backend Server',
    status: 'running',
    version: '1.0.0'
  };
  ResponseHelper.success(res, data, 'HLSmith 后端服务运行正常');
});

app.get('/api/health', (req, res) => {
  const data = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  ResponseHelper.success(res, data, '服务健康检查通过');
});

// Static file serving for uploads with year/month structure support
app.use('/thumbnails', express.static(path.join(process.cwd(), 'storage/thumbnails')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/hls', hlsRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/upload', chunkedUploadRoutes);
app.use('/api/share', shareRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // 如果响应已经发送，则不再处理
  if (res.headersSent) {
    return next(err);
  }

  // 根据错误类型返回不同的响应
  if (err.name === 'ValidationError') {
    ResponseHelper.validationError(res, err.message, err.details);
  } else if (err.name === 'UnauthorizedError') {
    ResponseHelper.authenticationError(res, '认证失败');
  } else if (err.name === 'MulterError') {
    ResponseHelper.validationError(res, '文件上传错误', { error: err.message });
  } else if (err.status === 404) {
    ResponseHelper.notFoundError(res, '资源不存在');
  } else {
    const message = process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误';
    ResponseHelper.internalError(res, message);
  }
});

// 404 handler
app.use((req, res) => {
  ResponseHelper.notFoundError(res, `路由 ${req.originalUrl} 不存在`);
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  
  // Initialize database
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }

  // Initialize storage directories
  try {
    await StorageUtils.ensureDirectoriesExist();
    console.log('✅ Storage directories initialized');
  } catch (error) {
    console.error('Failed to initialize storage directories:', error);
    process.exit(1);
  }
  
  // Initialize queue service
  try {
    const queueService = QueueService.getInstance();
    console.log('✅ Queue service initialized and started');
  } catch (error) {
    console.error('Failed to initialize queue service:', error);
    process.exit(1);
  }

  // Initialize upload cleanup service
  try {
    await uploadCleanupService.startCleanupScheduler();
    console.log('✅ Upload cleanup service started');
  } catch (error) {
    console.error('Failed to start upload cleanup service:', error);
  }
});