import React from 'react';
import type { ConfusionMatrix as ConfusionMatrixType } from '../../types';

interface Props {
  data: ConfusionMatrixType;
}

export const ConfusionMatrix: React.FC<Props> = ({ data }) => {
  const { labels, matrix } = data;
  if (!labels.length) return null;

  const maxVal = Math.max(...matrix.flat(), 1);

  const cellColor = (val: number, isCorrect: boolean): string => {
    if (val === 0) return '#f8fafc';
    const intensity = val / maxVal;
    if (isCorrect) {
      // Green for diagonal (correct)
      const g = Math.round(200 - intensity * 80);
      const r = Math.round(220 - intensity * 120);
      return `rgb(${r}, ${g}, 100)`;
    } else {
      // Red for off-diagonal (errors)
      const r = Math.round(255 - intensity * 40);
      const g = Math.round(240 - intensity * 140);
      return `rgb(${r}, ${g}, ${g})`;
    }
  };

  const cellText = (val: number): string => (val === 0 ? '' : String(val));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Confusion Matrix</h3>
      <p className="text-xs text-slate-400 mb-4">Rows = Expected, Columns = Predicted. Green = correct, red = misclassified.</p>
      <div className="overflow-auto">
        <table className="text-xs border-collapse" style={{ minWidth: labels.length * 36 + 140 }}>
          <thead>
            <tr>
              <th className="w-36 text-right pr-2 text-slate-500 font-normal sticky left-0 bg-white z-10">Expected ↓ / Predicted →</th>
              {labels.map((l) => (
                <th key={l} className="w-9 text-center font-medium text-slate-600 pb-1"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 80, verticalAlign: 'bottom' }}>
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => (
              <tr key={ri}>
                <td className="text-right pr-2 py-0.5 text-slate-600 font-medium sticky left-0 bg-white z-10 max-w-36 truncate">
                  {labels[ri]}
                </td>
                {row.map((val, ci) => (
                  <td key={ci}
                    style={{ backgroundColor: cellColor(val, ri === ci), width: 36, height: 28 }}
                    className="text-center border border-slate-100 font-semibold text-slate-800"
                    title={`Expected: ${labels[ri]}, Predicted: ${labels[ci]}, Count: ${val}`}>
                    {cellText(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
