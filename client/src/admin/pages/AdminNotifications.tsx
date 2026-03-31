import React, { useState } from 'react';
import { Bell, Mail, MessageSquare, CheckCircle } from 'lucide-react';

type NotificationTemplate = {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  trigger: string;
  enabled: boolean;
};

const TEMPLATES: NotificationTemplate[] = [
  { id: '1', name: 'תזכורת למשימה', channel: 'push', trigger: '30 דקות לפני', enabled: true },
  { id: '2', name: 'משימה חדשה נוצרה', channel: 'in_app', trigger: 'מיידי', enabled: true },
  { id: '3', name: 'דוח שבועי', channel: 'email', trigger: 'ראשון 09:00', enabled: true },
  { id: '4', name: 'הזמנה למשפחה', channel: 'email', trigger: 'מיידי', enabled: true },
  { id: '5', name: 'תזכורת SMS', channel: 'sms', trigger: '1 שעה לפני', enabled: false },
  { id: '6', name: 'עדכון סיסמה', channel: 'email', trigger: 'מיידי', enabled: true },
];

export default function AdminNotifications() {
  const [templates] = useState<NotificationTemplate[]>(TEMPLATES);

  const channelIcons = {
    email: Mail,
    sms: MessageSquare,
    push: Bell,
    in_app: Bell,
  };

  const channelLabels = {
    email: 'אימייל',
    sms: 'SMS',
    push: 'Push',
    in_app: 'באפליקציה',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">ניהול התראות</h1>

      <div className="grid gap-4 md:grid-cols-4">
        {(['email', 'sms', 'push', 'in_app'] as const).map((channel) => {
          const count = templates.filter((t) => t.channel === channel && t.enabled).length;
          const Icon = channelIcons[channel];
          return (
            <div key={channel} className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon className="w-5 h-5 text-blue-400" />
                <span className="text-slate-400 text-sm">{channelLabels[channel]}</span>
              </div>
              <p className="text-3xl font-bold text-slate-100">{count}</p>
              <p className="text-sm text-slate-500 mt-1">תבניות פעילות</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200">תבניות התראות</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-right text-slate-400">
              <th className="px-6 py-3 font-medium">שם</th>
              <th className="px-6 py-3 font-medium">ערוץ</th>
              <th className="px-6 py-3 font-medium">טריגר</th>
              <th className="px-6 py-3 font-medium">סטטוס</th>
              <th className="px-6 py-3 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => {
              const Icon = channelIcons[template.channel];
              return (
                <tr key={template.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-6 py-3 text-slate-200">{template.name}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Icon className="w-4 h-4" />
                      {channelLabels[template.channel]}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-300">{template.trigger}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        template.enabled ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {template.enabled ? 'פעיל' : 'כבוי'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs">
                      ערוך
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-amber-600/50 bg-amber-900/10 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-2">הערות</h2>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• Email נשלח דרך Resend</li>
          <li>• SMS דורש אינטגרציה עם Twilio</li>
          <li>• Push notifications דרך Firebase (Mobile) או Web Push API</li>
          <li>• ניתן להגדיר תבניות מותאמות אישית עם משתנים</li>
        </ul>
      </div>
    </div>
  );
}
