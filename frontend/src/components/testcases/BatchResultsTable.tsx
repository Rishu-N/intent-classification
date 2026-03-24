import React from 'react';
import type { BatchRunResult } from '../../types';
import { ConfidenceBadge } from '../shared/ConfidenceBadge';
import { getExportUrl } from '../../api/batchApi';

interface Props {
  result: BatchRunResult;
}

export const BatchResultsTable: React.FC<Props> = ({ result }) => {
  const handleExport = (format: 'csv' | 'json') => {
    const url = getExportUrl(result.run_id, format);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_${result.run_id.slice(0, 8)}.${format}`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">
            Batch Results — {result.model_label} ({result.mode})
          </h3>
          <div className="flex gap-2">
            <button onClick={() => handleExport('csv')}
              className="text-sm px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-700">
              Export CSV
            </button>
            <button onClick={() => handleExport('json')}
              className="text-sm px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-700">
              Export JSON
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Accuracy', value: `${(result.accuracy * 100).toFixed(1)}%`, highlight: true },
            { label: 'Correct / Total', value: `${result.correct} / ${result.total}` },
            { label: 'Avg Latency', value: `${result.avg_latency_ms.toFixed(0)} ms` },
            { label: 'Total Cost', value: result.total_cost_usd > 0 ? `$${result.total_cost_usd.toFixed(4)}` : '—' },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${highlight ? 'text-indigo-600' : 'text-slate-800'}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-test results */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Per-Test Results</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Input</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Expected</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Predicted</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-20">Result</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-20">Conf.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.results.map((r, i) => (
                <tr key={i} className={r.correct ? 'hover:bg-green-50' : 'hover:bg-red-50 bg-red-50/30'}>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="truncate text-slate-800">{r.input_prompt}</div>
                    {r.fallback_triggered && (
                      <span className="text-xs text-orange-600">fallback used</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.expected_intent}</td>
                  <td className="px-4 py-3">
                    <span className={r.correct ? 'text-slate-800' : 'text-red-700 font-medium'}>
                      {r.predicted_intent}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      r.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {r.correct ? 'Correct' : 'Wrong'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><ConfidenceBadge value={r.confidence} size="sm" /></td>
                  <td className="px-4 py-3 text-slate-500">{r.latency_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
