import React, { useEffect } from 'react';
import { useClassifyStore } from '../../store/classifyStore';
import { useModelStore } from '../../store/modelStore';
import { ModelSelector } from './ModelSelector';
import { ResultCard } from './ResultCard';
import { StepBreakdown } from './StepBreakdown';
import { TraversalTree } from './TraversalTree';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { ClassifyMode } from '../../types';

const MODE_OPTIONS: { value: ClassifyMode; label: string; desc: string }[] = [
  { value: 'hierarchical', label: 'Hierarchical', desc: 'Multiple small LLMs, level-by-level with ensemble' },
  { value: 'flat', label: 'Flat', desc: 'Single large LLM, all intents at once' },
  { value: 'hybrid', label: 'Hybrid', desc: 'Embedding narrows candidates per word, then small LLM classifies' },
];

export const PlaygroundPage: React.FC = () => {
  const {
    query, mode, loading, result, error,
    intentTree,
    setQuery, setMode, runClassify, clearResult, fetchIntentTree,
  } = useClassifyStore();
  const { models, fetchModels } = useModelStore();

  useEffect(() => {
    fetchModels();
    fetchIntentTree();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearResult();
    runClassify();
  };

  const hierarchicalResult = result?.mode === 'hierarchical' ? result : null;

  return (
    <div className="py-6 px-4 space-y-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-slate-800">Playground</h2>
        <p className="text-sm text-slate-500 mt-1">
          Test a query against both classification approaches
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Config */}
        <div className="lg:col-span-1 space-y-4">
          {/* Mode Toggle */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-700 mb-3">Classification Mode</div>
            <div className="space-y-2">
              {MODE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    mode === opt.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={opt.value}
                    checked={mode === opt.value}
                    onChange={() => setMode(opt.value)}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{opt.label}</div>
                    <div className="text-xs text-slate-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-700 mb-3">Model Selection</div>
            <ModelSelector models={models} />
          </div>
        </div>

        {/* Right Panel: Query + Results */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">Query</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Where is my order? / Debug my Python script / Find flights to Paris..."
              rows={4}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Classifying...' : 'Classify'}
            </button>
          </form>

          {loading && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 flex justify-center">
              <LoadingSpinner label="Running classification..." />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && !loading && (
            <>
              <ResultCard result={result} />
              {result.mode === 'hierarchical' && result.steps?.length > 0 && (
                <StepBreakdown steps={result.steps} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Full-width tree visualization */}
      {hierarchicalResult && !loading && intentTree && (
        <div className="px-0">
          <TraversalTree result={hierarchicalResult} intentTree={intentTree} />
        </div>
      )}
    </div>
  );
};
