import React from 'react';
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
  const isHierarchical = result.mode === 'hierarchical';
  const isHybrid = result.mode === 'hybrid';
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
        {isHybrid && 'embedding_latency_ms' in result && (
          <Field label="Embedding Latency" value={`${result.embedding_latency_ms} ms`} />
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

      {isHybrid && 'candidate_intents' in result && result.candidate_intents.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Embedding Candidates
            {result.query_words?.length > 0 && (
              <span className="ml-2 normal-case font-normal text-slate-400">
                (words: {result.query_words.join(', ')})
              </span>
            )}
          </div>
          <div className="space-y-1">
            {result.candidate_intents.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5">
                <span className="text-slate-700">
                  {c.domain} › {c.category} › <span className="font-medium">{c.intent}</span>
                </span>
                <span className={`text-xs font-mono ${
                  c.similarity_score >= 0.5 ? 'text-green-600' : c.similarity_score >= 0.3 ? 'text-yellow-600' : 'text-slate-400'
                }`}>
                  {(c.similarity_score * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.fallback_triggered && result.fallback_reason && (
        <div className="text-xs text-orange-700 bg-orange-50 rounded p-2">
          Fallback reason: {result.fallback_reason}
        </div>
      )}
    </div>
  );
};
