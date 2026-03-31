import React from 'react';
import { Zap, Calendar, Bell, Mail } from 'lucide-react';

const AUTOMATIONS = [
  {
    name: 'תזכורות יומיות',
    description: 'שליחת תזכורות למשימות שמתחילות היום',
    enabled: true,
    schedule: '08:00 בוקר',
    icon: Bell,
  },
  {
    name: 'דוח שבועי',
    description: 'סיכום משימות שבועי למנהלי משפחות',
    enabled: true,
    schedule: 'ראשון 09:00',
    icon: Mail,
  },
  {
    name: 'ניקוי משימות ישנות',
    description: 'ארכוב משימות שבוטלו לפני 90 יום',
    enabled: false,
    schedule: 'חודשי',
    icon: Calendar,
  },
  {
    name: 'AI suggestions',
    description: 'הצעות משימות חכמות על בסיס היסטוריה',
    enabled: false,
    schedule: 'יומי 20:00',
    icon: Zap,
  },
];

export default function AdminPlanner() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">מתכנן אוטומטי</h1>

      <div className="space-y-3">
        {AUTOMATIONS.map((auto, i) => (
          <div key={i} className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${auto.enabled ? 'bg-blue-600/20' : 'bg-slate-700'}`}>
                <auto.icon className={`w-5 h-5 ${auto.enabled ? 'text-blue-400' : 'text-slate-500'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-100">{auto.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">{auto.description}</p>
                    <p className="text-xs text-slate-500 mt-2">תזמון: {auto.schedule}</p>
                  </div>
                  <button
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      auto.enabled ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {auto.enabled ? 'פעיל' : 'כבוי'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• אוטומציות רצות ב-background jobs (Bull/BullMQ)</li>
          <li>• ניתן להגדיר cron expressions מותאמות אישית</li>
          <li>• לוגים של כל ריצה נשמרים ב-audit log</li>
        </ul>
      </div>
    </div>
  );
}
