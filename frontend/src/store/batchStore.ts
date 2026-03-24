import { create } from 'zustand';
import type { BatchRunResult, ClassifyMode, EnsembleMethod } from '../types';
import { runBatch } from '../api/batchApi';

interface BatchConfig {
  mode: ClassifyMode;
  smallLLMIds: string[];
  largeLLMId: string | null;
  ensembleMethod: EnsembleMethod;
  confidenceThreshold: number;
  useCache: boolean;
}

interface BatchStore {
  config: BatchConfig;
  running: boolean;
  latestResult: BatchRunResult | null;
  runHistory: BatchRunResult[];
  error: string | null;
  setConfig: (patch: Partial<BatchConfig>) => void;
  run: (testCaseIds?: string[] | 'all') => Promise<void>;
  clearResult: () => void;
}

export const useBatchStore = create<BatchStore>((set, get) => ({
  config: {
    mode: 'hierarchical',
    smallLLMIds: [],
    largeLLMId: null,
    ensembleMethod: 'weighted',
    confidenceThreshold: 0.5,
    useCache: true,
  },
  running: false,
  latestResult: null,
  runHistory: [],
  error: null,

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  clearResult: () => set({ latestResult: null, error: null }),

  run: async (testCaseIds = 'all') => {
    const { config } = get();
    set({ running: true, error: null });
    try {
      const result = await runBatch({
        mode: config.mode,
        small_llm_ids: config.smallLLMIds,
        large_llm_id: config.largeLLMId,
        test_case_ids: testCaseIds,
        ensemble_method: config.ensembleMethod,
        confidence_threshold: config.confidenceThreshold,
        use_cache: config.useCache,
      });
      set((s) => ({
        latestResult: result,
        runHistory: [result, ...s.runHistory].slice(0, 10),
      }));
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || err?.message || 'Batch run failed' });
    } finally {
      set({ running: false });
    }
  },
}));
