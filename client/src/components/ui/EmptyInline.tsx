import React, { ReactNode } from 'react';

type EmptyInlineProps = {
  text?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyInline({ text, action, className = '' }: EmptyInlineProps) {
  return (
    <div className={`empty-inline flex items-center gap-2 ${className}`}>
      <span>{text ?? '—'}</span>
      {action && <span>{action}</span>}
    </div>
  );
}
