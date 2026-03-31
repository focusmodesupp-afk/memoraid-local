/**
 * File Processor – extracts content from files for AI analysis.
 * Images/PDF → base64 for Claude Vision; text/CSV/JSON → raw text.
 */
import { storageService } from './fileStorage';

export type ProcessedFileType = 'image' | 'pdf' | 'text' | 'metadata_only';

export interface ProcessedFile {
  type: ProcessedFileType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** For image/pdf: base64 data. For text: raw text content. */
  content: string;
  /** For vision: media_type (image/png etc). For text: undefined. */
  mediaType?: string;
}

const TEXT_MIMES = new Set(['text/plain', 'text/csv', 'application/json']);
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_TEXT_CHARS = 50000; // ~12k tokens
const PDF_TEXT_LIMIT = 30000;

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    const text = (data?.text ?? '').toString().trim();
    return text.length > PDF_TEXT_LIMIT ? text.slice(0, PDF_TEXT_LIMIT) + '\n\n[... קוצר מטעמי גודל ...]' : text;
  } catch {
    return '[לא ניתן לחלץ טקסט מ-PDF – הקובץ יישלח כ-base64 ל-Vision]';
  }
}

async function readTextFile(buffer: Buffer): Promise<string> {
  const text = buffer.toString('utf-8');
  if (text.length > MAX_TEXT_CHARS) {
    return text.slice(0, MAX_TEXT_CHARS) + '\n\n[... קוצר מטעמי גודל ...]';
  }
  return text;
}

export async function processFileForAI(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ProcessedFile> {
  const sizeBytes = buffer.length;

  if (IMAGE_MIMES.has(mimeType)) {
    const base64 = buffer.toString('base64');
    return {
      type: 'image',
      filename,
      mimeType,
      sizeBytes,
      content: base64,
      mediaType: mimeType,
    };
  }

  if (mimeType === 'application/pdf') {
    const text = await extractPdfText(buffer);
    if (text.startsWith('[') && text.includes('לא ניתן')) {
      const base64 = buffer.toString('base64');
      return { type: 'pdf', filename, mimeType, sizeBytes, content: base64, mediaType: 'application/pdf' };
    }
    return { type: 'pdf', filename, mimeType, sizeBytes, content: text };
  }

  if (TEXT_MIMES.has(mimeType)) {
    const content = await readTextFile(buffer);
    return { type: 'text', filename, mimeType, sizeBytes, content };
  }

  if (mimeType === 'video/mp4') {
    return {
      type: 'metadata_only',
      filename,
      mimeType,
      sizeBytes,
      content: `[קובץ וידאו: ${filename}, גודל: ${(sizeBytes / 1024).toFixed(1)} KB. לא ניתן לנתח את התוכן – נשמר כצירוף בלבד.]`,
    };
  }

  return {
    type: 'metadata_only',
    filename,
    mimeType,
    sizeBytes,
    content: `[קובץ: ${filename}, סוג: ${mimeType}, גודל: ${sizeBytes} bytes]`,
  };
}

export async function processFileByUrl(url: string, mimeType: string, filename: string): Promise<ProcessedFile> {
  const buffer = await storageService.getBuffer(url);
  return processFileForAI(buffer, mimeType, filename);
}
