import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label,
} from 'recharts';
import type { BatchRunResult } from '../../types';

interface Props {
  runs: BatchRunResult[];
}

const COLORS = ['#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0284c7'];

export const CostAccuracyChart: React.FC<Props> = ({ runs }) => {
  if (runs.length === 0) return null;

  const data = runs.map((r, i) => ({
    x: r.total_cost_usd,
    y: r.accuracy * 100,
    label: `${r.model_label} (${r.mode})`,
    color: COLORS[i % COLORS.length],
    latency: r.avg_latency_ms,
    run_id: r.run_id.slice(0, 8),
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Cost vs Accuracy</h3>
      <p className="text-xs text-slate-400 mb-4">Each point is one batch run. Top-left = ideal (low cost, high accuracy).</p>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="x" type="number" name="Cost (USD)" tickFormatter={(v) => `$${v.toFixed(4)}`}>
            <Label value="Total Cost (USD)" offset={-10} position="insideBottom" className="text-xs fill-slate-500" />
          </XAxis>
          <YAxis dataKey="y" type="number" domain={[0, 100]} unit="%" name="Accuracy">
            <Label value="Accuracy" angle={-90} position="insideLeft" className="text-xs fill-slate-500" />
          </YAxis>
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-slate-200 rounded shadow p-3 text-xs space-y-1">
                  <div className="font-semibold text-slate-800">{d.label}</div>
                  <div>Accuracy: <span className="font-medium">{d.y.toFixed(1)}%</span></div>
                  <div>Cost: <span className="font-medium">${d.x.toFixed(6)}</span></div>
                  <div>Avg Latency: <span className="font-medium">{d.latency.toFixed(0)}ms</span></div>
                  <div className="text-slate-400">Run: {d.run_id}</div>
                </div>
              );
            }}
          />
          {data.map((d, i) => (
            <Scatter key={i} data={[d]} fill={d.color} name={d.label} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span style={{ background: d.color }} className="w-3 h-3 rounded-full inline-block" />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
};
