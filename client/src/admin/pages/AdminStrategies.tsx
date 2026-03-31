import React from 'react';
import { Workflow, GitBranch, Repeat } from 'lucide-react';

const STRATEGIES = [
  {
    name: 'תזרים Onboarding',
    description: 'הנחיית משתמש חדש דרך כל שלבי ההתחלה',
    steps: ['רישום', 'יצירת משפחה', 'הוספת מטופל', 'משימה ראשונה'],
    icon: GitBranch,
  },
  {
    name: 'תזרים משימה יומית',
    description: 'מחזור חיים של משימה מיצירה ועד השלמה',
    steps: ['יצירה', 'תזמון', 'תזכורת', 'ביצוע', 'סיום'],
    icon: Repeat,
  },
  {
    name: 'תזרים תמיכה',
    description: 'טיפול בפניית לקוח מקבלה ועד פתרון',
    steps: ['פנייה', 'חיפוש לקוח', 'אבחון', 'פתרון', 'מעקב'],
    icon: Workflow,
  },
];

export default function AdminStrategies() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">אסטרטגיות ותזרימים</h1>

      <div className="space-y-4">
        {STRATEGIES.map((strategy, i) => (
          <div key={i} className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-blue-600/20">
                <strategy.icon className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-100">{strategy.name}</h2>
                <p className="text-sm text-slate-400 mt-1">{strategy.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mr-16">
              {strategy.steps.map((step, j) => (
                <React.Fragment key={j}>
                  <div className="flex-1 px-3 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm text-center">
                    {step}
                  </div>
                  {j < strategy.steps.length - 1 && (
                    <div className="text-slate-600">→</div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• תזרימים מוגדרים ב-state machines או workflow engines</li>
          <li>• ניתן להוסיף תנאים, פיצולים, ו-parallel paths</li>
          <li>• מעקב אחר כל שלב בתזרים ב-analytics</li>
        </ul>
      </div>
    </div>
  );
}
