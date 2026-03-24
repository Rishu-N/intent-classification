import React, { useState } from 'react';
import type { TestCase, TestCaseCreate } from '../../types';
import { useTestStore } from '../../store/testStore';
import { TestCaseForm } from './TestCaseForm';

interface Props {
  intentTree?: Record<string, Record<string, string[]>> | null;
}

export const TestCaseTable: React.FC<Props> = ({ intentTree }) => {
  const { testCases, createTestCase, updateTestCase, deleteTestCase, editingCase, setEditing } = useTestStore();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAdv, setFilterAdv] = useState<'all' | 'normal' | 'adversarial'>('all');

  const filtered = testCases.filter((tc) => {
    const matchSearch = tc.input_prompt.toLowerCase().includes(search.toLowerCase()) ||
      tc.expected_final_intent.toLowerCase().includes(search.toLowerCase());
    const matchAdv = filterAdv === 'all' || (filterAdv === 'adversarial' ? tc.adversarial : !tc.adversarial);
    return matchSearch && matchAdv;
  });

  const handleEdit = (tc: TestCase) => { setEditing(tc); setShowForm(true); };
  const handleDelete = async (id: string) => {
    if (confirm('Delete this test case?')) await deleteTestCase(id);
  };
  const handleSave = async (data: TestCaseCreate) => {
    if (editingCase) await updateTestCase(editingCase.id, data);
    else await createTestCase(data);
    setEditing(null);
    setShowForm(false);
  };
  const handleCancel = () => { setEditing(null); setShowForm(false); };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search queries or intents..."
          className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
        />
        <select
          value={filterAdv}
          onChange={(e) => setFilterAdv(e.target.value as any)}
          className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All ({testCases.length})</option>
          <option value="normal">Normal ({testCases.filter(t => !t.adversarial).length})</option>
          <option value="adversarial">Adversarial ({testCases.filter(t => t.adversarial).length})</option>
        </select>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="ml-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700"
        >
          + Add Test Case
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            {editingCase ? 'Edit Test Case' : 'Add Test Case'}
          </h3>
          <TestCaseForm initial={editingCase} intentTree={intentTree} onSave={handleSave} onCancel={handleCancel} />
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Input Prompt</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Expected Intent</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tc, i) => (
                <tr key={tc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800 font-medium">{tc.input_prompt}</div>
                    {tc.notes && <div className="text-xs text-slate-400 mt-0.5">{tc.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-500">{tc.expected_domain} › {tc.expected_category}</div>
                    <div className="text-slate-800 font-medium">{tc.expected_final_intent}</div>
                  </td>
                  <td className="px-4 py-3">
                    {tc.adversarial ? (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">adversarial</span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">normal</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(tc)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(tc.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No test cases found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
