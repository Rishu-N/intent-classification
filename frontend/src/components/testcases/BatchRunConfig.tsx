import React from 'react';
import { useBatchStore } from '../../store/batchStore';
import { useModelStore } from '../../store/modelStore';
import type { ClassifyMode, EnsembleMethod } from '../../types';

export const BatchRunConfig: React.FC = () => {
  const { config, running, error, setConfig, run } = useBatchStore();
  const { models } = useModelStore();

  const smallModels = models.filter((m) => m.size === 'small' && m.enabled);
  const largeModels = models.filter((m) => m.size === 'large' && m.enabled);
  const openaiModels = models.filter((m) => m.provider === 'openai' && m.enabled);

  const toggleSmall = (id: string) => {
    const ids = config.smallLLMIds.includes(id)
      ? config.smallLLMIds.filter((x) => x !== id)
      : [...config.smallLLMIds, id];
    setConfig({ smallLLMIds: ids });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-800">Run Batch</h3>

      {/* Mode */}
      <div className="flex gap-3 flex-wrap">
        {(['hierarchical', 'flat', 'hybrid'] as ClassifyMode[]).map((m) => (
          <label key={m} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm ${
            config.mode === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-slate-200 text-slate-600'
          }`}>
            <input type="radio" name="batch-mode" value={m} checked={config.mode === m}
              onChange={() => setConfig({ mode: m })} className="text-indigo-600" />
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </label>
        ))}
      </div>

      {config.mode === 'hierarchical' && (
        <>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Small LLMs</div>
            <div className="flex flex-wrap gap-2">
              {smallModels.length === 0
                ? <span className="text-sm text-slate-400 italic">No small models — add in Model Config</span>
                : smallModels.map((m) => (
                    <button key={m.id} type="button" onClick={() => toggleSmall(m.id)}
                      className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                        config.smallLLMIds.includes(m.id)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                      }`}>
                      {m.display_name}
                    </button>
                  ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ensemble Method</label>
              <select value={config.ensembleMethod}
                onChange={(e) => setConfig({ ensembleMethod: e.target.value as EnsembleMethod })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="weighted">Weighted</option>
                <option value="majority">Majority</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confidence Threshold: {config.confidenceThreshold}
              </label>
              <input type="range" min="0.1" max="0.9" step="0.05"
                value={config.confidenceThreshold}
                onChange={(e) => setConfig({ confidenceThreshold: parseFloat(e.target.value) })}
                className="w-full mt-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Backup Model (optional)</label>
            <select value={config.largeLLMId || ''}
              onChange={(e) => setConfig({ largeLLMId: e.target.value || null })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">None</option>
              {largeModels.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </div>
        </>
      )}

      {config.mode === 'flat' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Large LLM</label>
          <select value={config.largeLLMId || ''}
            onChange={(e) => setConfig({ largeLLMId: e.target.value || null })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select a model...</option>
            {largeModels.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </div>
      )}

      {config.mode === 'hybrid' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">OpenAI Model (embeddings + classification)</label>
          <select value={config.largeLLMId || ''}
            onChange={(e) => setConfig({ largeLLMId: e.target.value || null })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select a model...</option>
            {openaiModels.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Top 3 intents per word via embeddings, then LLM classifies.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input type="checkbox" id="batch-cache" checked={config.useCache}
          onChange={(e) => setConfig({ useCache: e.target.checked })}
          className="rounded border-slate-300 text-indigo-600" />
        <label htmlFor="batch-cache" className="text-sm text-slate-700">Use cache</label>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</div>}

      <button onClick={() => run()} disabled={running}
        className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
        {running ? 'Running...' : 'Run All Test Cases'}
      </button>
    </div>
  );
};
