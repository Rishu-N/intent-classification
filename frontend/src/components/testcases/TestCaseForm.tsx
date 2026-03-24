import React, { useState, useEffect } from 'react';
import type { TestCase, TestCaseCreate } from '../../types';

interface Props {
  initial?: TestCase | null;
  intentTree?: Record<string, Record<string, string[]>> | null;
  onSave: (data: TestCaseCreate) => Promise<void>;
  onCancel: () => void;
}

const DEFAULTS: TestCaseCreate = {
  input_prompt: '',
  expected_domain: '',
  expected_category: '',
  expected_final_intent: '',
  adversarial: false,
  notes: null,
};

export const TestCaseForm: React.FC<Props> = ({ initial, intentTree, onSave, onCancel }) => {
  const [form, setForm] = useState<TestCaseCreate>(initial ? { ...initial } : { ...DEFAULTS });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setForm({ ...initial });
  }, [initial]);

  const patch = (p: Partial<TestCaseCreate>) => setForm((f) => ({ ...f, ...p }));

  const domains = intentTree ? Object.keys(intentTree) : [];
  const categories = intentTree && form.expected_domain ? Object.keys(intentTree[form.expected_domain] || {}) : [];
  const intents = intentTree && form.expected_domain && form.expected_category
    ? intentTree[form.expected_domain]?.[form.expected_category] || [] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Input Prompt *</label>
        <textarea
          required
          value={form.input_prompt}
          onChange={(e) => patch({ input_prompt: e.target.value })}
          rows={3}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="The user query to classify"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Domain *</label>
          <select
            required
            value={form.expected_domain}
            onChange={(e) => patch({ expected_domain: e.target.value, expected_category: '', expected_final_intent: '' })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select...</option>
            {domains.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
          <select
            required
            value={form.expected_category}
            onChange={(e) => patch({ expected_category: e.target.value, expected_final_intent: '' })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select...</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Intent *</label>
          <select
            required
            value={form.expected_final_intent}
            onChange={(e) => patch({ expected_final_intent: e.target.value })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select...</option>
            {intents.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.adversarial}
            onChange={(e) => patch({ adversarial: e.target.checked })}
            className="rounded border-slate-300 text-orange-500"
          />
          Adversarial
        </label>
        <input
          value={form.notes || ''}
          onChange={(e) => patch({ notes: e.target.value || null })}
          placeholder="Notes (optional)"
          className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving...' : initial ? 'Update' : 'Add Test Case'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  );
};
