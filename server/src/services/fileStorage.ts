/**
 * File Storage Service – abstraction for storing uploaded files.
 * Local filesystem for dev; can be swapped for S3/Supabase in production.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface StorageService {
  save(buffer: Buffer, originalName: string, mimeType: string): Promise<{ filename: string; url: string }>;
  getBuffer(urlOrPath: string): Promise<Buffer>;
  deleteByUrl(url: string): Promise<void>;
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'ai-attachments');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'video/mp4',
]);

function sanitizeOriginalName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

export class LocalStorageService implements StorageService {
  private uploadDir: string;

  constructor(dir = UPLOAD_DIR) {
    this.uploadDir = dir;
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async save(buffer: Buffer, originalName: string, mimeType: string): Promise<{ filename: string; url: string }> {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`קובץ גדול מדי. מקסימום: 50MB`);
    }
    if (!ALLOWED_MIMES.has(mimeType)) {
      throw new Error(`סוג קובץ לא נתמך: ${mimeType}`);
    }

    await this.ensureDir();
    const ext = path.extname(sanitizeOriginalName(originalName)) || this.extensionFromMime(mimeType);
    const uniqueId = crypto.randomUUID();
    const filename = `${uniqueId}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    const url = `/uploads/ai-attachments/${filename}`;
    return { filename, url };
  }

  private extensionFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'application/json': '.json',
      'video/mp4': '.mp4',
    };
    return map[mime] ?? '';
  }

  async getBuffer(urlOrPath: string): Promise<Buffer> {
    const relativePath = urlOrPath.replace(/^\/uploads\/ai-attachments\//, '');
    const filePath = path.join(this.uploadDir, path.basename(relativePath));
    return fs.readFile(filePath);
  }

  async deleteByUrl(url: string): Promise<void> {
    const relativePath = url.replace(/^\/uploads\/ai-attachments\//, '');
    const filePath = path.join(this.uploadDir, path.basename(relativePath));
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore if not found
    }
  }
}

export const storageService: StorageService = new LocalStorageService();
