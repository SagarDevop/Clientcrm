import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { useLeads } from '../../hooks/useLeads.js';
import { PROJECT_TEMPLATES } from '../../db/seedData.js';
import { Trophy, AlertCircle, Sparkles } from 'lucide-react';

export function ConvertLeadModal({ isOpen, onClose, lead, onConverted }) {
  const { convertToClient } = useLeads();

  const [createProject, setCreateProject] = useState(true);
  const [projectName, setProjectName] = useState(lead ? `${lead.name} — Initial Engagement` : '');
  const [agreedAmount, setAgreedAmount] = useState(lead ? lead.quotationAmount || lead.estimatedValue || '' : '');
  const [deadline, setDeadline] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('tmpl-content');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleConvert = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setIsSubmitting(true);
      let initialTasks = [];
      if (createProject && selectedTemplateId) {
        const tmpl = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplateId);
        if (tmpl) initialTasks = tmpl.tasks;
      }

      const result = await convertToClient(lead.id, {
        projectName: createProject ? projectName : null,
        agreedAmount: createProject ? Number(agreedAmount) || 0 : 0,
        deadline: createProject && deadline ? new Date(deadline).toISOString() : null,
        initialTasks,
      });

      if (onConverted) onConverted(result);
      onClose();
    } catch (err) {
      console.error('Error converting lead:', err);
      setError(err.message || 'Failed to convert lead to client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert Lead to Active Client" maxWidth="max-w-lg">
      <form onSubmit={handleConvert} className="space-y-4">
        {/* Success Header banner */}
        <div className="flex items-center p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
          <Trophy className="w-6 h-6 mr-3 text-emerald-600 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-sm block">Deal Won! 🎉</span>
            Converting <b>{lead.name}</b> will create an active client profile and preserve all {lead.name}'s interaction timeline history.
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Create First Project Checkbox */}
        <div className="pt-2">
          <label className="flex items-center space-x-2 text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={createProject}
              onChange={(e) => setCreateProject(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
            />
            <span>Create initial project for this client</span>
          </label>
        </div>

        {createProject && (
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required={createProject}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Website & SEO Campaign"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Agreed Contract Amount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={agreedAmount}
                  onChange={(e) => setAgreedAmount(e.target.value)}
                  placeholder="3500"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center mb-1">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-brand-600" />
                Initialize Deliverables from Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Do not generate tasks</option>
                {PROJECT_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.tasks.length} starter tasks)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-touch-target"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm min-touch-target"
          >
            {isSubmitting ? 'Converting...' : 'Confirm & Convert'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
