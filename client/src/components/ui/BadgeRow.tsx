import React, { ReactNode } from 'react';

export type BadgeItem = {
  label: string;
  value?: string | number;
  variant?: 'muted' | 'primary' | 'success' | 'destructive';
  icon?: ReactNode;
};

type BadgeRowProps = {
  items: BadgeItem[];
  className?: string;
};

const variantClasses = {
  muted: 'badge-muted',
  primary: 'badge-primary',
  success: 'badge-success',
  destructive: 'badge-destructive',
};

export function BadgeRow({ items, className = '' }: BadgeRowProps) {
  return (
    <div className={`badge-row ${className}`}>
      {items.map((item, i) => (
        <span
          key={i}
          className={`badge ${variantClasses[item.variant ?? 'muted']}`}
          title={item.value != null ? `${item.label}: ${item.value}` : item.label}
        >
          {item.icon}
          {item.value != null ? `${item.label}: ${item.value}` : item.label}
        </span>
      ))}
    </div>
  );
}
