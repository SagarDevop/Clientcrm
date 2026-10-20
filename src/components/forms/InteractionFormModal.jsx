import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { useInteractions } from '../../hooks/useInteractions.js';
import { useLeads } from '../../hooks/useLeads.js';
import { useClients } from '../../hooks/useClients.js';
import { Phone, MessageCircle, Users, Mail, PlaySquare, MoreHorizontal, AlertCircle } from 'lucide-react';

export function InteractionFormModal({
  isOpen,
  onClose,
  defaultLeadId = null,
  defaultClientId = null,
  defaultType = 'call',
  onSaved,
}) {
  const { logInteraction } = useInteractions();
  const { leads } = useLeads();
  const { clients } = useClients();

  const [entityType, setEntityType] = useState(defaultLeadId ? 'lead' : defaultClientId ? 'client' : 'lead');
  const [selectedEntityId, setSelectedEntityId] = useState(defaultLeadId || defaultClientId || '');
  const [type, setType] = useState(defaultType);
  const [occurredAt, setOccurredAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      // Formats local ISO for datetime-local
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setOccurredAt(localIso);
      setType(defaultType || 'call');
      setEntityType(defaultLeadId ? 'lead' : defaultClientId ? 'client' : 'lead');
      setSelectedEntityId(defaultLeadId || defaultClientId || '');
      setDurationMinutes('');
      setOutcome('');
      setSummary('');
      setNotes('');
      setNextFollowUpAt('');
      setError('');
    }
  }, [isOpen, defaultLeadId, defaultClientId, defaultType]);

  const quickOutcomes = [
    'Answered — Interested',
    'Follow up next week',
    'Sent Quotation / Pitch',
    'Demo Completed',
    'No Answer / Left Message',
    'Negotiating terms',
    'Ready to close',
    'Not a fit right now',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedEntityId) {
      setError(`Please select a ${entityType === 'lead' ? 'lead' : 'client'}.`);
      return;
    }

    if (!summary.trim()) {
      setError('Brief summary of discussion is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const chosenLead = entityType === 'lead' ? leads.find((l) => l.id === selectedEntityId) : null;
      const chosenClient = entityType === 'client' ? clients.find((c) => c.id === selectedEntityId) : null;

      const record = await logInteraction({
        leadId: entityType === 'lead' ? selectedEntityId : null,
        clientId: entityType === 'client' ? selectedEntityId : null,
        leadName: chosenLead?.name,
        clientName: chosenClient?.name,
        type,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        outcome: outcome || 'Discussed requirements',
        summary,
        notes,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
      });

      if (onSaved) onSaved(record);
      onClose();
    } catch (err) {
      console.error('Error logging interaction:', err);
      setError(err.message || 'Failed to log interaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const types = [
    { value: 'call', label: 'Call', icon: Phone },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'meeting', label: 'Meeting', icon: Users },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'demo', label: 'Demo', icon: PlaySquare },
    { value: 'other', label: 'Other', icon: MoreHorizontal },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Interaction" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Entity Selector (Lead vs Client) */}
        {!defaultLeadId && !defaultClientId && (
          <div className="space-y-2">
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => {
                  setEntityType('lead');
                  setSelectedEntityId('');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors min-touch-target ${
                  entityType === 'lead'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Prospect / Lead
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntityType('client');
                  setSelectedEntityId('');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors min-touch-target ${
                  entityType === 'client'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Existing Client
              </button>
            </div>

            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            >
              <option value="">Select a {entityType === 'lead' ? 'Lead' : 'Client'}...</option>
              {entityType === 'lead'
                ? leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.businessName ? `(${l.businessName})` : ''}
                    </option>
                  ))
                : clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.businessName ? `(${c.businessName})` : ''}
                    </option>
                  ))}
            </select>
          </div>
        )}

        {/* Interaction Channel Buttons */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Channel *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {types.map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all min-touch-target ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date/Time and Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 15"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>
        </div>

        {/* Outcome Chips */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Outcome / Result *
          </label>
          <input
            type="text"
            required
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="e.g. Discussed proposal, requested revision"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target mb-1.5"
          />
          <div className="flex flex-wrap gap-1">
            {quickOutcomes.map((qo) => (
              <button
                key={qo}
                type="button"
                onClick={() => setOutcome(qo)}
                className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {qo}
              </button>
            ))}
          </div>
        </div>

        {/* Brief Summary */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Brief Summary *
          </label>
          <textarea
            required
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Key points covered and agreement reached..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Next Follow-up Schedule */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Schedule Next Follow-Up (Optional)
          </label>
          <input
            type="datetime-local"
            value={nextFollowUpAt}
            onChange={(e) => setNextFollowUpAt(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          />
          <p className="text-[11px] text-slate-400">
            Scheduling creates an in-app reminder and updates the lead's next follow-up date.
          </p>
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
            {isSubmitting ? 'Logging...' : 'Log Interaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
