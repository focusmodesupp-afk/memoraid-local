/**
 * Medical documents file storage – uploads/medical/
 * Allowed: PDF, JPEG, PNG. Max 25MB.
 * Files are encrypted at rest (AES-256) when ENCRYPTION_KEY is configured.
 * Access is protected by HMAC-signed short-lived URLs.
 */
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { encryptBuffer, decryptBuffer } from './encryption';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'medical');
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const EXT_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

export async function saveMedicalDocument(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ filename: string; url: string }> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('קובץ גדול מדי. מקסימום: 25MB');
  }
  if (!ALLOWED_MIMES.has(mimeType)) {
    throw new Error(`סוג קובץ לא נתמך. נתמך: PDF, JPEG, PNG`);
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(sanitize(originalName)) || EXT_MAP[mimeType] || '';
  const filename = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Encrypt before writing to disk (AES-256 when ENCRYPTION_KEY is set)
  const dataToWrite = encryptBuffer(buffer);
  await fs.writeFile(filePath, dataToWrite);

  // URL will be served via GET /api/medical-documents/:id/serve (id = document id, we resolve path from DB)
  // For standalone upload (no doc id yet), we store path: uploads/medical/filename
  const relativePath = `medical/${filename}`;
  return { filename, url: `/uploads/${relativePath}` };
}

export function resolvePathFromUrl(url: string): string {
  // /uploads/medical/xxx or relativePath medical/xxx
  const m = url.match(/\/(?:uploads\/)?medical\/([a-f0-9-]+\.[a-z]+)/i);
  if (m) return path.join(UPLOAD_DIR, m[1]);
  const base = path.basename(url);
  if (base) return path.join(UPLOAD_DIR, base);
  throw new Error('Invalid file path');
}

export async function getMedicalDocumentBuffer(url: string): Promise<Buffer> {
  const filePath = resolvePathFromUrl(url);
  const raw = await fs.readFile(filePath);
  // Decrypt on read (handles both encrypted and legacy unencrypted files)
  return decryptBuffer(raw);
}

export async function deleteMedicalDocumentByUrl(url: string): Promise<void> {
  try {
    const filePath = resolvePathFromUrl(url);
    await fs.unlink(filePath);
  } catch {
    // ignore
  }
}

// ── HMAC Signed URL helpers ────────────────────────────────────────────────

const SIGNED_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getSigningSecret(): string {
  const secret = process.env.ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY (or SESSION_SECRET) must be set in .env to sign medical document URLs. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return secret;
}

/**
 * Generate a short-lived HMAC signed token for serving a medical document.
 * Format: base64url(<expiry_ms>:<hmac_hex>)
 */
export function generateSignedToken(documentId: string): string {
  const expiry = Date.now() + SIGNED_URL_TTL_MS;
  const payload = `${documentId}:${expiry}`;
  const hmac = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
  const raw = `${expiry}:${hmac}`;
  return Buffer.from(raw).toString('base64url');
}

/**
 * Validate a signed token for a given documentId.
 * Returns true only if the HMAC matches AND the token has not expired.
 */
export function validateSignedToken(documentId: string, token: string): boolean {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const colonIdx = raw.indexOf(':');
    if (colonIdx === -1) return false;
    const expiry = Number(raw.slice(0, colonIdx));
    const providedHmac = raw.slice(colonIdx + 1);
    if (isNaN(expiry) || Date.now() > expiry) return false;
    const payload = `${documentId}:${expiry}`;
    const expectedHmac = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(providedHmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
  } catch {
    return false;
  }
}
