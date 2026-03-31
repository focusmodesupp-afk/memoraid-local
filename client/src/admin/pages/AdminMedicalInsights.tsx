import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  Activity, FlaskConical, ArrowRightLeft, ShieldAlert,
  Pill, Users, AlertTriangle, TrendingUp,
} from 'lucide-react';

type MedicalSummary = {
  totalPatients: number;
  totalVitalReadings: number;
  abnormalVitalReadings: number;
  totalLabResults: number;
  abnormalLabResults: number;
  pendingReferrals: number;
  criticalUnreadInsights: number;
  activeMedications: number;
};

type DiagnosisCount = { condition: string; count: number };

type CriticalInsight = {
  id: string;
  patientId: string;
  familyId: string;
  title: string;
  content: string;
  severity: string;
  insightType: string;
  createdAt: string;
};

type OverdueReferral = {
  id: string;
  patientId: string;
  familyId: string;
  specialty: string;
  urgency: string;
  createdAt: string;
};

type InsightData = {
  summary: MedicalSummary;
  topDiagnoses: DiagnosisCount[];
  recentCriticalInsights: CriticalInsight[];
  overdueReferrals: OverdueReferral[];
};

export default function AdminMedicalInsights() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<InsightData>('/admin/medical-insights-summary')
      .then(setData)
      .catch((err) => setError(err?.message ?? 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading medical insights...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm">{error ?? 'No data available'}</p>
      </div>
    );
  }

  const { summary, topDiagnoses, recentCriticalInsights, overdueReferrals } = data;

  const kpis = [
    { icon: Users, label: 'Total Patients', value: summary.totalPatients, badge: '' },
    { icon: Activity, label: 'Abnormal Vitals', value: summary.abnormalVitalReadings, total: summary.totalVitalReadings, badge: summary.abnormalVitalReadings > 0 ? 'destructive' : 'success' },
    { icon: FlaskConical, label: 'Abnormal Labs', value: summary.abnormalLabResults, total: summary.totalLabResults, badge: summary.abnormalLabResults > 0 ? 'destructive' : 'success' },
    { icon: ArrowRightLeft, label: 'Pending Referrals', value: summary.pendingReferrals, badge: summary.pendingReferrals > 0 ? 'warning' : 'success' },
    { icon: ShieldAlert, label: 'Critical Insights (Unread)', value: summary.criticalUnreadInsights, badge: summary.criticalUnreadInsights > 0 ? 'destructive' : 'success' },
    { icon: Pill, label: 'Active Medications', value: summary.activeMedications, badge: '' },
  ];

  const URGENCY_LABEL: Record<string, string> = {
    urgent: 'Urgent',
    soon: 'Soon',
    routine: 'Routine',
  };

  const INSIGHT_TYPE_LABEL: Record<string, string> = {
    diagnosis_update: 'Diagnosis',
    medication_warning: 'Medication',
    lab_alert: 'Lab Alert',
    vital_alert: 'Vital Alert',
    care_recommendation: 'Care',
    trend_detection: 'Trend',
    referral_required: 'Referral',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Medical Intelligence Hub</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Population health metrics, critical alerts, and clinical data overview across all families.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`rounded-xl border p-4 shadow-sm ${
                kpi.badge === 'destructive' ? 'border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5' :
                kpi.badge === 'warning' ? 'border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5' :
                'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${kpi.badge === 'destructive' ? 'text-[hsl(var(--destructive))]' : kpi.badge === 'warning' ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
                <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.badge === 'destructive' ? 'text-[hsl(var(--destructive))]' : kpi.badge === 'warning' ? 'text-[hsl(var(--warning))]' : ''}`}>
                {kpi.value}
              </p>
              {'total' in kpi && kpi.total != null && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">of {kpi.total} total</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Critical Insights */}
        <div className="rounded-xl border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--card))] shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b border-[hsl(var(--border))]">
            <ShieldAlert className="w-4 h-4 text-[hsl(var(--destructive))]" />
            <h2 className="text-sm font-semibold">Critical Insights (Last 7 days)</h2>
            {summary.criticalUnreadInsights > 0 && (
              <span className="ms-auto rounded-full bg-[hsl(var(--destructive))] text-white text-xs px-2 py-0.5 font-medium">
                {summary.criticalUnreadInsights} unread
              </span>
            )}
          </div>
          {recentCriticalInsights.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No critical insights in the last 7 days. Great!</p>
            </div>
          ) : (
            <ul className="divide-y divide-[hsl(var(--border))]">
              {recentCriticalInsights.map((insight) => (
                <li key={insight.id} className="p-3 hover:bg-[hsl(var(--muted))]/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--destructive))] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{insight.title}</span>
                        <span className="badge badge-secondary text-xs">{INSIGHT_TYPE_LABEL[insight.insightType] ?? insight.insightType}</span>
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">{insight.content}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {new Date(insight.createdAt).toLocaleString('en', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overdue Referrals */}
        <div className="rounded-xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--card))] shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b border-[hsl(var(--border))]">
            <ArrowRightLeft className="w-4 h-4 text-[hsl(var(--warning))]" />
            <h2 className="text-sm font-semibold">Overdue Referrals (&gt;14 days)</h2>
            {overdueReferrals.length > 0 && (
              <span className="ms-auto rounded-full bg-[hsl(var(--warning))] text-white text-xs px-2 py-0.5 font-medium">
                {overdueReferrals.length}
              </span>
            )}
          </div>
          {overdueReferrals.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No overdue referrals. All caught up!</p>
            </div>
          ) : (
            <ul className="divide-y divide-[hsl(var(--border))]">
              {overdueReferrals.map((ref) => {
                const daysPending = Math.floor((Date.now() - new Date(ref.createdAt).getTime()) / (24 * 3600 * 1000));
                return (
                  <li key={ref.id} className="p-3 hover:bg-[hsl(var(--muted))]/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{ref.specialty}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          Pending {daysPending} days
                        </p>
                      </div>
                      <span className={`badge ${ref.urgency === 'urgent' ? 'badge-destructive' : ref.urgency === 'soon' ? 'badge-warning' : 'badge-secondary'}`}>
                        {URGENCY_LABEL[ref.urgency] ?? ref.urgency}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Top Diagnoses */}
      {topDiagnoses.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b border-[hsl(var(--border))]">
            <TrendingUp className="w-4 h-4 text-[hsl(var(--primary))]" />
            <h2 className="text-sm font-semibold">Most Common Active Diagnoses</h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {topDiagnoses.map((d, idx) => {
                const maxCount = topDiagnoses[0]?.count ?? 1;
                const pct = Math.round((d.count / maxCount) * 100);
                return (
                  <div key={d.condition}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm">{d.condition}</span>
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{d.count} patients</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[hsl(var(--muted))]/50">
                      <div
                        className="h-full rounded-full bg-[hsl(var(--primary))]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
