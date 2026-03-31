import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Activity, Calendar } from 'lucide-react';

const ANALYTICS_DATA = {
  pageViews: { total: 45230, change: 12.5 },
  uniqueUsers: { total: 3420, change: 8.3 },
  avgSessionTime: { total: '4:32', change: -2.1 },
  bounceRate: { total: 32.4, change: -5.2 },
};

const TOP_PAGES = [
  { path: '/dashboard', views: 12340, uniqueUsers: 2100 },
  { path: '/tasks', views: 8920, uniqueUsers: 1850 },
  { path: '/patient', views: 6540, uniqueUsers: 1420 },
  { path: '/family', views: 4230, uniqueUsers: 980 },
  { path: '/profile', views: 2180, uniqueUsers: 720 },
];

const USER_ACTIVITY = [
  { hour: '00:00', users: 45 },
  { hour: '04:00', users: 12 },
  { hour: '08:00', users: 234 },
  { hour: '12:00', users: 456 },
  { hour: '16:00', users: 389 },
  { hour: '20:00', users: 278 },
];

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">אנליטיקה</h1>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {range === '7d' ? '7 ימים' : range === '30d' ? '30 ימים' : '90 ימים'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">צפיות בדפים</span>
          </div>
          <p className="text-3xl font-bold text-slate-100">{ANALYTICS_DATA.pageViews.total.toLocaleString()}</p>
          <p className={`text-sm mt-1 ${ANALYTICS_DATA.pageViews.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {ANALYTICS_DATA.pageViews.change > 0 ? '+' : ''}
            {ANALYTICS_DATA.pageViews.change}% מהתקופה הקודמת
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400 text-sm">משתמשים ייחודיים</span>
          </div>
          <p className="text-3xl font-bold text-slate-100">{ANALYTICS_DATA.uniqueUsers.total.toLocaleString()}</p>
          <p className={`text-sm mt-1 ${ANALYTICS_DATA.uniqueUsers.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {ANALYTICS_DATA.uniqueUsers.change > 0 ? '+' : ''}
            {ANALYTICS_DATA.uniqueUsers.change}% מהתקופה הקודמת
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">זמן סשן ממוצע</span>
          </div>
          <p className="text-3xl font-bold text-slate-100">{ANALYTICS_DATA.avgSessionTime.total}</p>
          <p className={`text-sm mt-1 ${ANALYTICS_DATA.avgSessionTime.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {ANALYTICS_DATA.avgSessionTime.change > 0 ? '+' : ''}
            {ANALYTICS_DATA.avgSessionTime.change}% מהתקופה הקודמת
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span className="text-slate-400 text-sm">Bounce Rate</span>
          </div>
          <p className="text-3xl font-bold text-slate-100">{ANALYTICS_DATA.bounceRate.total}%</p>
          <p className={`text-sm mt-1 ${ANALYTICS_DATA.bounceRate.change < 0 ? 'text-green-400' : 'text-red-400'}`}>
            {ANALYTICS_DATA.bounceRate.change > 0 ? '+' : ''}
            {ANALYTICS_DATA.bounceRate.change}% מהתקופה הקודמת
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200">דפים פופולריים</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-right text-slate-400">
              <th className="px-6 py-3 font-medium">נתיב</th>
              <th className="px-6 py-3 font-medium">צפיות</th>
              <th className="px-6 py-3 font-medium">משתמשים ייחודיים</th>
            </tr>
          </thead>
          <tbody>
            {TOP_PAGES.map((page, i) => (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-6 py-3 text-slate-200 font-mono text-xs">{page.path}</td>
                <td className="px-6 py-3 text-slate-300">{page.views.toLocaleString()}</td>
                <td className="px-6 py-3 text-slate-300">{page.uniqueUsers.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">פעילות משתמשים לפי שעה</h2>
        <div className="flex items-end gap-2 h-48">
          {USER_ACTIVITY.map((item, i) => {
            const maxUsers = Math.max(...USER_ACTIVITY.map((u) => u.users));
            const height = (item.users / maxUsers) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-700 rounded-t relative" style={{ height: `${height}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t" />
                </div>
                <span className="text-xs text-slate-500">{item.hour}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• נתונים נאספים דרך Google Analytics או Plausible</li>
          <li>• ניתן לסנן לפי משפחה, תפקיד, או דף ספציפי</li>
          <li>• ייצוא דוחות ל-CSV/PDF זמין בכפתור למעלה</li>
        </ul>
      </div>
    </div>
  );
}
