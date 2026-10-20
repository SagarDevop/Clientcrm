import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { useProjects } from '../../hooks/useProjects.js';
import { useClients } from '../../hooks/useClients.js';
import { useServices } from '../../hooks/useServices.js';
import { PROJECT_TEMPLATES } from '../../db/seedData.js';
import { PROJECT_STATUSES } from '../../utils/formatters.js';
import { AlertCircle, Sparkles } from 'lucide-react';

export function ProjectFormModal({
  isOpen,
  onClose,
  initialData = null,
  defaultClientId = null,
  onSaved,
}) {
  const { createProject, updateProject } = useProjects();
  const { clients } = useClients();
  const { services } = useServices();

  const [formData, setFormData] = useState({
    name: '',
    clientId: defaultClientId || '',
    description: '',
    serviceIds: [],
    status: 'active',
    startDate: '',
    deadline: '',
    agreedAmount: '',
    notes: '',
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        clientId: initialData.clientId || '',
        description: initialData.description || '',
        serviceIds: initialData.serviceIds || [],
        status: initialData.status || 'active',
        startDate: initialData.startDate ? initialData.startDate.slice(0, 10) : '',
        deadline: initialData.deadline ? initialData.deadline.slice(0, 10) : '',
        agreedAmount: initialData.agreedAmount || '',
        notes: initialData.notes || '',
      });
      setSelectedTemplateId('');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setFormData({
        name: '',
        clientId: defaultClientId || (clients[0]?.id || ''),
        description: '',
        serviceIds: [],
        status: 'active',
        startDate: today,
        deadline: '',
        agreedAmount: '',
        notes: '',
      });
      setSelectedTemplateId('');
    }
    setError('');
  }, [initialData, defaultClientId, isOpen, clients]);

  const handleTemplateChange = (tmplId) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;

    const tmpl = PROJECT_TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) {
      if (!formData.name) {
        setFormData((prev) => ({
          ...prev,
          name: `${tmpl.name} Deliverables`,
          serviceIds: tmpl.serviceId ? [tmpl.serviceId] : prev.serviceIds,
        }));
      } else if (tmpl.serviceId && !formData.serviceIds.includes(tmpl.serviceId)) {
        setFormData((prev) => ({
          ...prev,
          serviceIds: [...prev.serviceIds, tmpl.serviceId],
        }));
      }
    }
  };

  const toggleService = (srvId) => {
    setFormData((prev) => {
      const exists = prev.serviceIds.includes(srvId);
      return {
        ...prev,
        serviceIds: exists ? prev.serviceIds.filter((id) => id !== srvId) : [...prev.serviceIds, srvId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required.');
      return;
    }

    if (!formData.clientId) {
      setError('Please select a client for this project.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        agreedAmount: Number(formData.agreedAmount) || 0,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      };

      let saved;
      if (initialData?.id) {
        saved = await updateProject(initialData.id, payload);
      } else {
        saved = await createProject(payload, { templateId: selectedTemplateId });
      }

      if (onSaved) onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Error saving project:', err);
      setError(err.message || 'Failed to save project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Project' : 'Create New Project'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Project Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Project Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Q4 Growth Marketing & Web App"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          />
        </div>

        {/* Client Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Associated Client *
          </label>
          <select
            required
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.businessName ? `(${c.businessName})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Starter Template (Only for new projects) */}
        {!initialData && (
          <div className="p-3 rounded-xl bg-brand-50/70 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/40">
            <label className="text-xs font-semibold uppercase tracking-wider text-brand-900 dark:text-brand-300 flex items-center mb-1.5">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
              Starter Checklist Template (Optional)
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">None (Empty project)</option>
              {PROJECT_TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} ({tmpl.tasks.length} starter tasks)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Select a template to automatically generate production milestones & deliverable tasks.
            </p>
          </div>
        )}

        {/* Status & Agreed Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Project Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            >
              {PROJECT_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Agreed Contract Amount ($)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={formData.agreedAmount}
              onChange={(e) => setFormData({ ...formData, agreedAmount: e.target.value })}
              placeholder="5000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>
        </div>

        {/* Start Date & Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Target Deadline
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>
        </div>

        {/* Service associations */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Deliverable Services
          </label>
          <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 max-h-28 overflow-y-auto">
            {services.map((srv) => {
              const isSelected = formData.serviceIds.includes(srv.id);
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => toggleService(srv.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all min-touch-target flex items-center ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-500'
                  }`}
                >
                  {srv.name}
                  {isSelected && <span className="ml-1.5 text-white">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description & Scope */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Scope & Deliverable Notes
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Key deliverables, client brief, revision limits..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Form Actions */}
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
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm min-touch-target"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
