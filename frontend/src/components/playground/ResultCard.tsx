import React, { useState } from 'react';
import type { ClassifyResult } from '../../types';
import { ConfidenceBadge } from '../shared/ConfidenceBadge';

interface Props {
  result: ClassifyResult;
}

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
    <dd className="mt-0.5 text-sm font-semibold text-slate-800">{value}</dd>
  </div>
);

export const ResultCard: React.FC<Props> = ({ result }) => {
  const [showRaw, setShowRaw] = useState(false);
  const isHierarchical = result.mode === 'hierarchical';
  const latencyMs = isHierarchical ? result.total_latency_ms : result.latency_ms;
  const costUsd = isHierarchical ? result.total_cost_usd : result.cost_usd;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Final Intent</div>
          <div className="text-lg font-bold text-slate-900">
            {result.domain} › {result.category} › {result.final_intent}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ConfidenceBadge value={result.confidence} />
          {result.cache_hit && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">cached</span>
          )}
          {result.fallback_triggered && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">fallback used</span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <dl className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
        <Field label="Mode" value={result.mode} />
        <Field label="Latency" value={`${latencyMs.toLocaleString()} ms`} />
        <Field label="Est. Cost" value={costUsd > 0 ? `$${costUsd.toFixed(6)}` : '—'} />
        <Field label="Confidence" value={`${(result.confidence * 100).toFixed(1)}%`} />
        {isHierarchical && 'min_step_confidence' in result && (
          <Field label="Min Step Conf." value={`${(result.min_step_confidence * 100).toFixed(1)}%`} />
        )}
        {!isHierarchical && 'model_used' in result && (
          <Field label="Model" value={result.model_used} />
        )}
      </dl>

      {/* Reasoning */}
      <div className="border-t border-slate-100 pt-4">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Field of Thought
        </div>
        <div className="text-sm text-slate-700 bg-slate-50 rounded p-3 leading-relaxed">
          {result.mode === 'flat'
            ? result.reasoning
            : result.steps?.map((s, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <span className="font-medium text-indigo-600">{s.level.toUpperCase()}: {s.chosen}</span>
                  {' — '}{s.reasoning}
                </div>
              ))}
        </div>
      </div>

      {result.fallback_triggered && result.fallback_reason && (
        <div className="text-xs text-orange-700 bg-orange-50 rounded p-2">
          Fallback reason: {result.fallback_reason}
        </div>
      )}

      {/* Raw LLM Output — flat mode only */}
      {result.mode === 'flat' && result.raw_output && (
        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowRaw(v => !v)}
            className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>{showRaw ? '▼' : '▶'}</span>
            <span>Raw LLM Output</span>
          </button>
          {showRaw && (
            <pre className="mt-2 bg-slate-950 text-green-400 text-xs font-mono p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
              {result.raw_output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
