import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '../database/init';
import { UploadSessionStatus } from '../models/UploadSession';
import { UPLOAD_CONFIG } from '../utils/uploadConfig';
import { StorageUtils } from '../utils/storageUtils';

export class UploadCleanupService {
  private static instance: UploadCleanupService;
  private db: DatabaseManager;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {
    this.db = DatabaseManager.getInstance();
  }

  public static getInstance(): UploadCleanupService {
    if (!UploadCleanupService.instance) {
      UploadCleanupService.instance = new UploadCleanupService();
    }
    return UploadCleanupService.instance;
  }

  public async startCleanupScheduler(): Promise<void> {
    if (this.cleanupTimer) {
      console.log('Cleanup scheduler already running');
      return;
    }

    console.log(`Starting upload cleanup scheduler - interval: ${UPLOAD_CONFIG.CLEANUP_INTERVAL_MINUTES} minutes`);
    
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.runCleanup();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, UPLOAD_CONFIG.CLEANUP_INTERVAL_MINUTES * 60 * 1000);

    await this.runCleanup();
  }

  public stopCleanupScheduler(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('Upload cleanup scheduler stopped');
    }
  }

  public async runCleanup(): Promise<CleanupResult> {
    if (this.isRunning) {
      console.log('Cleanup already running, skipping...');
      return { expiredSessions: 0, orphanChunks: 0, tempFiles: 0 };
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('Starting upload cleanup...');
      
      const [expiredSessions, orphanChunks, tempFiles] = await Promise.all([
        this.cleanupExpiredSessions(),
        this.cleanupOrphanChunks(),
        this.cleanupTempFiles()
      ]);

      const duration = Date.now() - startTime;
      const result = { expiredSessions, orphanChunks, tempFiles };
      
      console.log(`Upload cleanup completed in ${duration}ms:`, result);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  public async cleanupExpiredSessions(): Promise<number> {
    try {
      const expiredSessions = await this.db.all(
        `SELECT id, chunks_path FROM upload_sessions 
         WHERE (status = ? OR expires_at < datetime('now')) 
         AND status != ?`,
        [UploadSessionStatus.UPLOADING, UploadSessionStatus.COMPLETED]
      );

      let cleanedCount = 0;

      for (const session of expiredSessions) {
        try {
          await this.cleanupSessionChunks(session.id);
          
          await this.db.run(
            'UPDATE upload_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [UploadSessionStatus.EXPIRED, session.id]
          );
          
          cleanedCount++;
        } catch (error) {
          console.error(`Failed to cleanup session ${session.id}:`, error);
        }
      }

      await this.deleteOldSessions();

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
      return 0;
    }
  }

  public async cleanupSessionChunks(uploadId: string): Promise<void> {
    try {
      const session = await this.db.get(
        'SELECT chunks_path FROM upload_sessions WHERE id = ?',
        [uploadId]
      );

      if (session?.chunks_path) {
        await StorageUtils.removeDirectory(session.chunks_path);
      }
    } catch (error) {
      console.error(`Failed to cleanup chunks for session ${uploadId}:`, error);
    }
  }

  public async cleanupOrphanChunks(): Promise<number> {
    try {
      const chunksBaseDir = UPLOAD_CONFIG.CHUNKS_DIR;
      
      if (!(await StorageUtils.fileExists(chunksBaseDir))) {
        return 0;
      }

      const chunkDirs = await StorageUtils.getDirectoryFiles(chunksBaseDir);
      const activeSessions = new Set(
        (await this.db.all('SELECT id FROM upload_sessions WHERE status = ?', [UploadSessionStatus.UPLOADING]))
          .map(s => s.id)
      );

      let cleanedCount = 0;

      for (const dirName of chunkDirs) {
        if (!activeSessions.has(dirName)) {
          const dirPath = path.join(chunksBaseDir, dirName);
          const stats = await fs.promises.stat(dirPath).catch(() => null);
          
          if (stats?.isDirectory()) {
            const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
            
            if (ageHours > UPLOAD_CONFIG.SESSION_EXPIRE_HOURS) {
              await StorageUtils.removeDirectory(dirPath);
              cleanedCount++;
            }
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning orphan chunks:', error);
      return 0;
    }
  }

  public async cleanupTempFiles(): Promise<number> {
    try {
      const tempDir = UPLOAD_CONFIG.TEMP_DIR;
      
      if (!(await StorageUtils.fileExists(tempDir))) {
        return 0;
      }

      const tempFiles = await StorageUtils.getDirectoryFiles(tempDir);
      let cleanedCount = 0;

      for (const fileName of tempFiles) {
        try {
          const filePath = path.join(tempDir, fileName);
          const stats = await fs.promises.stat(filePath);
          const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
          
          if (fileName === 'chunks' && stats.isDirectory()) {
            // Special handling for temp chunks directory - clean old temp files inside it
            const chunkTempFiles = await StorageUtils.getDirectoryFiles(filePath);
            for (const chunkTempFile of chunkTempFiles) {
              try {
                const chunkTempFilePath = path.join(filePath, chunkTempFile);
                const chunkTempStats = await fs.promises.stat(chunkTempFilePath);
                const chunkTempAgeHours = (Date.now() - chunkTempStats.mtime.getTime()) / (1000 * 60 * 60);
                
                // Clean temp chunk files older than 1 hour
                if (chunkTempAgeHours > UPLOAD_CONFIG.TEMP_FILE_EXPIRE_HOURS) {
                  await StorageUtils.removeFile(chunkTempFilePath);
                  cleanedCount++;
                }
              } catch (error) {
                console.warn(`Failed to cleanup temp chunk file ${chunkTempFile}:`, error);
              }
            }
          } else if (ageHours > UPLOAD_CONFIG.TEMP_FILE_EXPIRE_HOURS) {
            // Handle regular files and directories
            if (stats.isDirectory()) {
              await StorageUtils.removeDirectory(filePath);
            } else {
              await StorageUtils.removeFile(filePath);
            }
            cleanedCount++;
          }
        } catch (error) {
          console.warn(`Failed to cleanup temp item ${fileName}:`, error);
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning temp files:', error);
      return 0;
    }
  }

  public async getCleanupStats(): Promise<CleanupStats> {
    try {
      const [
        totalSessions,
        activeSessions,
        expiredSessions,
        chunkDirectories,
        tempFiles
      ] = await Promise.all([
        this.db.get('SELECT COUNT(*) as count FROM upload_sessions'),
        this.db.get('SELECT COUNT(*) as count FROM upload_sessions WHERE status = ?', [UploadSessionStatus.UPLOADING]),
        this.db.get('SELECT COUNT(*) as count FROM upload_sessions WHERE status = ? OR expires_at < datetime("now")', [UploadSessionStatus.EXPIRED]),
        this.getDirectoryCount(UPLOAD_CONFIG.CHUNKS_DIR),
        this.getDirectoryCount(UPLOAD_CONFIG.TEMP_DIR)
      ]);

      return {
        totalSessions: totalSessions?.count || 0,
        activeSessions: activeSessions?.count || 0,
        expiredSessions: expiredSessions?.count || 0,
        chunkDirectories,
        tempFiles,
        isCleanupRunning: this.isRunning
      };
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        chunkDirectories: 0,
        tempFiles: 0,
        isCleanupRunning: this.isRunning
      };
    }
  }

  private async deleteOldSessions(): Promise<void> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await this.db.run(
      'DELETE FROM upload_sessions WHERE updated_at < ? AND status IN (?, ?, ?)',
      [oneWeekAgo, UploadSessionStatus.COMPLETED, UploadSessionStatus.EXPIRED, UploadSessionStatus.CANCELLED]
    );
  }

  private async getDirectoryCount(dirPath: string): Promise<number> {
    try {
      if (!(await StorageUtils.fileExists(dirPath))) {
        return 0;
      }
      const files = await StorageUtils.getDirectoryFiles(dirPath);
      return files.length;
    } catch {
      return 0;
    }
  }
}

export interface CleanupResult {
  expiredSessions: number;
  orphanChunks: number;
  tempFiles: number;
}

export interface CleanupStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  chunkDirectories: number;
  tempFiles: number;
  isCleanupRunning: boolean;
}

export const uploadCleanupService = UploadCleanupService.getInstance();