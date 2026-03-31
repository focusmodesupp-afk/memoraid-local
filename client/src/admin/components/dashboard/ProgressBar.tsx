import React from 'react';

type ProgressBarProps = {
  /** 0–100 */
  value: number;
  /** Tailwind for fill, e.g. "from-blue-600 to-blue-400" */
  color?: string;
  height?: 'sm' | 'md' | 'lg';
  showTrack?: boolean;
  className?: string;
};

const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3' };

export function ProgressBar({
  value,
  color = 'bg-gradient-to-r from-blue-600 to-blue-400',
  height = 'md',
  showTrack = true,
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`w-full rounded-full overflow-hidden ${showTrack ? 'bg-slate-700' : ''} ${heights[height]} ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full ${color} transition-all duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
