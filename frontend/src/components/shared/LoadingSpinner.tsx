import React from 'react';

interface Props {
  label?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ label = 'Loading...' }) => (
  <div className="flex items-center gap-2 text-slate-500">
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
    <span className="text-sm">{label}</span>
  </div>
);
