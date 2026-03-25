import React, { useState } from 'react';
import type { ClassifyStep, Vote } from '../../types';
import { ConfidenceBadge } from '../shared/ConfidenceBadge';

interface Props {
  steps: ClassifyStep[];
}

function VoteRow({ vote, isWinner }: { vote: Vote; isWinner: boolean }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className="text-xs border border-slate-100 rounded-lg overflow-hidden">
      <div className="flex items-start gap-3 p-2">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="font-mono text-slate-400 truncate max-w-24">{vote.model_id.slice(0, 8)}…</span>
          <span className={`font-semibold ${isWinner ? 'text-green-700' : 'text-slate-500'}`}>
            → {vote.choice}
          </span>
          <ConfidenceBadge value={vote.confidence} size="sm" />
          {vote.cost_usd !== undefined && vote.cost_usd > 0 && (
            <span className="text-xs text-slate-400">${vote.cost_usd.toFixed(6)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 truncate max-w-48">{vote.reasoning}</span>
          {vote.raw_output && (
            <button
              onClick={() => setShowRaw(v => !v)}
              className="shrink-0 text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              {showRaw ? 'hide raw' : 'raw'}
            </button>
          )}
        </div>
      </div>
      {showRaw && vote.raw_output && (
        <pre className="bg-slate-950 text-green-400 text-xs font-mono p-3 overflow-x-auto border-t border-slate-200 whitespace-pre-wrap break-all">
          {vote.raw_output}
        </pre>
      )}
    </div>
  );
}

const LEVEL_COLORS = {
  domain: 'bg-purple-100 text-purple-800',
  category: 'bg-blue-100 text-blue-800',
  intent: 'bg-green-100 text-green-800',
};

export const StepBreakdown: React.FC<Props> = ({ steps }) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Step-by-Step Breakdown</h3>
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="border border-slate-100 rounded-lg overflow-hidden">
            {/* Step Header */}
            <button
              onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-500 w-5">{idx + 1}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${LEVEL_COLORS[step.level]}`}>
                  {step.level}
                </span>
                <span className="text-sm font-semibold text-slate-800">{step.chosen}</span>
              </div>
              <div className="flex items-center gap-3">
                <ConfidenceBadge value={step.confidence} size="sm" />
                <span className="text-xs text-slate-400">{step.latency_ms}ms</span>
                <span className="text-slate-400 text-xs">{expandedStep === idx ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Reasoning */}
            <div className="px-3 pb-2 text-xs text-slate-600 bg-slate-50 border-t border-slate-100">
              <span className="font-medium">Reasoning:</span> {step.reasoning}
            </div>

            {/* Expanded: Votes */}
            {expandedStep === idx && (
              <div className="p-3 border-t border-slate-100 bg-white">
                <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                  Model Votes ({step.ensemble_method} ensemble)
                </div>
                <div className="space-y-2">
                  {step.votes.map((vote, vi) => (
                    <VoteRow key={vi} vote={vote} isWinner={vote.choice === step.chosen} />
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Candidates: {step.candidates.join(', ')}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
