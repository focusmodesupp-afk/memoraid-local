import React, { ReactNode } from 'react';

type ListCompactProps = {
  children: ReactNode;
  className?: string;
};

export function ListCompact({ children, className = '' }: ListCompactProps) {
  return <div className={`list-compact ${className}`}>{children}</div>;
}
