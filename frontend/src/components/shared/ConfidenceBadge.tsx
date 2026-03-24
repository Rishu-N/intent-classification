import React from 'react';

interface Props {
  value: number;
  size?: 'sm' | 'md';
}

export const ConfidenceBadge: React.FC<Props> = ({ value, size = 'md' }) => {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.75
      ? 'bg-green-100 text-green-800'
      : value >= 0.5
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';

  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span className={`inline-block rounded font-semibold ${color} ${sizeClass}`}>
      {pct}%
    </span>
  );
};
