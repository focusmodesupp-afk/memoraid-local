import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 text-right hover:bg-slate-700/30 transition-colors"
      >
        <span className="text-lg font-bold text-slate-100">{title}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-slate-700/50 px-6 py-4">
          {children}
        </div>
      )}
    </div>
  );
}
