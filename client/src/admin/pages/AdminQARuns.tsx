import React from 'react';
import { PlayCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

const MOCK_RUNS = [
  { id: '1', name: 'E2E - Login Flow', status: 'passed', duration: '12s', timestamp: '2026-02-20 18:30' },
  { id: '2', name: 'E2E - Task Creation', status: 'passed', duration: '8s', timestamp: '2026-02-20 18:30' },
  { id: '3', name: 'Unit - Auth Service', status: 'passed', duration: '2s', timestamp: '2026-02-20 18:30' },
  { id: '4', name: 'Unit - Family Service', status: 'failed', duration: '1s', timestamp: '2026-02-20 18:29' },
];

export default function AdminQARuns() {
  return (
    <div className="space-y-6">
      <h1 className="admin-page-title">ריצות בדיקות</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="admin-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="admin-muted text-sm">עברו</span>
          </div>
          <p className="text-3xl font-bold text-green-400">3</p>
        </div>
        <div className="admin-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="admin-muted text-sm">נכשלו</span>
          </div>
          <p className="text-3xl font-bold text-red-400">1</p>
        </div>
        <div className="admin-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="admin-muted text-sm">זמן ממוצע</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">5.8s</p>
        </div>
        <div className="admin-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <PlayCircle className="w-5 h-5 text-purple-400" />
            <span className="admin-muted text-sm">ריצה אחרונה</span>
          </div>
          <p className="text-lg font-bold text-purple-400">18:30</p>
        </div>
      </div>

      <div className="admin-table-card">
        <table className="w-full text-sm">
          <thead className="admin-table-th">
            <tr className="border-b border-slate-700 text-right">
              <th className="px-4 py-3 font-medium">בדיקה</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3 font-medium">משך</th>
              <th className="px-4 py-3 font-medium">זמן</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RUNS.map((r) => (
              <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-4 py-2 text-slate-200 text-right">{r.name}</td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 w-fit ${
                      r.status === 'passed' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}
                  >
                    {r.status === 'passed' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 admin-muted text-right">{r.duration}</td>
                <td className="px-4 py-2 admin-muted text-xs text-right">{r.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm admin-muted space-y-1">
          <li>• אינטגרציה עם Playwright/Cypress תתווסף בהמשך</li>
          <li>• ריצות אוטומטיות ב-CI/CD (GitHub Actions)</li>
          <li>• דוחות מפורטים עם screenshots של כשלונות</li>
        </ul>
      </div>
    </div>
  );
}
