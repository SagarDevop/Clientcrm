import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../../db/database.js';
import { contentRepo, CONTENT_CHANNELS, CONTENT_STAGES } from '../../db/repositories/contentRepo.js';

export function ContentFormModal({ isOpen, onClose, onSaved, editItem = null, initialClientId = null }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(initialClientId || '');
  const [channel, setChannel] = useState('instagram_reels');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [brief, setBrief] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [scriptNotes, setScriptNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [stage, setStage] = useState('idea');
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadClients() {
      if (!db.clients) return;
      const all = await db.clients.toArray();
      setClients(all.filter((c) => c.status !== 'archived'));
    }
    if (isOpen) {
      loadClients();
      if (editItem) {
        setClientId(editItem.clientId || '');
        setChannel(editItem.channel || 'instagram_reels');
        setTitle(editItem.title || '');
        setCaption(editItem.caption || '');
        setBrief(editItem.brief || '');
        setAssetUrl(editItem.assetUrl || '');
        setScriptNotes(editItem.scriptNotes || '');
        setScheduledDate(editItem.scheduledDate || '');
        setStage(editItem.stage || 'idea');
        setApprovalStatus(editItem.approvalStatus || 'pending');
        setRevisionNotes(editItem.revisionNotes || '');
        setPublishedUrl(editItem.publishedUrl || '');
      } else {
        setClientId(initialClientId || '');
        setChannel('instagram_reels');
        setTitle('');
        setCaption('');
        setBrief('');
        setAssetUrl('');
        setScriptNotes('');
        setScheduledDate('');
        setStage('idea');
        setApprovalStatus('pending');
        setRevisionNotes('');
        setPublishedUrl('');
      }
      setError('');
    }
  }, [isOpen, editItem, initialClientId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a content title');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const selectedClient = clients.find((c) => c.id === clientId);
      const data = {
        clientId,
        clientName: selectedClient ? selectedClient.name : '',
        channel,
        title: title.trim(),
        caption: caption.trim(),
        brief: brief.trim(),
        assetUrl: assetUrl.trim(),
        scriptNotes: scriptNotes.trim(),
        scheduledDate: scheduledDate || null,
        stage,
        approvalStatus,
        revisionNotes: revisionNotes.trim(),
        publishedUrl: publishedUrl.trim(),
      };

      let result;
      if (editItem && editItem.id) {
        result = await contentRepo.update(editItem.id, data);
      } else {
        result = await contentRepo.create(data);
      }

      if (onSaved) onSaved(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save content item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {editItem ? 'Edit Content Deliverable' : 'New Content Deliverable'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Agency workflow: Reels, Stories, Carousels, Posts, Scripts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.businessName ? `(${c.businessName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Channel / Format *
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                {CONTENT_CHANNELS.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Title / Concept *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 5 Mistakes in E-commerce Checkout (Reel #3)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Workflow Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                {CONTENT_STAGES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Client Approval
              </label>
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Revision Requested</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Scheduled Publish Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Creative Brief / Direction
            </label>
            <textarea
              rows="2"
              placeholder="Hooks, visuals, target audience, angle..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Caption / Copy & Hashtags
            </label>
            <textarea
              rows="3"
              placeholder="Draft caption, hashtags, and call to action..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Asset Link (Google Drive / Figma)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={assetUrl}
                onChange={(e) => setAssetUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Published URL (Live Post Link)
              </label>
              <input
                type="url"
                placeholder="https://instagram.com/p/..."
                value={publishedUrl}
                onChange={(e) => setPublishedUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {approvalStatus === 'rejected' && (
            <div>
              <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
                Client Revision Feedback / Notes
              </label>
              <textarea
                rows="2"
                placeholder="Specific adjustments requested by client..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-stone-900 dark:text-stone-100 resize-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editItem ? 'Update Content' : 'Create Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
