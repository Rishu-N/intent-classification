import { create } from 'zustand';
import type { TestCase, TestCaseCreate } from '../types';
import * as api from '../api/testCasesApi';

interface TestStore {
  testCases: TestCase[];
  loading: boolean;
  editingCase: TestCase | null;
  fetchTestCases: () => Promise<void>;
  createTestCase: (data: TestCaseCreate) => Promise<void>;
  updateTestCase: (id: string, data: TestCaseCreate) => Promise<void>;
  deleteTestCase: (id: string) => Promise<void>;
  setEditing: (tc: TestCase | null) => void;
}

export const useTestStore = create<TestStore>((set) => ({
  testCases: [],
  loading: false,
  editingCase: null,

  fetchTestCases: async () => {
    set({ loading: true });
    try {
      const testCases = await api.listTestCases();
      set({ testCases });
    } finally {
      set({ loading: false });
    }
  },

  createTestCase: async (data) => {
    const tc = await api.createTestCase(data);
    set((s) => ({ testCases: [...s.testCases, tc] }));
  },

  updateTestCase: async (id, data) => {
    const updated = await api.updateTestCase(id, data);
    set((s) => ({ testCases: s.testCases.map((t) => (t.id === id ? updated : t)) }));
  },

  deleteTestCase: async (id) => {
    await api.deleteTestCase(id);
    set((s) => ({ testCases: s.testCases.filter((t) => t.id !== id) }));
  },

  setEditing: (tc) => set({ editingCase: tc }),
}));
