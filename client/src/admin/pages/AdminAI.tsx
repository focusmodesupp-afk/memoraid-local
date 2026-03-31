import React, { useEffect, useState, useCallback } from 'react';
import { useSearch } from 'wouter';
import { apiFetch } from '../../lib/api';
import {
  Brain,
  DollarSign,
  Zap,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Target,
  Lightbulb,
  Download,
  Cpu,
} from 'lucide-react';
import AdminNexusHub from './AdminNexusHub';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

type DashboardKpis = {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  totalAnalyses: number;
};

type UsageByModel = { model: string; cost: number; tokens: number; calls: number }[];

type LeaderboardItem = {
  model: string;
  totalCost: number;
  totalTokens: number;
  callCount: number;
  avgQualityScore: number | null;
  compositeScore: number;
};

type AdminAnalysisItem = {
  adminUserId: string | null;
  adminFullName: string;
  analysisCount: number;
  totalCost: number;
  avgOutputQuality: number | null;
  avgDevQuality: number | null;
};

type AiDevCorrelation = {
  analysesCount: number;
  aiGeneratedTasksCount: number;
  completedTasksCount: number;
  completionRate: number;
};

type Insight = {
  type: string;
  severity: string;
  title: string;
  description: string;
  data?: Record<string, unknown>;
};

type AIProviders = {
  anthropic: boolean;
  openai: boolean;
  google: boolean;
  perplexity: boolean;
  resend: boolean;
};

const CHART_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#60a5fa'];

export default function AdminAI() {
  const search = useSearch();
  const initialTab = new URLSearchParams(search).get('tab');
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'costs' | 'leaderboard' | 'admins' | 'dev' | 'insights' | 'nexus'>(
    initialTab === 'nexus' ? 'nexus' : 'overview'
  );
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [usageByModel, setUsageByModel] = useState<UsageByModel>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [adminAnalysis, setAdminAnalysis] = useState<AdminAnalysisItem[]>([]);
  const [aiDevCorr, setAiDevCorr] = useState<AiDevCorrelation | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [providers, setProviders] = useState<AIProviders | null>(null);

  const FALLBACK_KPIS: DashboardKpis = { totalCost: 0, totalTokens: 0, totalCalls: 0, totalAnalyses: 0 };
  const FALLBACK_DEV: AiDevCorrelation = { analysesCount: 0, aiGeneratedTasksCount: 0, completedTasksCount: 0, completionRate: 0 };

  const load = useCallback(() => {
    setLoading(true);
    const base = `days=${days}`;
    Promise.all([
      apiFetch<DashboardKpis>(`/admin/ai/intelligence/dashboard?${base}`).catch(() => FALLBACK_KPIS),
      apiFetch<UsageByModel>(`/admin/ai/intelligence/usage-by-model?${base}`).catch(() => []),
      apiFetch<LeaderboardItem[]>(`/admin/ai/intelligence/leaderboard?${base}`).catch(() => []),
      apiFetch<AdminAnalysisItem[]>(`/admin/ai/intelligence/admin-analysis?${base}`).catch(() => []),
      apiFetch<AiDevCorrelation>(`/admin/ai/intelligence/ai-dev-correlation?${base}`).catch(() => FALLBACK_DEV),
      apiFetch<Insight[]>(`/admin/ai/intelligence/insights?${base}`).catch(() => []),
      apiFetch<AIProviders>('/admin/ai/providers').catch(() => ({ anthropic: false, openai: false, google: false, perplexity: false, resend: false })),
    ])
      .then(([k, u, l, a, d, i, p]) => {
        setKpis(k ?? FALLBACK_KPIS);
        setUsageByModel(u ?? []);
        setLeaderboard(l ?? []);
        setAdminAnalysis(a ?? []);
        setAiDevCorr(d ?? FALLBACK_DEV);
        setInsights(i ?? []);
        setProviders(p ?? null);
      })
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => load(), [load]);

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/admin/ai/intelligence/export?days=${days}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error('Export failed');
    }
  };

  if (loading) return <div className="text-slate-400 py-8">טוען Intelligence Hub...</div>;

  const tabs = [
    { id: 'nexus' as const, label: 'ניירות מחקר Nexus', icon: Cpu },
    { id: 'overview' as const, label: 'סקירה', icon: BarChart3 },
    { id: 'costs' as const, label: 'עלויות', icon: DollarSign },
    { id: 'leaderboard' as const, label: 'דירוג מודלים', icon: TrendingUp },
    { id: 'admins' as const, label: 'לפי Admin', icon: Users },
    { id: 'dev' as const, label: 'AI ופיתוח', icon: Target },
    { id: 'insights' as const, label: 'תובנות', icon: Lightbulb },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="admin-page-title text-slate-100">AI Intelligence Hub</h1>
        {activeTab !== 'nexus' && (
          <div className="flex items-center gap-3">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  days === d ? 'bg-indigo-600 text-white' : 'admin-card text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                {d} ימים
              </button>
            ))}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm admin-card text-slate-400 hover:bg-slate-700/50"
            >
              <Download className="w-4 h-4" />
              ייצוא CSV
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-700 pb-2 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm whitespace-nowrap transition-colors ${
              activeTab === id ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'nexus' && (
        <AdminNexusHub />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="admin-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="admin-muted text-sm">עלות (USD)</span>
              </div>
              <p className="text-2xl font-bold text-green-400">${(kpis?.totalCost ?? 0).toFixed(2)}</p>
            </div>
            <div className="admin-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="admin-muted text-sm">Tokens</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{(kpis?.totalTokens ?? 0).toLocaleString()}</p>
            </div>
            <div className="admin-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <span className="admin-muted text-sm">בקשות AI</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{(kpis?.totalCalls ?? 0).toLocaleString()}</p>
            </div>
            <div className="admin-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="admin-muted text-sm">ניתוחים</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{(kpis?.totalAnalyses ?? 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="admin-card rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">חלוקת עלויות לפי מודל</h2>
              {usageByModel.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usageByModel.map((r, i) => ({ name: r.model, value: r.cost }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {usageByModel.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'עלות']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-500 text-sm py-8">אין נתונים להצגה</p>
              )}
            </div>
            <div className="admin-card rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">שימוש לפי מודל (Tokens)</h2>
              {usageByModel.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageByModel} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis type="category" dataKey="model" width={120} stroke="#94a3b8" />
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                      <Bar dataKey="tokens" fill="#818cf8" name="Tokens" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-500 text-sm py-8">אין נתונים להצגה</p>
              )}
            </div>
          </div>

          <div className="admin-card rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">אינטגרציות</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { key: 'google', label: 'Google Gemini', ok: providers?.google },
                { key: 'openai', label: 'OpenAI', ok: providers?.openai },
                { key: 'anthropic', label: 'Anthropic Claude', ok: providers?.anthropic },
                { key: 'perplexity', label: 'Perplexity', ok: providers?.perplexity },
                { key: 'resend', label: 'Resend (Email)', ok: providers?.resend },
              ].map(({ key, label, ok }) => (
                <div key={key} className={`rounded-lg border border-slate-700 bg-slate-900/50 p-4 ${ok ? '' : 'opacity-50'}`}>
                  <h3 className="font-medium text-slate-200">{label}</h3>
                  <p className="text-xs text-slate-400">{ok ? 'מחובר' : 'לא מוגדר'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'costs' && (
        <div className="admin-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">עלויות לפי מודל</h2>
          {usageByModel.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-3 px-4 text-slate-400 font-medium">מודל</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">עלות (USD)</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">Tokens</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">בקשות</th>
                  </tr>
                </thead>
                <tbody>
                  {usageByModel.map((r) => (
                    <tr key={r.model} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-slate-200">{r.model}</td>
                      <td className="py-3 px-4 text-green-400">${r.cost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-300">{r.tokens.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-300">{r.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500">אין נתוני עלויות</p>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="admin-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">דירוג מודלים (Leaderboard)</h2>
          {leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-3 px-4 text-slate-400 font-medium">#</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">מודל</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">ציון מורכב</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">דירוג איכות</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">עלות</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">שימושים</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((r, i) => (
                    <tr key={r.model} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-500">{i + 1}</td>
                      <td className="py-3 px-4 font-mono text-slate-200">{r.model}</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${r.compositeScore >= 70 ? 'text-green-400' : r.compositeScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {r.compositeScore}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{r.avgQualityScore != null ? r.avgQualityScore.toFixed(1) : '–'}</td>
                      <td className="py-3 px-4 text-green-400">${r.totalCost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-300">{r.callCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500">אין נתונים לדירוג</p>
          )}
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="admin-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">ניתוח לפי Admin</h2>
          {adminAnalysis.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-3 px-4 text-slate-400 font-medium">Admin</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">ניתוחים</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">עלות</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">איכות פלט</th>
                    <th className="py-3 px-4 text-slate-400 font-medium">איכות פיתוח</th>
                  </tr>
                </thead>
                <tbody>
                  {adminAnalysis.map((r) => (
                    <tr key={r.adminUserId ?? 'unknown'} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-200">{r.adminFullName}</td>
                      <td className="py-3 px-4 text-slate-300">{r.analysisCount}</td>
                      <td className="py-3 px-4 text-green-400">${r.totalCost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-300">{r.avgOutputQuality != null ? r.avgOutputQuality.toFixed(1) : '–'}</td>
                      <td className="py-3 px-4 text-slate-300">{r.avgDevQuality != null ? r.avgDevQuality.toFixed(1) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500">אין נתוני Admin</p>
          )}
        </div>
      )}

      {activeTab === 'dev' && (
        <div className="admin-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">קורלציה AI ↔ פיתוח</h2>
          {aiDevCorr ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <span className="admin-muted text-sm">ניתוחי AI</span>
                <p className="text-2xl font-bold text-slate-100">{aiDevCorr.analysesCount}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <span className="admin-muted text-sm">Tasks מ-AI</span>
                <p className="text-2xl font-bold text-purple-400">{aiDevCorr.aiGeneratedTasksCount}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <span className="admin-muted text-sm">Tasks שהושלמו</span>
                <p className="text-2xl font-bold text-green-400">{aiDevCorr.completedTasksCount}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <span className="admin-muted text-sm">אחוז השלמה</span>
                <p className="text-2xl font-bold text-blue-400">{aiDevCorr.completionRate}%</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">אין נתונים</p>
          )}
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="admin-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">תובנות אוטומטיות</h2>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${
                    ins.severity === 'critical' ? 'border-red-500/50 bg-red-900/10' :
                    ins.severity === 'warning' ? 'border-amber-500/50 bg-amber-900/10' :
                    'border-slate-700 bg-slate-900/30'
                  }`}
                >
                  <h3 className="font-medium text-slate-200">{ins.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{ins.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">אין תובנות להצגה</p>
          )}
        </div>
      )}
    </div>
  );
}
