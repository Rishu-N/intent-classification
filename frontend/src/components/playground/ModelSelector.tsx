import React from 'react';
import type { ModelConfig, ClassifyMode, EnsembleMethod } from '../../types';
import { useClassifyStore } from '../../store/classifyStore';

interface Props {
  models: ModelConfig[];
}

function ModelPill({
  model,
  selected,
  onClick,
}: {
  model: ModelConfig;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
        selected
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
      }`}
    >
      <span>{model.display_name}</span>
      <span
        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          selected ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {model.provider === 'openai' ? 'OAI' : 'ANT'} · {model.size}
      </span>
    </button>
  );
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

  const enabledModels = models.filter((m) => m.enabled);
  const openaiModels = models.filter((m) => m.provider === 'openai' && m.enabled);

  const toggleSmall = (id: string) => {
    setSmallLLMs(
      selectedSmallLLMs.includes(id)
        ? selectedSmallLLMs.filter((x) => x !== id)
        : [...selectedSmallLLMs, id],
    );
  };

  const toggleBackup = (id: string) => {
    setLargeLLM(selectedLargeLLM === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {mode === 'hierarchical' && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Models for Ensemble
              <span className="ml-1 text-xs font-normal text-slate-400">(select one or more)</span>
            </label>
            {enabledModels.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No models configured. Add models in the Model Config tab.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {enabledModels.map((m) => (
                  <ModelPill
                    key={m.id}
                    model={m}
                    selected={selectedSmallLLMs.includes(m.id)}
                    onClick={() => toggleSmall(m.id)}
                  />
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fallback Model
              <span className="ml-1 text-xs font-normal text-slate-400">(optional, used if confidence is low)</span>
            </label>
            {enabledModels.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No models configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {enabledModels.map((m) => (
                  <ModelPill
                    key={m.id}
                    model={m}
                    selected={selectedLargeLLM === m.id}
                    onClick={() => toggleBackup(m.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {mode === 'flat' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Model
            <span className="ml-1 text-xs font-normal text-slate-400">(select one)</span>
          </label>
          {enabledModels.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No models configured. Add models in the Model Config tab.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enabledModels.map((m) => (
                <ModelPill
                  key={m.id}
                  model={m}
                  selected={selectedLargeLLM === m.id}
                  onClick={() => setLargeLLM(selectedLargeLLM === m.id ? null : m.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'hybrid' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              OpenAI Model (for embeddings + classification)
            </label>
            {openaiModels.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                No OpenAI models configured. Hybrid mode requires an OpenAI model for embedding API access.
              </p>
            ) : (
              <select
                value={selectedLargeLLM || ''}
                onChange={(e) => setLargeLLM(e.target.value || null)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a model...</option>
                {openaiModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Splits query into words, finds top 3 similar intents per word via embeddings, then classifies with the selected LLM.
          </p>
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
