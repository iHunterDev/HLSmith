import fs from 'fs';
import path from 'path';
import { UPLOAD_CONFIG, getChunkPath, getDatePath } from './uploadConfig';

export class StorageUtils {
  static normalizeCoverPath(coverPath: string | null | undefined): string | null {
    if (!coverPath) {
      return null;
    }

    const rawPath = coverPath.split('?')[0];
    const storagePrefix = 'storage/covers/';
    const coversPrefix = '/covers/';

    if (rawPath.includes(storagePrefix)) {
      const relativePath = rawPath.substring(rawPath.indexOf(storagePrefix) + storagePrefix.length);
      return `${storagePrefix}${relativePath}`;
    }

    const coversIndex = rawPath.indexOf(coversPrefix);
    if (coversIndex >= 0) {
      const relativePath = rawPath.substring(coversIndex + coversPrefix.length);
      return `${storagePrefix}${relativePath}`;
    }

    if (rawPath.startsWith('covers/')) {
      return `${storagePrefix}${rawPath.substring('covers/'.length)}`;
    }

    if (rawPath.startsWith('/')) {
      return rawPath.substring(1);
    }

    return rawPath;
  }
  static async ensureDirectoriesExist(): Promise<void> {
    const directories = [
      UPLOAD_CONFIG.CHUNKS_DIR,
      UPLOAD_CONFIG.TEMP_DIR,
      UPLOAD_CONFIG.UPLOADS_DIR,
      path.join(UPLOAD_CONFIG.TEMP_DIR, 'chunks'), // 为分片中间件创建临时目录
      path.join(UPLOAD_CONFIG.STORAGE_BASE, 'hls'),
      path.join(UPLOAD_CONFIG.STORAGE_BASE, 'thumbnails'),
      path.join(UPLOAD_CONFIG.STORAGE_BASE, 'covers')
    ];

    for (const dir of directories) {
      await this.ensureDirectoryExists(dir);
    }
  }

  static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  static async createChunkDirectory(uploadId: string, date?: Date): Promise<string> {
    const chunkDir = getChunkPath(uploadId, date);
    await this.ensureDirectoryExists(chunkDir);
    return chunkDir;
  }

  static async removeDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to remove directory ${dirPath}:`, error);
    }
  }

  static async removeFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to remove file ${filePath}:`, error);
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }

  static async getDirectoryFiles(dirPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(dirPath);
    } catch {
      return [];
    }
  }

  static async ensureYearMonthDirectories(basePath: string, date?: Date): Promise<string> {
    const { year, month } = getDatePath(date);
    const yearMonthPath = path.join(basePath, year, month);
    await this.ensureDirectoryExists(yearMonthPath);
    return yearMonthPath;
  }

  static async migrateLegacyFiles(basePath: string, targetPath: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(basePath);
      for (const file of files) {
        const sourcePath = path.join(basePath, file);
        const targetFilePath = path.join(targetPath, file);
        
        const stats = await fs.promises.stat(sourcePath);
        if (stats.isDirectory()) {
          await this.ensureDirectoryExists(targetFilePath);
          await this.migrateLegacyFiles(sourcePath, targetFilePath);
        } else {
          await fs.promises.rename(sourcePath, targetFilePath);
        }
      }
    } catch (error) {
      console.warn(`Migration failed for ${basePath}:`, error);
    }
  }

  static async mergeChunks(
    chunkDir: string, 
    totalChunks: number, 
    outputPath: string
  ): Promise<void> {
    const writeStream = fs.createWriteStream(outputPath);
    
    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunkDir, `chunk_${i.toString().padStart(6, '0')}`);
        
        if (!(await this.fileExists(chunkPath))) {
          throw new Error(`Missing chunk ${i}`);
        }
        
        const chunkData = await fs.promises.readFile(chunkPath);
        await new Promise<void>((resolve, reject) => {
          writeStream.write(chunkData, (error?: Error | null) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }
      
      await new Promise<void>((resolve, reject) => {
        writeStream.end((error?: Error | null) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      writeStream.destroy();
      throw error;
    }
  }

  static async validateChunkSequence(chunkDir: string, totalChunks: number): Promise<boolean> {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i.toString().padStart(6, '0')}`);
      if (!(await this.fileExists(chunkPath))) {
        return false;
      }
    }
    return true;
  }

  static async cleanupChunkDirectory(uploadId: string, date?: Date): Promise<void> {
    const chunkDir = getChunkPath(uploadId, date);
    await this.removeDirectory(chunkDir);
  }

  static buildThumbnailUrl(thumbnailPath: string | null, req: any): string | undefined {
    if (!thumbnailPath) {
      return undefined;
    }

    // Use BASE_URL environment variable if configured, otherwise use request info
    const baseUrl = process.env.BASE_URL 
      ? process.env.BASE_URL
      : `${req.protocol}://${req.get('host')}`;
    
    // Thumbnail paths are served as static files under /thumbnails
    // The thumbnailPath is like "storage/thumbnails/2025/07/4/thumbnail.jpg"
    // We need to extract the part after "storage/thumbnails/" and prepend with "/thumbnails"
    if (thumbnailPath.includes('storage/thumbnails/')) {
      const relativePath = thumbnailPath.substring(thumbnailPath.indexOf('storage/thumbnails/') + 'storage/thumbnails/'.length);
      return `${baseUrl}/thumbnails/${relativePath}`;
    }
    
    // Fallback for other thumbnail path formats
    const cleanPath = thumbnailPath.startsWith('/') ? thumbnailPath.substring(1) : thumbnailPath;
    return `${baseUrl}/thumbnails/${cleanPath}`;
  }

  static buildHlsUrl(hlsPath: string | null, videoId: number, req: any): string | undefined {
    if (!hlsPath) {
      return undefined;
    }

    // Use BASE_URL environment variable if configured, otherwise use request info
    const baseUrl = process.env.BASE_URL 
      ? process.env.BASE_URL
      : `${req.protocol}://${req.get('host')}`;
    
    return `${baseUrl}/api/stream/${videoId}/playlist.m3u8`;
  }

  static buildCoverUrl(coverPath: string | null, req: any): string | undefined {
    if (!coverPath) {
      return undefined;
    }

    const baseUrl = process.env.BASE_URL
      ? process.env.BASE_URL.replace(/\/$/, '')
      : `${req.protocol}://${req.get('host')}`;

    const rawPath = coverPath.split('?')[0];
    const storagePrefix = 'storage/covers/';
    const coversPrefix = '/covers/';

    if (rawPath.includes(storagePrefix)) {
      const relativePath = rawPath.substring(rawPath.indexOf(storagePrefix) + storagePrefix.length);
      return `${baseUrl}/covers/${relativePath}`;
    }

    const coversIndex = rawPath.indexOf(coversPrefix);
    if (coversIndex >= 0) {
      const relativePath = rawPath.substring(coversIndex + coversPrefix.length);
      return `${baseUrl}/covers/${relativePath}`;
    }

    if (rawPath.startsWith('covers/')) {
      return `${baseUrl}/covers/${rawPath.substring('covers/'.length)}`;
    }

    const cleanPath = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
    return `${baseUrl}/covers/${cleanPath}`;
  }
}
