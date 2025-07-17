import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { updateVideoStatus } from '../controllers/videoController';
import { VideoStatus } from '../models/Video';
import { getHLSPath, getThumbnailPath } from '../utils/uploadConfig';
import { StorageUtils } from '../utils/storageUtils';

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';
const HLS_OUTPUT_PATH = path.join(STORAGE_PATH, 'hls');
const THUMBNAIL_OUTPUT_PATH = path.join(STORAGE_PATH, 'thumbnails');

export interface ConversionOptions {
  quality: 'low' | 'medium' | 'high';
  resolution: '480p' | '720p' | '1080p';
  // Note: When using lossless conversion (-c:v copy), quality and resolution options are ignored for video
}

export interface ConversionProgress {
  percent: number;
  currentFps: number;
  currentKbps: number;
  targetSize: string;
  timemark: string;
}

export class HLSService {
  private static instance: HLSService;

  private constructor() {}

  public static getInstance(): HLSService {
    if (!HLSService.instance) {
      HLSService.instance = new HLSService();
    }
    return HLSService.instance;
  }

  /**
   * Convert video to HLS format
   */
  async convertToHLS(
    inputPath: string,
    outputDir: string,
    options: ConversionOptions,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<string> {
    const timeout = parseInt(process.env.FFMPEG_TIMEOUT || '1800000'); // 30 minutes
    
    return Promise.race([
      new Promise<string>(async (resolve, reject) => {
        try {
          const playlistPath = path.join(outputDir, 'playlist.m3u8');
          
          // Create output directory if it doesn't exist
          await fs.mkdir(outputDir, { recursive: true });

          const command = ffmpeg(inputPath);
        
        // Set audio quality based on options (video is copied losslessly)
        this.setVideoQuality(command, options);

        command
          .outputOptions([
            '-c:v copy',            // Copy video stream without re-encoding (lossless)
            '-c:a aac',             // Re-encode audio to AAC for HLS compatibility
            '-hls_time 10',         // HLS segment duration
            '-hls_playlist_type vod',
            '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
            '-hls_list_size 0',
            '-f hls',
            // Performance limit for audio encoding and I/O operations
            '-threads 2',           // Limit thread usage for audio encoding
            '-movflags +faststart',  // Fast start for web playback
            '-avoid_negative_ts make_zero' // Avoid timestamp issues
          ])
          .output(playlistPath)
          .on('start', (commandLine) => {
            console.log('FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            if (onProgress) {
              onProgress({
                percent: progress.percent || 0,
                currentFps: progress.currentFps || 0,
                currentKbps: progress.currentKbps || 0,
                targetSize: String(progress.targetSize || '0KB'),
                timemark: progress.timemark || '00:00:00'
              });
            }
          })
          .on('end', () => {
            console.log('HLS conversion completed:', playlistPath);
            resolve(playlistPath);
          })
          .on('error', (error) => {
            console.error('HLS conversion error:', error);
            reject(error);
          })
          .run();
        } catch (error) {
          reject(error);
        }
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`FFmpeg conversion timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * Generate thumbnail for video
   */
  async generateThumbnail(inputPath: string, outputPath: string): Promise<string> {
    const timeout = parseInt(process.env.FFMPEG_TIMEOUT || '1800000'); // 30 minutes
    
    return Promise.race([
      new Promise<string>(async (resolve, reject) => {
        try {
          // Ensure output directory exists
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          
          // Check if input file exists
          try {
            await fs.access(inputPath);
          } catch (error) {
            throw new Error(`Input file not accessible: ${inputPath}`);
          }
          
          ffmpeg(inputPath)
          .screenshots({
            timestamps: ['10%'],
            filename: 'thumbnail.jpg',
            folder: path.dirname(outputPath),
            size: '320x240'
          })
          .outputOptions([
            '-threads 1',     // Limit thread usage for thumbnail
            '-avoid_negative_ts make_zero'
          ])
          .on('start', (commandLine) => {
            console.log('FFmpeg thumbnail command:', commandLine);
          })
          .on('end', () => {
            console.log('Thumbnail generated:', outputPath);
            resolve(outputPath);
          })
          .on('error', (error: Error) => {
            console.error('Thumbnail generation error:', error);
            reject(error);
          });
        } catch (error) {
          reject(error);
        }
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`FFmpeg thumbnail generation timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(inputPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (error, metadata) => {
        if (error) {
          console.error('Metadata extraction error:', error);
          reject(error);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * Process video: convert to HLS and generate thumbnail
   */
  async processVideo(
    videoId: number,
    inputPath: string,
    options: ConversionOptions = { quality: 'medium', resolution: '720p' }
  ): Promise<{ hlsPath: string; thumbnailPath: string; metadata: any }> {
    try {
      // Update video status to processing
      await updateVideoStatus(videoId, VideoStatus.PROCESSING);

      // Create output directories with year/month structure
      const currentDate = new Date();
      const videoOutputDir = getHLSPath(String(videoId), currentDate);
      const thumbnailOutputDir = getThumbnailPath(String(videoId), currentDate);
      
      await StorageUtils.ensureDirectoryExists(videoOutputDir);
      await StorageUtils.ensureDirectoryExists(thumbnailOutputDir);

      // Get video metadata
      const metadata = await this.getVideoMetadata(inputPath);
      
      // Generate thumbnail
      const thumbnailPath = path.join(thumbnailOutputDir, 'thumbnail.jpg');
      await this.generateThumbnail(inputPath, thumbnailPath);

      // Convert to HLS with progress tracking
      const hlsPath = await this.convertToHLS(
        inputPath,
        videoOutputDir,
        options,
        (progress) => {
          console.log(`Conversion progress for video ${videoId}: ${progress.percent}%`);
        }
      );

      // Update video status to completed
      await updateVideoStatus(videoId, VideoStatus.COMPLETED);

      return {
        hlsPath,
        thumbnailPath,
        metadata
      };
    } catch (error) {
      // Update video status to failed
      await updateVideoStatus(videoId, VideoStatus.FAILED);
      throw error;
    }
  }

  /**
   * Set video quality options
   * Note: Currently using lossless conversion (-c:v copy), so video quality options are not applied
   */
  private setVideoQuality(command: ffmpeg.FfmpegCommand, options: ConversionOptions): void {
    // Since we're using -c:v copy for lossless conversion, video quality settings are not applied
    // Only audio settings may be relevant for HLS compatibility
    
    // Audio quality settings for AAC encoding
    const audioQualitySettings = {
      low: { audioBitrate: '64k' },
      medium: { audioBitrate: '128k' },
      high: { audioBitrate: '192k' }
    };

    const audioQuality = audioQualitySettings[options.quality];

    // Apply audio quality settings only
    command.outputOptions([
      `-b:a ${audioQuality.audioBitrate}`,  // Audio bitrate
      '-ar 44100',                          // Audio sample rate
      '-ac 2'                               // Audio channels (stereo)
    ]);
  }

  /**
   * Clean up HLS files for a video
   */
  async cleanupHLSFiles(videoId: number, createdAt?: Date): Promise<void> {
    try {
      const videoDate = createdAt || new Date();
      const videoOutputDir = getHLSPath(String(videoId), videoDate);
      const thumbnailOutputDir = getThumbnailPath(String(videoId), videoDate);

      // Remove HLS files
      await StorageUtils.removeDirectory(videoOutputDir);
      
      // Remove thumbnail files
      await StorageUtils.removeDirectory(thumbnailOutputDir);
      
      console.log(`Cleaned up HLS files for video ${videoId}`);
    } catch (error) {
      console.error(`Error cleaning up HLS files for video ${videoId}:`, error);
    }
  }
}

export default HLSService.getInstance();