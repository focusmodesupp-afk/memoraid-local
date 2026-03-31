import React, { useState } from 'react';
import { Layers, Plus, Settings } from 'lucide-react';

type Namespace = {
  id: string;
  name: string;
  description: string;
  familyCount: number;
  enabled: boolean;
};

const MOCK_NAMESPACES: Namespace[] = [
  { id: '1', name: 'production', description: 'סביבת ייצור - משפחות פעילות', familyCount: 325, enabled: true },
  { id: '2', name: 'staging', description: 'סביבת בדיקות - לפני עליה לייצור', familyCount: 12, enabled: true },
  { id: '3', name: 'development', description: 'סביבת פיתוח - בדיקות מקומיות', familyCount: 5, enabled: true },
  { id: '4', name: 'demo', description: 'סביבת הדגמה - למכירות ושיווק', familyCount: 3, enabled: false },
];

export default function AdminNamespaces() {
  const [namespaces] = useState<Namespace[]>(MOCK_NAMESPACES);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">מרחבי שמות (Namespaces)</h1>
        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Namespace חדש
        </button>
      </div>

      <div className="grid gap-4">
        {namespaces.map((ns) => (
          <div key={ns.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-3 rounded-lg ${ns.enabled ? 'bg-blue-600/20' : 'bg-slate-700'}`}>
                  <Layers className={`w-5 h-5 ${ns.enabled ? 'text-blue-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-slate-100">{ns.name}</h2>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        ns.enabled ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {ns.enabled ? 'פעיל' : 'כבוי'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{ns.description}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{ns.familyCount} משפחות</span>
                  </div>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• Namespaces מאפשרים הפרדה לוגית בין סביבות שונות</li>
          <li>• כל namespace יכול להיות עם DB נפרד או schema נפרד</li>
          <li>• שימושי למולטי-טננסי, A/B testing, ובדיקות</li>
          <li>• ניתן להגדיר הרשאות שונות לכל namespace</li>
        </ul>
      </div>
    </div>
  );
}
