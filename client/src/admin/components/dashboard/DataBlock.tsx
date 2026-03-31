import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { MetricRow } from './MetricRow';
import { ProgressBar } from './ProgressBar';

type MetricRowConfig = {
  label: string;
  sublabel?: string;
  value: React.ReactNode;
  valueColor?: string;
  progressPercent?: number;
  progressColor?: string;
  indicatorColor?: string;
};

type DataBlockProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  headerValue?: React.ReactNode;
  headerValueColor?: string;
  /** When header is a percentage – show visual progress bar (0–100) */
  headerProgressPercent?: number;
  metrics: MetricRowConfig[];
  className?: string;
  /** Constrain width - use for compact blocks like Velocity, Priority Distribution */
  compact?: boolean;
};

export function DataBlock({
  title,
  subtitle,
  icon: Icon,
  headerValue,
  headerValueColor = 'text-slate-100',
  headerProgressPercent,
  metrics,
  className = '',
  compact = false,
}: DataBlockProps) {
  return (
    <div
      className={`rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden ${
        compact ? 'w-full lg:max-w-md' : ''
      } ${className}`}
    >
      <div className="px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-slate-400 shrink-0" />}
            <div>
              <h3 className="text-lg font-bold text-slate-100">{title}</h3>
              {subtitle && (
                <p className="text-xs admin-muted mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {headerValue !== undefined && (
            <span className={`text-xl font-bold shrink-0 ${headerValueColor}`}>
              {headerValue}
            </span>
          )}
        </div>
        {headerProgressPercent !== undefined && (
          <div className="mt-2">
            <ProgressBar
              value={headerProgressPercent}
              height="sm"
              color="bg-gradient-to-r from-purple-600 to-purple-400"
            />
          </div>
        )}
      </div>
      <div className="divide-y divide-slate-700/50">
        {metrics.map((m, i) => (
          <MetricRow
            key={i}
            label={m.label}
            sublabel={m.sublabel}
            value={m.value}
            valueColor={m.valueColor}
            showDivider={false}
            progressPercent={m.progressPercent}
            progressColor={m.progressColor}
            indicatorColor={m.indicatorColor}
          />
        ))}
      </div>
    </div>
  );
}
