/**
 * AdminNexusMeetingMode.tsx
 * NEXUS V2 Meeting Mode UI — Multi-round research with per-employee agents.
 *
 * Renders the 3-round meeting flow:
 *   Round 1: Senior Leadership (C-Level)
 *   Round 2: Team Leads (Managers)
 *   Round 3: Individual Employees
 *
 * Each round shows participants, progress, results, and synthesis.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Loader2, CheckCircle, XCircle, AlertCircle, Play, RotateCcw, Zap,
  ChevronDown, ChevronUp, Users, Crown, Briefcase, Code2,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type RoundStatus = 'idle' | 'researching' | 'completed' | 'error';
type EmployeeStatus = 'pending' | 'running' | 'done' | 'error';

type EmployeeLiveResult = {
  name: string;
  role: string;
  department: string;
  level: string;
  status: EmployeeStatus;
  tokensUsed?: number;
  costUsd?: number;
  error?: string;
};

type RoundResult = {
  id: string;
  roundNumber: number;
  roundType: string;
  status: string;
  participantCount: number;
  completedCount: number;
  synthesisOutput?: string;
  results?: Array<{
    id: string;
    employeeName: string;
    employeeRole: string;
    employeeLevel: string;
    department: string;
    status: string;
    output?: string;
    outputJson?: Record<string, unknown>;
    modelUsed?: string;
    tokensUsed?: number;
    costUsd?: string;
    errorMessage?: string;
  }>;
};

type Props = {
  briefId: string;
  brief: {
    ideaPrompt: string;
    selectedDepartments: string[];
    selectedModels: string[];
    currentRound?: number;
    round1Synthesis?: string | null;
    round2Synthesis?: string | null;
    round3Synthesis?: string | null;
  };
  tt: (s: string) => string;
  onReload: () => void;
};

// ── Round metadata ───────────────────────────────────────────────────────────

const ROUND_META = [
  { num: 1, name: 'ישיבת הנהלה בכירה', icon: Crown, levels: 'C-Level', color: 'amber' },
  { num: 2, name: 'ישיבת מנהלי צוותים', icon: Briefcase, levels: 'Managers', color: 'blue' },
  { num: 3, name: 'מחקר עובדים פרטני', icon: Code2, levels: 'Senior+Member+Junior', color: 'green' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminNexusMeetingMode({ briefId, brief, tt, onReload }: Props) {
  // Round states
  const [activeRound, setActiveRound] = useState<number>(brief.currentRound ?? 0);
  const [roundStatus, setRoundStatus] = useState<Record<number, RoundStatus>>({
    1: brief.round1Synthesis ? 'completed' : 'idle',
    2: brief.round2Synthesis ? 'completed' : 'idle',
    3: brief.round3Synthesis ? 'completed' : 'idle',
  });
  const [employees, setEmployees] = useState<Record<number, EmployeeLiveResult[]>>({});
  const [roundResults, setRoundResults] = useState<Record<number, RoundResult | null>>({});
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [synthesizing, setSynthesizing] = useState<number | null>(null);
  const [retryEmployee, setRetryEmployee] = useState<{ roundId: string; name: string; roundNum: number } | null>(null);
  const [retryModel, setRetryModel] = useState('claude-sonnet-4-6');
  const [retryLoading, setRetryLoading] = useState(false);
  const [liveCost, setLiveCost] = useState<Record<number, number>>({});
  const [liveTokens, setLiveTokens] = useState<Record<number, number>>({});
  const esRef = useRef<EventSource | null>(null);

  // ── Launch a round ─────────────────────────────────────────────────────────

  const launchRound = useCallback(async (roundNumber: number) => {
    setRoundStatus(prev => ({ ...prev, [roundNumber]: 'researching' }));
    setEmployees(prev => ({ ...prev, [roundNumber]: [] }));
    setLiveCost(prev => ({ ...prev, [roundNumber]: 0 }));
    setLiveTokens(prev => ({ ...prev, [roundNumber]: 0 }));
    setActiveRound(roundNumber);
    setExpandedRound(roundNumber);

    // Close previous SSE if any
    if (esRef.current) esRef.current.close();

    try {
      // Start SSE for round
      const es = new EventSource(
        `/api/admin/nexus/briefs/${briefId}/run-round?roundNumber=${roundNumber}&models=${brief.selectedModels.join(',')}`,
        { withCredentials: true },
      );
      esRef.current = es;

      // We can't use GET with body for SSE, so use POST then connect to SSE
      // Actually, run-round is POST with SSE response. Let's use fetch instead.
      es.close();
      esRef.current = null;

      // Use fetch with streaming
      const resp = await apiFetch(`/api/admin/nexus/briefs/${briefId}/run-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNumber, models: brief.selectedModels }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      // Parse SSE from response body
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleRoundEvent(roundNumber, data);
            } catch { /* ignore parse errors */ }
          }
        }
      }

      // Round completed
      setRoundStatus(prev => ({ ...prev, [roundNumber]: 'completed' }));
      onReload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MeetingMode] Round ${roundNumber} error:`, msg);
      setRoundStatus(prev => ({ ...prev, [roundNumber]: 'error' }));
    }
  }, [briefId, brief.selectedModels, onReload]);

  // ── Handle SSE events ──────────────────────────────────────────────────────

  const handleRoundEvent = (roundNumber: number, event: Record<string, unknown>) => {
    const type = event.type as string ?? (event as any).event;

    switch (type) {
      case 'round_start':
        // Initialize employee list
        const participants = (event.participants ?? []) as Array<{ name: string; role: string; department: string; level: string }>;
        setEmployees(prev => ({
          ...prev,
          [roundNumber]: participants.map(p => ({ ...p, status: 'pending' as EmployeeStatus })),
        }));
        break;

      case 'employee_start':
        setEmployees(prev => {
          const list = [...(prev[roundNumber] ?? [])];
          const idx = list.findIndex(e => e.name === event.name);
          if (idx >= 0) list[idx] = { ...list[idx], status: 'running' };
          return { ...prev, [roundNumber]: list };
        });
        break;

      case 'employee_done':
        setEmployees(prev => {
          const list = [...(prev[roundNumber] ?? [])];
          const idx = list.findIndex(e => e.name === event.name);
          if (idx >= 0) {
            list[idx] = {
              ...list[idx],
              status: event.error ? 'error' : 'done',
              tokensUsed: event.tokensUsed as number,
              costUsd: event.costUsd as number,
              error: event.error as string | undefined,
            };
          }
          return { ...prev, [roundNumber]: list };
        });
        setLiveCost(prev => ({ ...prev, [roundNumber]: (prev[roundNumber] ?? 0) + (event.costUsd as number ?? 0) }));
        setLiveTokens(prev => ({ ...prev, [roundNumber]: (prev[roundNumber] ?? 0) + (event.tokensUsed as number ?? 0) }));
        break;

      case 'round_done':
        setRoundStatus(prev => ({ ...prev, [roundNumber]: 'completed' }));
        break;

      case 'error':
        setRoundStatus(prev => ({ ...prev, [roundNumber]: 'error' }));
        break;
    }
  };

  // ── Synthesize a round ─────────────────────────────────────────────────────

  const handleSynthesize = async (roundNumber: number) => {
    // First load round details to get roundId
    setSynthesizing(roundNumber);
    try {
      const roundsResp = await apiFetch(`/api/admin/nexus/briefs/${briefId}/rounds`);
      const { rounds } = await roundsResp.json();
      const round = rounds?.find((r: any) => r.roundNumber === roundNumber);
      if (!round) throw new Error('Round not found');

      const resp = await apiFetch(`/api/admin/nexus/briefs/${briefId}/rounds/${round.id}/synthesize`, {
        method: 'POST',
      });
      const data = await resp.json();
      if (data.ok) {
        onReload();
      } else {
        alert(data.error || 'Synthesis failed');
      }
    } catch (err) {
      alert('Synthesis error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSynthesizing(null);
    }
  };

  // ── Retry employee ─────────────────────────────────────────────────────────

  const handleRetryEmployee = async () => {
    if (!retryEmployee) return;
    setRetryLoading(true);
    try {
      const resp = await apiFetch(`/api/admin/nexus/briefs/${briefId}/rounds/${retryEmployee.roundId}/retry-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeName: retryEmployee.name, model: retryModel }),
      });
      const data = await resp.json();
      if (data.ok) {
        setRetryEmployee(null);
        onReload();
      } else {
        alert(data.error || 'Retry failed');
      }
    } catch (err) {
      alert('Retry error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRetryLoading(false);
    }
  };

  // ── Load round results ─────────────────────────────────────────────────────

  const loadRoundResults = async (roundNumber: number) => {
    try {
      const roundsResp = await apiFetch(`/api/admin/nexus/briefs/${briefId}/rounds`);
      const { rounds } = await roundsResp.json();
      const round = rounds?.find((r: any) => r.roundNumber === roundNumber);
      if (!round) return;

      const detailResp = await apiFetch(`/api/admin/nexus/briefs/${briefId}/rounds/${round.id}`);
      const detail = await detailResp.json();
      setRoundResults(prev => ({ ...prev, [roundNumber]: { ...detail.round, results: detail.results } }));
    } catch { /* non-fatal */ }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6 text-indigo-400" />
        <h2 className="text-xl font-bold text-slate-100">{tt('מצב ישיבות מחלקה')}</h2>
      </div>

      {ROUND_META.map((meta) => {
        const status = roundStatus[meta.num] ?? 'idle';
        const isExpanded = expandedRound === meta.num;
        const empList = employees[meta.num] ?? [];
        const canLaunch = meta.num === 1
          || (meta.num === 2 && brief.round1Synthesis)
          || (meta.num === 3 && brief.round2Synthesis);
        const hasSynthesis = meta.num === 1 ? !!brief.round1Synthesis
          : meta.num === 2 ? !!brief.round2Synthesis
          : !!brief.round3Synthesis;
        const Icon = meta.icon;
        const cost = liveCost[meta.num] ?? 0;
        const tokens = liveTokens[meta.num] ?? 0;

        return (
          <div key={meta.num} className="admin-card">
            {/* Header */}
            <button
              onClick={() => {
                setExpandedRound(isExpanded ? null : meta.num);
                if (!isExpanded && status === 'completed') loadRoundResults(meta.num);
              }}
              className="w-full flex items-center gap-3 text-right"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                status === 'completed' ? 'bg-green-500/20' :
                status === 'researching' ? 'bg-blue-500/20' :
                status === 'error' ? 'bg-red-500/20' :
                'bg-slate-700'
              }`}>
                {status === 'researching' ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> :
                 status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                 status === 'error' ? <XCircle className="w-5 h-5 text-red-400" /> :
                 <Icon className="w-5 h-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-100">Round {meta.num}: {meta.name}</p>
                <p className="text-xs text-slate-400">{meta.levels}</p>
              </div>
              {status === 'researching' && (
                <div className="text-left">
                  <p className="text-xs font-mono text-green-400">${cost.toFixed(4)}</p>
                  <p className="text-xs font-mono text-slate-500">{tokens.toLocaleString()} tok</p>
                </div>
              )}
              {hasSynthesis && <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">{tt('מאוחד')}</span>}
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                {/* Launch button */}
                {status === 'idle' && canLaunch && (
                  <button
                    onClick={() => launchRound(meta.num)}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors mb-4"
                  >
                    <Play className="w-4 h-4" />
                    {tt('הפעל מחקר')} — Round {meta.num}
                  </button>
                )}
                {status === 'idle' && !canLaunch && (
                  <p className="text-sm text-amber-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {tt('יש להשלים ולאחד את Round הקודם לפני שממשיכים')}
                  </p>
                )}

                {/* Employee grid */}
                {empList.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                    {empList.map((emp) => (
                      <div
                        key={emp.name}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          emp.status === 'running' ? 'border-blue-500/50 bg-blue-500/10' :
                          emp.status === 'done' ? 'border-green-500/40 bg-green-500/5' :
                          emp.status === 'error' ? 'border-red-500/40 bg-red-500/5' :
                          'border-slate-700 bg-slate-800/50'
                        }`}
                      >
                        <div className="shrink-0">
                          {emp.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                          {emp.status === 'done' && <CheckCircle className="w-4 h-4 text-green-400" />}
                          {emp.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                          {emp.status === 'pending' && <div className="w-4 h-4 rounded-full border border-slate-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{emp.role}</p>
                          <p className="text-[10px] text-slate-500">{emp.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completed results */}
                {status === 'completed' && roundResults[meta.num]?.results && (
                  <div className="space-y-2 mb-4">
                    {roundResults[meta.num]!.results!.map((r) => (
                      <div key={r.id} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-200">{r.employeeRole} ({r.department})</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-violet-400">{r.modelUsed?.replace('claude-', '').slice(0, 16)}</span>
                            {r.status === 'error' && (
                              <button
                                onClick={() => setRetryEmployee({ roundId: roundResults[meta.num]!.id, name: r.employeeName, roundNum: meta.num })}
                                className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                {tt('נסה שוב')}
                              </button>
                            )}
                          </div>
                        </div>
                        {r.errorMessage && <p className="text-xs text-red-400">{r.errorMessage}</p>}
                        {r.output && !r.errorMessage && (
                          <p className="text-xs text-slate-400 line-clamp-3">{r.output.slice(0, 200).replace(/[#{}\[\]]/g, '')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Synthesize button */}
                {status === 'completed' && !hasSynthesis && (
                  <button
                    onClick={() => handleSynthesize(meta.num)}
                    disabled={synthesizing === meta.num}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {synthesizing === meta.num ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {synthesizing === meta.num ? tt('מאחד מחקרים...') : tt('איחוד מחקרים')}
                  </button>
                )}

                {/* Synthesis result */}
                {hasSynthesis && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-xs font-semibold text-green-400 mb-1">{tt('סינתזה הושלמה')}</p>
                    <p className="text-xs text-slate-300 line-clamp-4">
                      {(meta.num === 1 ? brief.round1Synthesis : meta.num === 2 ? brief.round2Synthesis : brief.round3Synthesis)?.slice(0, 300)}...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Retry dialog */}
      {retryEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => !retryLoading && setRetryEmployee(null)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-100 mb-3 text-right">{tt('הרצה חוזרת לעובד')}</h3>
            <p className="text-sm text-slate-400 mb-4 text-right">{retryEmployee.name} — Round {retryEmployee.roundNum}</p>
            <select value={retryModel} onChange={e => setRetryModel(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 mb-4" dir="ltr">
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRetryEmployee(null)} disabled={retryLoading} className="px-4 py-2 text-sm text-slate-400">{tt('ביטול')}</button>
              <button onClick={handleRetryEmployee} disabled={retryLoading}
                className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center gap-2">
                {retryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {retryLoading ? tt('מריץ...') : tt('הרץ שוב')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
