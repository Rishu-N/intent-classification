import React from 'react';

interface Tab {
  id: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'playground', label: 'Playground' },
  { id: 'testcases', label: 'Test Cases' },
  { id: 'models', label: 'Model Config' },
];

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export const TabBar: React.FC<Props> = ({ active, onChange }) => (
  <nav className="bg-white border-b border-slate-200 px-6 flex items-center gap-1">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          active === tab.id
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-600 hover:text-slate-900'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);
