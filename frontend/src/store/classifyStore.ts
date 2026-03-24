import { create } from 'zustand';
import type { ClassifyMode, ClassifyResult, EnsembleMethod, IntentTree } from '../types';
import { classify, getIntentTree } from '../api/classifyApi';

interface ClassifyStore {
  query: string;
  mode: ClassifyMode;
  selectedSmallLLMs: string[];
  selectedLargeLLM: string | null;
  ensembleMethod: EnsembleMethod;
  confidenceThreshold: number;
  useCache: boolean;
  loading: boolean;
  result: ClassifyResult | null;
  error: string | null;
  intentTree: IntentTree | null;
  setQuery: (q: string) => void;
  setMode: (m: ClassifyMode) => void;
  setSmallLLMs: (ids: string[]) => void;
  setLargeLLM: (id: string | null) => void;
  setEnsembleMethod: (m: EnsembleMethod) => void;
  setConfidenceThreshold: (t: number) => void;
  setUseCache: (v: boolean) => void;
  runClassify: () => Promise<void>;
  clearResult: () => void;
  fetchIntentTree: () => Promise<void>;
}

export const useClassifyStore = create<ClassifyStore>((set, get) => ({
  query: '',
  mode: 'hierarchical',
  selectedSmallLLMs: [],
  selectedLargeLLM: null,
  ensembleMethod: 'weighted',
  confidenceThreshold: 0.5,
  useCache: true,
  loading: false,
  result: null,
  error: null,
  intentTree: null,

  setQuery: (q) => set({ query: q }),
  setMode: (m) => set({ mode: m }),
  setSmallLLMs: (ids) => set({ selectedSmallLLMs: ids }),
  setLargeLLM: (id) => set({ selectedLargeLLM: id }),
  setEnsembleMethod: (m) => set({ ensembleMethod: m }),
  setConfidenceThreshold: (t) => set({ confidenceThreshold: t }),
  setUseCache: (v) => set({ useCache: v }),
  clearResult: () => set({ result: null, error: null }),

  runClassify: async () => {
    const { query, mode, selectedSmallLLMs, selectedLargeLLM, ensembleMethod, confidenceThreshold, useCache } = get();
    if (!query.trim()) return;
    set({ loading: true, error: null, result: null });
    try {
      const result = await classify({
        query,
        mode,
        small_llm_ids: selectedSmallLLMs,
        large_llm_id: selectedLargeLLM,
        use_cache: useCache,
        ensemble_method: ensembleMethod,
        confidence_threshold: confidenceThreshold,
      });
      set({ result });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || err?.message || 'Classification failed' });
    } finally {
      set({ loading: false });
    }
  },

  fetchIntentTree: async () => {
    try {
      const tree = await getIntentTree();
      set({ intentTree: tree });
    } catch {
      // Ignore tree fetch errors
    }
  },
}));
