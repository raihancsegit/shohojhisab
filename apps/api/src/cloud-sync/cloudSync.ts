import fs from 'fs';
import path from 'path';
import os from 'os';
import type Database from 'better-sqlite3';

export interface CloudSyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
  bucket: string;
  fileName: string;
}

export interface CloudSyncStatus {
  configured: boolean;
  provider: 'supabase' | 'none';
  bucket: string;
  fileName: string;
  lastSyncTime: string | null;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  lastError: string | null;
  localDbSize: number;
}

class CloudSyncService {
  private config: CloudSyncConfig | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private statusInfo: CloudSyncStatus = {
    configured: false,
    provider: 'none',
    bucket: 'dokandata',
    fileName: 'local-business-os.db',
    lastSyncTime: null,
    status: 'idle',
    lastError: null,
    localDbSize: 0,
  };

  constructor() {
    this.reloadConfig();
  }

  public reloadConfig(): void {
    const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseUrl = rawUrl.trim().replace(/\/$/, '');
    const supabaseKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ''
    ).trim();
    const bucket = (process.env.SUPABASE_BUCKET || 'dokandata').trim();
    const fileName = (process.env.SUPABASE_DB_FILENAME || 'local-business-os.db').trim();

    if (supabaseUrl && supabaseKey) {
      this.config = {
        supabaseUrl,
        supabaseKey,
        bucket,
        fileName,
      };
      this.statusInfo.configured = true;
      this.statusInfo.provider = 'supabase';
      this.statusInfo.bucket = bucket;
      this.statusInfo.fileName = fileName;
      console.log(`[CloudSync] ☁️ Supabase Cloud Sync configured for bucket: '${bucket}' (File: ${fileName})`);
    } else {
      this.config = null;
      this.statusInfo.configured = false;
      this.statusInfo.provider = 'none';
      console.log(`[CloudSync] ℹ️ Cloud sync not configured (SUPABASE_URL or SUPABASE_KEY missing). Local SQLite storage in use.`);
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.config);
  }

  public getStatus(localDbPath?: string): CloudSyncStatus {
    if (localDbPath && fs.existsSync(localDbPath)) {
      try {
        const stats = fs.statSync(localDbPath);
        this.statusInfo.localDbSize = stats.size;
      } catch (e) {}
    }
    return { ...this.statusInfo };
  }

  /**
   * Automatically ensure bucket exists in Supabase Storage.
   */
  private async ensureBucketExists(): Promise<boolean> {
    if (!this.config) return false;
    try {
      const checkRes = await fetch(`${this.config.supabaseUrl}/storage/v1/bucket/${this.config.bucket}`, {
        method: 'GET',
        headers: {
          apikey: this.config.supabaseKey,
          Authorization: `Bearer ${this.config.supabaseKey}`,
        },
      });

      if (checkRes.status === 200) {
        return true;
      }

      // If bucket does not exist, create it
      if (checkRes.status === 404 || checkRes.status === 400) {
        console.log(`[CloudSync] 🪣 Bucket '${this.config.bucket}' not found. Creating new bucket...`);
        const createRes = await fetch(`${this.config.supabaseUrl}/storage/v1/bucket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.config.supabaseKey,
            Authorization: `Bearer ${this.config.supabaseKey}`,
          },
          body: JSON.stringify({
            id: this.config.bucket,
            name: this.config.bucket,
            public: false,
          }),
        });

        if (createRes.ok || createRes.status === 409) {
          console.log(`[CloudSync] ✅ Bucket '${this.config.bucket}' ready`);
          return true;
        } else {
          const errText = await createRes.text();
          console.warn(`[CloudSync] ⚠️ Bucket creation returned ${createRes.status}: ${errText}`);
        }
      }
      return true;
    } catch (err: any) {
      console.warn(`[CloudSync] ⚠️ Failed checking bucket: ${err.message}`);
      return false;
    }
  }

  /**
   * Download database from Supabase cloud storage into target local path.
   */
  public async downloadDatabase(targetDbPath: string): Promise<{ success: boolean; message: string; size?: number }> {
    if (!this.config) {
      return { success: false, message: 'Cloud sync is not configured (missing SUPABASE_URL / KEY)' };
    }

    try {
      console.log(`[CloudSync] 📥 Attempting to download '${this.config.fileName}' from cloud bucket '${this.config.bucket}'...`);
      await this.ensureBucketExists();

      const downloadUrl = `${this.config.supabaseUrl}/storage/v1/object/authenticated/${this.config.bucket}/${this.config.fileName}`;
      const res = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          apikey: this.config.supabaseKey,
          Authorization: `Bearer ${this.config.supabaseKey}`,
        },
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 400) {
          return { success: false, message: `Cloud backup file '${this.config.fileName}' does not exist in bucket yet.` };
        }
        const errorText = await res.text();
        return { success: false, message: `Cloud download failed (HTTP ${res.status}): ${errorText}` };
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 100) {
        return { success: false, message: 'Cloud backup file is empty or invalid.' };
      }

      // Ensure directory exists
      const dir = path.dirname(targetDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write atomically via temporary file
      const tempPath = `${targetDbPath}.tmp-${Date.now()}`;
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, targetDbPath);

      // Clean WAL and SHM if restoring a clean DB
      const walFile = `${targetDbPath}-wal`;
      const shmFile = `${targetDbPath}-shm`;
      if (fs.existsSync(walFile)) {
        try { fs.unlinkSync(walFile); } catch (e) {}
      }
      if (fs.existsSync(shmFile)) {
        try { fs.unlinkSync(shmFile); } catch (e) {}
      }

      this.statusInfo.lastSyncTime = new Date().toISOString();
      this.statusInfo.status = 'synced';
      this.statusInfo.localDbSize = buffer.length;
      this.statusInfo.lastError = null;

      console.log(`[CloudSync] 🎉 Successfully restored database from Supabase (${(buffer.length / 1024).toFixed(1)} KB) -> ${targetDbPath}`);
      return { success: true, message: 'Database successfully restored from cloud storage', size: buffer.length };
    } catch (err: any) {
      console.error(`[CloudSync] ❌ Download error:`, err);
      this.statusInfo.lastError = err.message;
      this.statusInfo.status = 'error';
      return { success: false, message: err.message };
    }
  }

  /**
   * Upload database to Supabase cloud storage safely.
   * If a live dbInstance (better-sqlite3) is provided, uses db.backup() for a 100% clean, atomic WAL checkpoint.
   */
  public async uploadDatabase(
    dbPath: string,
    dbInstance?: Database.Database
  ): Promise<{ success: boolean; message: string; size?: number }> {
    if (!this.config) {
      return { success: false, message: 'Cloud sync is not configured (missing SUPABASE_URL / KEY)' };
    }

    if (this.isSyncing) {
      return { success: false, message: 'Sync is already in progress' };
    }

    this.isSyncing = true;
    this.statusInfo.status = 'syncing';

    const tempBackup = path.resolve(os.tmpdir(), `cloud-backup-${Date.now()}.db`);

    try {
      await this.ensureBucketExists();

      let uploadFile = dbPath;

      // 1. Take clean WAL-checkpointed atomic snapshot if live DB instance available
      if (dbInstance && typeof dbInstance.backup === 'function') {
        try {
          await dbInstance.backup(tempBackup);
          uploadFile = tempBackup;
        } catch (backupErr: any) {
          console.warn(`[CloudSync] ⚠️ Live backup error, fallback to raw file: ${backupErr.message}`);
        }
      }

      if (!fs.existsSync(uploadFile)) {
        throw new Error(`Database file to upload not found at ${uploadFile}`);
      }

      const fileBuffer = fs.readFileSync(uploadFile);
      if (fileBuffer.length === 0) {
        throw new Error('Database file is empty (0 bytes). Skipping upload to protect cloud backup.');
      }

      console.log(`[CloudSync] 📤 Uploading database (${(fileBuffer.length / 1024).toFixed(1)} KB) to bucket '${this.config.bucket}'...`);

      const uploadUrl = `${this.config.supabaseUrl}/storage/v1/object/${this.config.bucket}/${this.config.fileName}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          apikey: this.config.supabaseKey,
          Authorization: `Bearer ${this.config.supabaseKey}`,
          'x-upsert': 'true',
          'Content-Type': 'application/x-sqlite3',
        },
        body: fileBuffer,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed with HTTP ${res.status}: ${errText}`);
      }

      this.statusInfo.lastSyncTime = new Date().toISOString();
      this.statusInfo.status = 'synced';
      this.statusInfo.localDbSize = fileBuffer.length;
      this.statusInfo.lastError = null;

      console.log(`[CloudSync] 🚀 Cloud backup uploaded successfully to Supabase Storage at ${this.statusInfo.lastSyncTime}!`);
      return { success: true, message: 'Cloud backup saved successfully', size: fileBuffer.length };
    } catch (err: any) {
      console.error(`[CloudSync] ❌ Upload failed:`, err);
      this.statusInfo.status = 'error';
      this.statusInfo.lastError = err.message;
      return { success: false, message: err.message };
    } finally {
      this.isSyncing = false;
      if (fs.existsSync(tempBackup)) {
        try { fs.unlinkSync(tempBackup); } catch (e) {}
      }
    }
  }

  /**
   * Schedule debounced cloud backup (e.g. 10s after last transaction)
   */
  public scheduleBackup(dbPath: string, dbInstance?: Database.Database, delayMs = 10000): void {
    if (!this.config) return;

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(async () => {
      this.syncTimer = null;
      await this.uploadDatabase(dbPath, dbInstance);
    }, delayMs);
  }
}

export const cloudSync = new CloudSyncService();
