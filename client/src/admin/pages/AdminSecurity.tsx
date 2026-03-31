import React from 'react';
import { Shield, Lock, Key, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const SECURITY_CHECKS = [
  { name: 'HTTPS מופעל', status: 'pass', description: 'כל התקשורת מוצפנת' },
  { name: 'Rate limiting', status: 'pass', description: 'הגנה מפני brute force' },
  { name: 'CORS מוגדר', status: 'pass', description: 'רק דומיינים מאושרים' },
  { name: 'SQL injection protection', status: 'pass', description: 'Prepared statements בשימוש' },
  { name: '2FA למנהלים', status: 'warn', description: 'מומלץ להפעיל' },
  { name: 'Session timeout', status: 'pass', description: '24 שעות' },
];

const RECENT_EVENTS = [
  { time: '2026-02-20 11:30', event: 'ניסיון כניסה כושל', user: 'admin@memoraid.com', severity: 'medium' },
  { time: '2026-02-20 09:15', event: 'שינוי הרשאות משתמש', user: 'super@memoraid.com', severity: 'low' },
  { time: '2026-02-19 22:45', event: 'ניסיון גישה לא מורשה', user: 'unknown', severity: 'high' },
  { time: '2026-02-19 14:20', event: 'איפוס סיסמה', user: 'user@example.com', severity: 'low' },
];

export default function AdminSecurity() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">אבטחה</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">בדיקות אבטחה</span>
          </div>
          <p className="text-3xl font-bold text-green-400">5/6</p>
          <p className="text-sm text-slate-500 mt-1">עוברות</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-slate-400 text-sm">אירועי אבטחה</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">3</p>
          <p className="text-sm text-slate-500 mt-1">ב-24 שעות האחרונות</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">סשנים פעילים</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">12</p>
          <p className="text-sm text-slate-500 mt-1">משתמשים מחוברים</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">בדיקות אבטחה</h2>
        <div className="space-y-3">
          {SECURITY_CHECKS.map((check, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30">
              {check.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />}
              {check.status === 'warn' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
              {check.status === 'fail' && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <h3 className="font-medium text-slate-200">{check.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{check.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200">אירועי אבטחה אחרונים</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-right text-slate-400">
              <th className="px-6 py-3 font-medium">זמן</th>
              <th className="px-6 py-3 font-medium">אירוע</th>
              <th className="px-6 py-3 font-medium">משתמש</th>
              <th className="px-6 py-3 font-medium">חומרה</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_EVENTS.map((event, i) => (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-6 py-3 text-slate-300">{event.time}</td>
                <td className="px-6 py-3 text-slate-200">{event.event}</td>
                <td className="px-6 py-3 text-slate-300 font-mono text-xs">{event.user}</td>
                <td className="px-6 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      event.severity === 'high'
                        ? 'bg-red-600/20 text-red-400'
                        : event.severity === 'medium'
                        ? 'bg-amber-600/20 text-amber-400'
                        : 'bg-blue-600/20 text-blue-400'
                    }`}
                  >
                    {event.severity === 'high' ? 'גבוהה' : event.severity === 'medium' ? 'בינונית' : 'נמוכה'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">המלצות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• הפעל 2FA לכל משתמשי Admin</li>
          <li>• בדוק logs באופן קבוע לאירועים חשודים</li>
          <li>• עדכן dependencies באופן שוטף (npm audit)</li>
          <li>• הגדר IP whitelist למנהלים</li>
        </ul>
      </div>
    </div>
  );
}
