import React from 'react';
import { useLocation } from 'wouter';

export default function AdminSettingsAudit() {
  const [, navigate] = useLocation();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">יומן ביקורת מלא</h1>
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
        <p className="text-slate-400 mb-4">
          יומן הביקורת המלא זמין בדף <strong>יומן ביקורת</strong> בקטגוריית ניהול מערכת.
        </p>
        <button
          onClick={() => navigate('/admin/logs')}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"
        >
          עבור ליומן ביקורת
        </button>
      </div>
    </div>
  );
}
