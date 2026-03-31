import React from 'react';

type DataRowProps = {
  label: string;
  value: React.ReactNode;
  empty?: boolean;
  className?: string;
};

export function DataRow({ label, value, empty, className = '' }: DataRowProps) {
  const displayValue = empty || value == null || value === '' ? '—' : value;
  return (
    <div className={`data-row ${className}`}>
      <span className="data-row-label">{label}</span>
      <span className="data-row-value">{displayValue}</span>
    </div>
  );
}
