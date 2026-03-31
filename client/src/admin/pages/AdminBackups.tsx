import React, { useState } from 'react';
import { Database, Download, Upload, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

type Backup = {
  id: string;
  timestamp: string;
  size: string;
  status: 'completed' | 'in_progress' | 'failed';
  type: 'auto' | 'manual';
};

const MOCK_BACKUPS: Backup[] = [
  { id: '1', timestamp: '2026-02-20 03:00', size: '245 MB', status: 'completed', type: 'auto' },
  { id: '2', timestamp: '2026-02-19 03:00', size: '243 MB', status: 'completed', type: 'auto' },
  { id: '3', timestamp: '2026-02-18 15:30', size: '241 MB', status: 'completed', type: 'manual' },
  { id: '4', timestamp: '2026-02-18 03:00', size: '240 MB', status: 'completed', type: 'auto' },
  { id: '5', timestamp: '2026-02-17 03:00', size: '238 MB', status: 'failed', type: 'auto' },
];

export default function AdminBackups() {
  const [backups] = useState<Backup[]>(MOCK_BACKUPS);
  const [creating, setCreating] = useState(false);

  async function createBackup() {
    setCreating(true);
    setTimeout(() => {
      alert('גיבוי חדש נוצר בהצלחה!');
      setCreating(false);
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">גיבויים</h1>
        <button
          onClick={createBackup}
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Database className="w-4 h-4" />
          {creating ? 'יוצר גיבוי...' : 'צור גיבוי ידני'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">גיבוי אחרון</span>
          </div>
          <p className="text-xl font-bold text-slate-100">2026-02-20 03:00</p>
          <p className="text-sm text-slate-500 mt-1">לפני 9 שעות</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">תדירות</span>
          </div>
          <p className="text-xl font-bold text-slate-100">יומי</p>
          <p className="text-sm text-slate-500 mt-1">03:00 בלילה</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400 text-sm">גודל כולל</span>
          </div>
          <p className="text-xl font-bold text-slate-100">1.2 GB</p>
          <p className="text-sm text-slate-500 mt-1">5 גיבויים</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200">היסטוריית גיבויים</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-right text-slate-400">
              <th className="px-6 py-3 font-medium">תאריך ושעה</th>
              <th className="px-6 py-3 font-medium">גודל</th>
              <th className="px-6 py-3 font-medium">סוג</th>
              <th className="px-6 py-3 font-medium">סטטוס</th>
              <th className="px-6 py-3 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup) => (
              <tr key={backup.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-6 py-3 text-slate-200">{backup.timestamp}</td>
                <td className="px-6 py-3 text-slate-300">{backup.size}</td>
                <td className="px-6 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      backup.type === 'auto' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'
                    }`}
                  >
                    {backup.type === 'auto' ? 'אוטומטי' : 'ידני'}
                  </span>
                </td>
                <td className="px-6 py-3">
                  {backup.status === 'completed' && (
                    <span className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      הושלם
                    </span>
                  )}
                  {backup.status === 'in_progress' && (
                    <span className="flex items-center gap-2 text-blue-400">
                      <Clock className="w-4 h-4" />
                      בתהליך
                    </span>
                  )}
                  {backup.status === 'failed' && (
                    <span className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      נכשל
                    </span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    {backup.status === 'completed' && (
                      <>
                        <button className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200">
                          <Upload className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• גיבויים אוטומטיים רצים כל לילה ב-03:00</li>
          <li>• גיבויים מאוחסנים ב-S3 / Backblaze B2</li>
          <li>• שמירת 30 גיבויים אחרונים (ניתן להגדרה)</li>
          <li>• שחזור מגיבוי דורש אישור Super Admin</li>
        </ul>
      </div>
    </div>
  );
}
