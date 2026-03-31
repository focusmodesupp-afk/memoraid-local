import React, { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type SmartSectionProps = {
  title: string;
  isEmpty?: boolean;
  emptyAction?: { label: string; onClick: () => void };
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  variant?: 'compact' | 'card';
  children: ReactNode;
  className?: string;
};

export function SmartSection({
  title,
  isEmpty = false,
  emptyAction,
  collapsible = false,
  defaultCollapsed = false,
  variant = 'card',
  children,
  className = '',
}: SmartSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const sectionClass = variant === 'compact' ? 'section-compact' : 'section-card';

  if (isEmpty && !emptyAction) {
    return null;
  }

  if (isEmpty && emptyAction) {
    return (
      <section className={`${sectionClass} ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="section-title">{title}</h3>
          <button
            type="button"
            onClick={emptyAction.onClick}
            className="text-xs font-medium text-[hsl(var(--primary))] hover:underline"
          >
            {emptyAction.label}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`${sectionClass} ${className}`}>
      <div
        className={collapsible ? 'flex items-center justify-between gap-2 cursor-pointer' : ''}
        onClick={collapsible ? () => setCollapsed((c) => !c) : undefined}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCollapsed((c) => !c);
                }
              }
            : undefined
        }
      >
        <h3 className="section-title">{title}</h3>
        {collapsible && (collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
      </div>
      {(!collapsible || !collapsed) && <div className="mt-2">{children}</div>}
    </section>
  );
}
