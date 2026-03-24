import { useState } from 'react';
import { TabBar } from './components/layout/TabBar';
import { PlaygroundPage } from './components/playground/PlaygroundPage';
import { TestCasesPage } from './components/testcases/TestCasesPage';
import { ModelsPage } from './components/models/ModelsPage';

type TabId = 'playground' | 'testcases' | 'models';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('playground');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.1 2.7H3.9c-1.4 0-2.1-1.7-1.1-2.7L4.2 15.3" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Intent Classification POC</h1>
            <p className="text-xs text-slate-500">Hierarchical (Small LLMs) vs Flat (Large LLM)</p>
          </div>
        </div>
        <TabBar active={activeTab} onChange={(id) => setActiveTab(id as TabId)} />
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'playground' && <PlaygroundPage />}
        {activeTab === 'testcases' && <TestCasesPage />}
        {activeTab === 'models' && <ModelsPage />}
      </main>
    </div>
  );
}

export default App;
