import React from 'react';

type MetricRowProps = {
  label: string;
  sublabel?: string;
  value: React.ReactNode;
  valueColor?: string;
  showDivider?: boolean;
  progressPercent?: number;
  progressColor?: string;
  /** Optional dot color for priority-style rows, e.g. "bg-red-500" */
  indicatorColor?: string;
};

export function MetricRow({
  label,
  sublabel,
  value,
  valueColor = 'text-slate-100',
  showDivider = true,
  progressPercent,
  progressColor = 'bg-indigo-500',
  indicatorColor,
}: MetricRowProps) {
  return (
    <div
      className={`py-3 px-4 ${showDivider ? 'border-b border-slate-700/50 last:border-b-0' : ''}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {indicatorColor && (
            <span className={`w-3 h-3 rounded-full shrink-0 ${indicatorColor}`} aria-hidden />
          )}
          <div>
            <p className="text-sm font-medium text-slate-300">{label}</p>
          {sublabel && (
            <p className="text-xs admin-muted mt-0.5">{sublabel}</p>
          )}
          </div>
        </div>
        <div className={`text-lg font-bold shrink-0 ${valueColor}`}>
          {value}
        </div>
      </div>
      {progressPercent !== undefined && (
        <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
