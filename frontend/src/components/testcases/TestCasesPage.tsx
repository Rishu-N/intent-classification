import React, { useEffect } from 'react';
import { useTestStore } from '../../store/testStore';
import { useBatchStore } from '../../store/batchStore';
import { useModelStore } from '../../store/modelStore';
import { useClassifyStore } from '../../store/classifyStore';
import { TestCaseTable } from './TestCaseTable';
import { BatchRunConfig } from './BatchRunConfig';
import { BatchResultsTable } from './BatchResultsTable';
import { ConfusionMatrix } from './ConfusionMatrix';
import { CostAccuracyChart } from './CostAccuracyChart';
import { LoadingSpinner } from '../shared/LoadingSpinner';

export const TestCasesPage: React.FC = () => {
  const { fetchTestCases, loading } = useTestStore();
  const { fetchModels } = useModelStore();
  const { fetchIntentTree, intentTree } = useClassifyStore();
  const { latestResult, running, runHistory } = useBatchStore();

  useEffect(() => {
    fetchTestCases();
    fetchModels();
    fetchIntentTree();
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Test Cases</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage test cases, run batch classification, and analyze results
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="lg:col-span-1">
          <BatchRunConfig />
        </div>

        {/* Right: Table */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <TestCaseTable intentTree={intentTree?.tree ?? null} />
          )}
        </div>
      </div>

      {/* Results */}
      {running && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 flex justify-center">
          <LoadingSpinner label="Running batch classification..." />
        </div>
      )}

      {latestResult && !running && (
        <div className="space-y-6">
          <BatchResultsTable result={latestResult} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ConfusionMatrix data={latestResult.confusion_matrix} />
            <CostAccuracyChart runs={runHistory} />
          </div>
        </div>
      )}
    </div>
  );
};
