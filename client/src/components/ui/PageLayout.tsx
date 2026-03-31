import React, { ReactNode } from 'react';

type PageLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageLayout({ title, subtitle, actions, sidebar, children, className = '' }: PageLayoutProps) {
  return (
    <div className={`max-w-5xl mx-auto space-y-4 ${className}`}>
      <div className="page-header">
        <div>
          <h2 className="page-title">{title}</h2>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      <div className={sidebar ? 'grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]' : ''}>
        <div className="min-w-0 space-y-4">{children}</div>
        {sidebar && <aside className="min-w-0 space-y-4">{sidebar}</aside>}
      </div>
    </div>
  );
}
