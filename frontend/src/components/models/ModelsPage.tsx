import React, { useEffect, useState } from 'react';
import { useModelStore } from '../../store/modelStore';
import { ModelForm } from './ModelForm';
import type { ModelConfig, ModelConfigCreate } from '../../types';

const SizeSection: React.FC<{
  title: string;
  models: ModelConfig[];
  onEdit: (m: ModelConfig) => void;
  onDelete: (id: string) => void;
}> = ({ title, models, onEdit, onDelete }) => (
  <div>
    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</h3>
    {models.length === 0 ? (
      <p className="text-sm text-slate-400 italic">No models configured</p>
    ) : (
      <div className="space-y-2">
        {models.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full ${m.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
              />
              <div>
                <div className="text-sm font-medium text-slate-800">{m.display_name}</div>
                <div className="text-xs text-slate-500">
                  {m.provider} · {m.model_name} · ${m.cost_per_1m_input_tokens}/${m.cost_per_1m_output_tokens} per 1M tokens
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(m)}
                className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(m.id)}
                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const ModelsPage: React.FC = () => {
  const { models, loading, fetchModels, createModel, updateModel, deleteModel, editingModel, setEditing } =
    useModelStore();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const smallModels = models.filter((m) => m.size === 'small');
  const largeModels = models.filter((m) => m.size === 'large');

  const handleEdit = (m: ModelConfig) => {
    setEditing(m);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this model configuration?')) {
      await deleteModel(id);
    }
  };

  const handleSave = async (data: ModelConfigCreate) => {
    if (editingModel) {
      await updateModel(editingModel.id, data);
    } else {
      await createModel(data);
    }
    setEditing(null);
    setShowForm(false);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Model Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">
            Add and manage LLM models used for classification
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700"
        >
          + Add Model
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            {editingModel ? 'Edit Model' : 'Add New Model'}
          </h3>
          <ModelForm initial={editingModel} onSave={handleSave} onCancel={handleCancel} />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6">
          <SizeSection title="Small LLMs (Hierarchical Ensemble)" models={smallModels} onEdit={handleEdit} onDelete={handleDelete} />
          <hr className="border-slate-100" />
          <SizeSection title="Large LLMs (Flat Classification)" models={largeModels} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      )}
    </div>
  );
};
