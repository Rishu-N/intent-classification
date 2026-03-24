import React from 'react';
import type { ModelConfig, ClassifyMode, EnsembleMethod } from '../../types';
import { useClassifyStore } from '../../store/classifyStore';

interface Props {
  models: ModelConfig[];
}

export const ModelSelector: React.FC<Props> = ({ models }) => {
  const {
    mode,
    selectedSmallLLMs,
    selectedLargeLLM,
    ensembleMethod,
    confidenceThreshold,
    useCache,
    setSmallLLMs,
    setLargeLLM,
    setEnsembleMethod,
    setConfidenceThreshold,
    setUseCache,
  } = useClassifyStore();

  const smallModels = models.filter((m) => m.size === 'small' && m.enabled);
  const largeModels = models.filter((m) => m.size === 'large' && m.enabled);

  const toggleSmall = (id: string) => {
    setSmallLLMs(
      selectedSmallLLMs.includes(id)
        ? selectedSmallLLMs.filter((x) => x !== id)
        : [...selectedSmallLLMs, id]
    );
  };

  return (
    <div className="space-y-4">
      {mode === 'hierarchical' && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Small LLMs for Ensemble (select multiple)
            </label>
            {smallModels.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                No small LLMs configured. Add models in the Model Config tab.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {smallModels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleSmall(m.id)}
                    className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                      selectedSmallLLMs.includes(m.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {m.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ensemble Method</label>
              <select
                value={ensembleMethod}
                onChange={(e) => setEnsembleMethod(e.target.value as EnsembleMethod)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="weighted">Weighted (by model cost)</option>
                <option value="majority">Majority Vote</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confidence Threshold: {confidenceThreshold}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Backup Model (Large LLM for fallback, optional)
            </label>
            <select
              value={selectedLargeLLM || ''}
              onChange={(e) => setLargeLLM(e.target.value || null)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None</option>
              {largeModels.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {mode === 'flat' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Large LLM</label>
          {largeModels.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              No large LLMs configured. Add models in the Model Config tab.
            </p>
          ) : (
            <select
              value={selectedLargeLLM || ''}
              onChange={(e) => setLargeLLM(e.target.value || null)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a model...</option>
              {largeModels.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="use-cache"
          checked={useCache}
          onChange={(e) => setUseCache(e.target.checked)}
          className="rounded border-slate-300 text-indigo-600"
        />
        <label htmlFor="use-cache" className="text-sm text-slate-700">Use cache (skip repeated queries)</label>
      </div>
    </div>
  );
};
