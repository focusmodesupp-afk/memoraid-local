/**
 * Encryption service for sensitive PII (idNumber, insuranceNumber).
 * AES-256-CBC with random IV per encryption.
 * Set ENCRYPTION_KEY in .env (32 bytes hex = 64 chars).
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY?.trim();
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt plaintext. Returns format: ivHex:encryptedHex
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') return '';
  const key = getKey();
  if (!key) return plaintext; // No key: store plaintext (legacy mode)
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt ciphertext in format ivHex:encryptedHex.
 * Returns empty string for null/empty or if decryption fails (e.g. plaintext stored before encryption).
 */
export function decrypt(ciphertext: string | null | undefined): string {
  if (!ciphertext || typeof ciphertext !== 'string') return '';
  if (!getKey()) return ciphertext; // No key: return as-is
  if (!ciphertext.includes(':')) return ciphertext; // Legacy plaintext
  try {
    const key = getKey()!;
    const [ivHex, encryptedHex] = ciphertext.split(':');
    if (!ivHex || !encryptedHex) return '';
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Returns true if encryption is configured and usable.
 */
export function isEncryptionAvailable(): boolean {
  return getKey() !== null;
}

/**
 * Encrypt a binary Buffer. Returns a Buffer in format: [IV (16 bytes)][encrypted data]
 */
export function encryptBuffer(plainBuffer: Buffer): Buffer {
  const key = getKey();
  if (!key) return plainBuffer; // No key: store as-is
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

/**
 * Decrypt a Buffer previously encrypted with encryptBuffer.
 * Detects unencrypted legacy files (< IV_LENGTH bytes or missing key).
 */
export function decryptBuffer(cipherBuffer: Buffer): Buffer {
  const key = getKey();
  if (!key || cipherBuffer.length <= IV_LENGTH) return cipherBuffer; // Legacy / no key
  try {
    const iv = cipherBuffer.subarray(0, IV_LENGTH);
    const encrypted = cipherBuffer.subarray(IV_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch {
    // Decryption failed — likely a legacy unencrypted file; return as-is
    return cipherBuffer;
  }
}
