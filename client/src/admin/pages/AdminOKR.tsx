import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Plus, Sparkles, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { ProgressBar } from '../components/dashboard';
import { apiFetch } from '../../lib/api';

type OKR = {
  id: string;
  objective: string;
  keyResults: { text: string; current: number; target: number }[];
  quarter: string;
  progress: number;
};

const MOCK_OKRS: OKR[] = [
  {
    id: '1',
    objective: 'הגדלת בסיס המשתמשים',
    quarter: 'Q1 2026',
    progress: 65,
    keyResults: [
      { text: 'הגעה ל-500 משפחות רשומות', current: 325, target: 500 },
      { text: 'שיעור המרה 15%', current: 12, target: 15 },
      { text: '100 משפחות משלמות', current: 45, target: 100 },
    ],
  },
  {
    id: '2',
    objective: 'שיפור חווית משתמש',
    quarter: 'Q1 2026',
    progress: 80,
    keyResults: [
      { text: 'זמן טעינה ממוצע < 2s', current: 1.8, target: 2 },
      { text: 'NPS > 50', current: 55, target: 50 },
      { text: 'שיעור שימור 90%', current: 88, target: 90 },
    ],
  },
];

type NexusBrief = { id: string; title: string; status: string; createdAt: string };

export default function AdminOKR() {
  const [okrs] = useState<OKR[]>(MOCK_OKRS);
  const [nexusBriefs, setNexusBriefs] = useState<NexusBrief[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    apiFetch<{ briefs: NexusBrief[] }>('/admin/nexus/briefs?limit=5')
      .then((d) => setNexusBriefs((d.briefs ?? []).filter((b) => b.status === 'approved')))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">OKR — יעדים ומדידות</h1>
        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          OKR חדש
        </button>
      </div>

      <div className="space-y-4">
        {okrs.map((okr) => (
          <div key={okr.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <Target className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{okr.objective}</h2>
                  <p className="text-sm text-slate-400">{okr.quarter}</p>
                </div>
              </div>
              <div className="text-left min-w-[6rem]">
                <p className="text-3xl font-bold text-blue-400">{okr.progress}%</p>
                <p className="text-xs text-slate-500">התקדמות</p>
                <ProgressBar value={okr.progress} height="sm" className="mt-2" color="bg-gradient-to-r from-blue-600 to-blue-400" />
              </div>
            </div>

            <div className="space-y-3">
              {okr.keyResults.map((kr, i) => {
                const percent = Math.min((kr.current / kr.target) * 100, 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{kr.text}</span>
                      <span className="text-slate-400">
                        {kr.current} / {kr.target}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percent >= 100 ? 'bg-green-500' : percent >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Nexus Approved Briefs */}
      {nexusBriefs.length > 0 && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-900/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-semibold text-purple-300">ניירות Nexus מאושרות — מועמדות ל-OKR</h2>
            </div>
            <button
              onClick={() => setLocation('/admin/nexus')}
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
            >
              כל הניירות <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {nexusBriefs.map((b) => (
              <button
                key={b.id}
                onClick={() => setLocation(`/admin/nexus/briefs/${b.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-purple-500/20 hover:border-purple-500/40 text-right transition-colors"
              >
                <span className="text-sm text-slate-200">{b.title}</span>
                <span className="text-xs text-slate-500">{new Date(b.createdAt).toLocaleDateString('he-IL')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• OKRs מתעדכנים רבעונית (Q1, Q2, Q3, Q4)</li>
          <li>• עדכון אוטומטי מנתוני המערכת (משפחות, המרות, וכו')</li>
          <li>• דוחות התקדמות שבועיים למייל</li>
        </ul>
      </div>
    </div>
  );
}
