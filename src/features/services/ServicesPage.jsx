import React, { useState } from 'react';
import { useServices } from '../../hooks/useServices.js';
import { Modal } from '../../components/common/Modal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { Briefcase, Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react';

export function ServicesPage() {
  const { services, isLoading, createService, updateService, toggleActive } = useServices();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleOpenAdd = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (srv) => {
    setEditingService(srv);
    setName(srv.name);
    setDescription(srv.description || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Service name is required.');
      return;
    }

    try {
      if (editingService) {
        await updateService(editingService.id, { name: name.trim(), description: description.trim() });
      } else {
        await createService({ name: name.trim(), description: description.trim(), active: true });
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save service.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Service Offerings & Categories
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Customize the services associated with your clients, leads, and projects
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs min-touch-target"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Service</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading business services..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((srv) => (
            <div
              key={srv.id}
              className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs flex flex-col justify-between ${
                srv.active
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {srv.name}
                  </h2>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      srv.active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {srv.active ? 'Active' : 'Deactivated'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {srv.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => toggleActive(srv.id)}
                  className={`text-xs font-semibold ${
                    srv.active
                      ? 'text-amber-600 hover:text-amber-700'
                      : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  {srv.active ? 'Deactivate' : 'Reactivate'}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(srv)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Edit service"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Edit Service' : 'Add New Service'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Email Marketing & Newsletters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope, deliverable format, or rate card reference..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
            >
              Save Service
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
