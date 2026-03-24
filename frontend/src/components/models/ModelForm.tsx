import React, { useState, useEffect } from 'react';
import type { ModelConfig, ModelConfigCreate, ModelSize, Provider } from '../../types';

interface Props {
  initial?: ModelConfig | null;
  onSave: (data: ModelConfigCreate) => Promise<void>;
  onCancel: () => void;
}

const PROVIDERS: Provider[] = ['openai', 'anthropic'];
const SIZES: ModelSize[] = ['small', 'large'];

const DEFAULTS: ModelConfigCreate = {
  display_name: '',
  provider: 'openai',
  model_name: '',
  api_key: '',
  size: 'small',
  cost_per_1m_input_tokens: 0,
  cost_per_1m_output_tokens: 0,
  max_tokens: 512,
  temperature: 0,
  enabled: true,
};

const PRESET_MODELS: Record<string, Partial<ModelConfigCreate>> = {
  'gpt-4o-mini': { provider: 'openai', model_name: 'gpt-4o-mini', cost_per_1m_input_tokens: 0.15, cost_per_1m_output_tokens: 0.6 },
  'gpt-4o': { provider: 'openai', model_name: 'gpt-4o', cost_per_1m_input_tokens: 2.5, cost_per_1m_output_tokens: 10 },
  'gpt-4.1-mini': { provider: 'openai', model_name: 'gpt-4.1-mini', cost_per_1m_input_tokens: 0.4, cost_per_1m_output_tokens: 1.6 },
  'gpt-4.1': { provider: 'openai', model_name: 'gpt-4.1', cost_per_1m_input_tokens: 2.0, cost_per_1m_output_tokens: 8.0 },
  'claude-haiku-4-5': { provider: 'anthropic', model_name: 'claude-haiku-4-5-20251001', cost_per_1m_input_tokens: 0.8, cost_per_1m_output_tokens: 4 },
  'claude-sonnet-4-5': { provider: 'anthropic', model_name: 'claude-sonnet-4-5', cost_per_1m_input_tokens: 3, cost_per_1m_output_tokens: 15 },
  'claude-sonnet-4-6': { provider: 'anthropic', model_name: 'claude-sonnet-4-6', cost_per_1m_input_tokens: 3, cost_per_1m_output_tokens: 15 },
};

export const ModelForm: React.FC<Props> = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState<ModelConfigCreate>(initial ? { ...initial } : { ...DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (initial) setForm({ ...initial });
  }, [initial]);

  const set = (patch: Partial<ModelConfigCreate>) =>
    setForm((f) => ({ ...f, ...patch }));

  const applyPreset = (key: string) => {
    const preset = PRESET_MODELS[key];
    if (preset) setForm((f) => ({ ...f, ...preset, display_name: key }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Presets */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Quick Preset</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESET_MODELS).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => applyPreset(k)}
              className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200"
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Display Name *</label>
          <input
            required
            value={form.display_name}
            onChange={(e) => set({ display_name: e.target.value })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. GPT-4o Mini"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Provider *</label>
          <select
            value={form.provider}
            onChange={(e) => set({ provider: e.target.value as Provider })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Model Name *</label>
          <input
            required
            value={form.model_name}
            onChange={(e) => set({ model_name: e.target.value })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. gpt-4o-mini"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Size</label>
          <select
            value={form.size}
            onChange={(e) => set({ size: e.target.value as ModelSize })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">API Key *</label>
        <div className="relative">
          <input
            required
            type={showKey ? 'text' : 'password'}
            value={form.api_key}
            onChange={(e) => set({ api_key: e.target.value })}
            className="w-full border border-slate-300 rounded px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="sk-..."
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1.5 text-xs text-slate-500 px-2 py-1 hover:text-slate-700"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cost / 1M input tokens (USD)</label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={form.cost_per_1m_input_tokens}
            onChange={(e) => set({ cost_per_1m_input_tokens: parseFloat(e.target.value) || 0 })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cost / 1M output tokens (USD)</label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={form.cost_per_1m_output_tokens}
            onChange={(e) => set({ cost_per_1m_output_tokens: parseFloat(e.target.value) || 0 })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Max Tokens</label>
          <input
            type="number"
            min="64"
            max="4096"
            value={form.max_tokens}
            onChange={(e) => set({ max_tokens: parseInt(e.target.value) || 512 })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={form.temperature}
            onChange={(e) => set({ temperature: parseFloat(e.target.value) || 0 })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={form.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="rounded border-slate-300 text-indigo-600"
        />
        <label htmlFor="enabled" className="text-sm text-slate-700">Enabled</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : initial ? 'Update Model' : 'Add Model'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
