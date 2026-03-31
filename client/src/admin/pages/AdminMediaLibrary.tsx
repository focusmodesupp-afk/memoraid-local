import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Image, File, Upload } from 'lucide-react';

type Media = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  url: string;
  createdAt: string;
};

export default function AdminMediaLibrary() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<Media[]>('/admin/content/media')
      .then(setMedia)
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), []);

  function formatSize(bytes: number | null) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">ספריית מדיה</h1>
        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center gap-2">
          <Upload className="w-4 h-4" />
          העלה קובץ
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">טוען...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {media.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center">
              <p className="text-slate-500">אין קבצים</p>
            </div>
          ) : (
            media.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden hover:border-slate-600">
                <div className="aspect-video bg-slate-900 flex items-center justify-center">
                  {m.mimeType?.startsWith('image/') ? (
                    <img src={m.url} alt={m.originalName} className="w-full h-full object-cover" />
                  ) : (
                    <File className="w-12 h-12 text-slate-600" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-200 truncate" title={m.originalName}>
                    {m.originalName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{formatSize(m.sizeBytes)}</p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-1" title={m.url}>
                    {m.filename}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• העלאת קבצים תתווסף בהמשך (דורש multer או S3 integration)</li>
          <li>• הספרייה תומכת בתמונות, PDF, ווידאו</li>
          <li>• קבצים יישמרו ב-/uploads או S3/Cloudinary</li>
        </ul>
      </div>
    </div>
  );
}
