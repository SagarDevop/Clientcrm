import React from 'react';
import { Modal } from './Modal.jsx';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start space-x-3 pt-1">
        {isDestructive && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-touch-target"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={async () => {
            await onConfirm();
            onClose();
          }}
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors min-touch-target shadow-sm ${
            isDestructive
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-brand-600 hover:bg-brand-700'
          }`}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
