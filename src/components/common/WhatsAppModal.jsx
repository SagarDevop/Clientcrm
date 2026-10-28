import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.jsx';
import { cleanWhatsAppNumber, generateWhatsAppLink, getClientWhatsAppMessage } from '../../utils/whatsapp.js';
import { MessageSquare, Copy, Check, ExternalLink, AlertCircle, Sparkles } from 'lucide-react';

export function WhatsAppModal({ isOpen, onClose, client, defaultTemplate = 'renewal' }) {
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate);
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (client && isOpen) {
      setSelectedTemplate(defaultTemplate);
      setMessageText(getClientWhatsAppMessage(defaultTemplate, client));
      setCopied(false);
    }
  }, [client, isOpen, defaultTemplate]);

  if (!client) return null;

  const handleTemplateChange = (templateKey) => {
    setSelectedTemplate(templateKey);
    setMessageText(getClientWhatsAppMessage(templateKey, client));
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(messageText);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = messageText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Failed to copy to clipboard.');
    }
  };

  const hasPhone = Boolean(client.phone && cleanWhatsAppNumber(client.phone));
  const whatsappUrl = hasPhone ? generateWhatsAppLink(client.phone, messageText) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="3-in-1 WhatsApp Smart Messenger"
      size="md"
    >
      <div className="space-y-4">
        {/* Client Identity Strip */}
        <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-stone-900 dark:text-stone-100">{client.name}</div>
            <div className="text-stone-500 dark:text-stone-400">{client.businessName}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Phone</span>
            <span className="font-mono font-medium text-stone-800 dark:text-stone-200">
              {client.phone || 'No phone number'}
            </span>
          </div>
        </div>

        {!hasPhone && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start space-x-2 text-amber-800 dark:text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>This client has no valid phone number. You can still copy the message text below to send via other channels.</span>
          </div>
        )}

        {/* 3 Quick Template Switcher */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Choose Message Scenario:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleTemplateChange('onboarding')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center text-center transition-all min-touch-target ${
                selectedTemplate === 'onboarding'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <span className="text-sm mb-0.5">🚀</span>
              <span>1. Onboarding</span>
            </button>

            <button
              type="button"
              onClick={() => handleTemplateChange('balance')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center text-center transition-all min-touch-target ${
                selectedTemplate === 'balance'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <span className="text-sm mb-0.5">💰</span>
              <span>2. Balance Due</span>
            </button>

            <button
              type="button"
              onClick={() => handleTemplateChange('renewal')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center text-center transition-all min-touch-target ${
                selectedTemplate === 'renewal'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <span className="text-sm mb-0.5">🔄</span>
              <span>3. Renewal</span>
            </button>
          </div>
        </div>

        {/* Message Editor / Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
              Message Preview (Editable):
            </label>
            <span className="text-[11px] text-stone-400">Feel free to customize</span>
          </div>
          <textarea
            rows={7}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full p-3 text-xs font-sans rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-stone-800 transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors min-touch-target"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-400" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 min-touch-target"
            >
              Cancel
            </button>

            {hasPhone ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-colors min-touch-target"
              >
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="px-4 py-2.5 rounded-xl bg-stone-200 text-stone-400 text-xs font-semibold cursor-not-allowed"
              >
                No Phone Number
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
