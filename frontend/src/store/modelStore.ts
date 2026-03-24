import { create } from 'zustand';
import type { ModelConfig, ModelConfigCreate } from '../types';
import * as api from '../api/modelsApi';

interface ModelStore {
  models: ModelConfig[];
  loading: boolean;
  editingModel: ModelConfig | null;
  fetchModels: () => Promise<void>;
  createModel: (data: ModelConfigCreate) => Promise<void>;
  updateModel: (id: string, data: ModelConfigCreate) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  setEditing: (model: ModelConfig | null) => void;
}

export const useModelStore = create<ModelStore>((set, get) => ({
  models: [],
  loading: false,
  editingModel: null,

  fetchModels: async () => {
    set({ loading: true });
    try {
      const models = await api.listModels();
      set({ models });
    } finally {
      set({ loading: false });
    }
  },

  createModel: async (data) => {
    const model = await api.createModel(data);
    set((s) => ({ models: [...s.models, model] }));
  },

  updateModel: async (id, data) => {
    const updated = await api.updateModel(id, data);
    set((s) => ({ models: s.models.map((m) => (m.id === id ? updated : m)) }));
  },

  deleteModel: async (id) => {
    await api.deleteModel(id);
    set((s) => ({ models: s.models.filter((m) => m.id !== id) }));
  },

  setEditing: (model) => set({ editingModel: model }),
}));
