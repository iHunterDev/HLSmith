import { createClient } from '@libsql/client';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'storage', 'database.sqlite');

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: ReturnType<typeof createClient>;

  private constructor() {
    this.db = createClient({
      url: `file:${DB_PATH}`
    });
    console.log('Connected to SQLite database');
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getDB(): ReturnType<typeof createClient> {
    return this.db;
  }

  public async run(sql: string, params: any[] = []): Promise<void> {
    await this.db.execute({ sql, args: params });
  }

  public async get(sql: string, params: any[] = []): Promise<any> {
    const result = await this.db.execute({ sql, args: params });
    if (result.rows.length === 0) return null;
    
    // Convert row array to object
    const row = result.rows[0];
    const columns = result.columns;
    const obj: any = {};
    
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = row[i];
    }
    
    return obj;
  }

  public async all(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.db.execute({ sql, args: params });
    const columns = result.columns;
    
    return result.rows.map(row => {
      const obj: any = {};
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = row[i];
      }
      return obj;
    });
  }

  public async close(): Promise<void> {
    await this.db.close();
  }
}

export async function initializeDatabase(): Promise<void> {
  const db = DatabaseManager.getInstance();
  
  // Create users table
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create videos table
  await db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      original_filepath TEXT NOT NULL,
      hls_path TEXT,
      duration INTEGER,
      file_size INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'uploaded',
      conversion_progress INTEGER DEFAULT 0,
      thumbnail_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create conversion queue table
  await db.run(`
    CREATE TABLE IF NOT EXISTS conversion_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      options TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    )
  `);

  // Create upload_sessions table for chunked uploads
  await db.run(`
    CREATE TABLE IF NOT EXISTS upload_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      total_chunks INTEGER NOT NULL,
      chunk_size INTEGER NOT NULL,
      uploaded_chunks TEXT DEFAULT '[]',
      chunks_path TEXT NOT NULL,
      status TEXT DEFAULT 'uploading',
      expires_at DATETIME NOT NULL,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create video_shares table for permanent share links
  await db.run(`
    CREATE TABLE IF NOT EXISTS video_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      access_token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      access_count INTEGER DEFAULT 0,
      last_accessed DATETIME,
      FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  await db.run(`CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_conversion_queue_status ON conversion_queue(status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_conversion_queue_priority ON conversion_queue(priority DESC, created_at ASC)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_conversion_queue_video_id ON conversion_queue(video_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON upload_sessions(user_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires_at ON upload_sessions(expires_at)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_video_shares_token ON video_shares(access_token)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_video_shares_video_id ON video_shares(video_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_video_shares_active ON video_shares(is_active)`);

  console.log('Database initialized successfully');
}