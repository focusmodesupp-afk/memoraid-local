import React from 'react';
import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  subtext?: string;
  variant?: 'default' | 'blue' | 'green' | 'red' | 'amber';
  className?: string;
};

const variantClasses = {
  default: 'border-slate-700 bg-slate-800/50',
  blue: 'border-blue-600/30 bg-blue-900/10',
  green: 'border-green-600/30 bg-green-900/10',
  red: 'border-red-600/30 bg-red-900/10',
  amber: 'border-amber-600/30 bg-amber-900/10',
};

const iconBgClasses = {
  default: 'bg-slate-700',
  blue: 'bg-indigo-500',
  green: 'bg-green-600',
  red: 'bg-red-600',
  amber: 'bg-amber-600',
};

const valueColorClasses = {
  default: 'text-slate-100',
  blue: 'text-blue-400',
  green: 'text-green-400',
  red: 'text-red-400',
  amber: 'text-amber-400',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  variant = 'default',
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-6 min-w-0 ${variantClasses[variant]} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className={`p-2 rounded-lg ${iconBgClasses[variant]}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`text-2xl font-bold ${valueColorClasses[variant]}`}>
          {value}
        </span>
      </div>
      <p className="text-sm admin-muted">{label}</p>
      {subtext && (
        <p className={`mt-2 text-xs ${valueColorClasses[variant]}`}>
          {subtext}
        </p>
      )}
    </div>
  );
}
