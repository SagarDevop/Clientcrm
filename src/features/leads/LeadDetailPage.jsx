import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLead } from '../../hooks/useLeads.js';
import { useServices } from '../../hooks/useServices.js';
import { useInteractions } from '../../hooks/useInteractions.js';
import { formatCurrency, formatDate, formatRelativeDate, LEAD_STAGES, getLeadStageBadgeColor, getLeadStageLabel } from '../../utils/formatters.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { LeadFormModal } from '../../components/forms/LeadFormModal.jsx';
import { InteractionFormModal } from '../../components/forms/InteractionFormModal.jsx';
import { ConvertLeadModal } from '../../components/forms/ConvertLeadModal.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import {
  ArrowLeft,
  Edit2,
  Phone,
  MessageCircle,
  Mail,
  Trophy,
  XCircle,
  RotateCcw,
  Clock,
  Plus,
} from 'lucide-react';

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { lead, isLoading, updateLead, markLost, reopen } = useLead(id);
  const { services } = useServices();
  const { interactions } = useInteractions({ leadId: id });

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogInteractionOpen, setIsLogInteractionOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);

  if (isLoading) {
    return <LoadingSpinner text="Loading prospect details..." size="lg" className="min-h-[50vh]" />;
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Lead Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This lead record may have been deleted or does not exist.</p>
        <button
          onClick={() => navigate('/leads')}
          className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl"
        >
          Back to Pipeline
        </button>
      </div>
    );
  }

  const leadServices = services.filter((s) => lead.serviceIds?.includes(s.id));

  const handleCall = () => {
    if (!lead.phone) return;
    window.location.href = `tel:${lead.phone}`;
    setTimeout(() => setIsLogInteractionOpen(true), 1200);
  };

  const handleWhatsApp = () => {
    if (!lead.normalizedPhone) return;
    window.open(`https://wa.me/${lead.normalizedPhone}`, '_blank');
    setTimeout(() => setIsLogInteractionOpen(true), 1200);
  };

  const handleStageChange = async (newStage) => {
    if (newStage === 'won') {
      setIsConvertModalOpen(true);
    } else if (newStage === 'lost') {
      setIsLostModalOpen(true);
    } else {
      await updateLead({ stage: newStage });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Back & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 min-touch-target"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Pipeline
        </button>

        <div className="flex items-center space-x-2">
          {lead.stage === 'lost' ? (
            <button
              type="button"
              onClick={() => reopen()}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 min-touch-target flex items-center"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reopen Lead
            </button>
          ) : lead.stage !== 'won' ? (
            <>
              <button
                type="button"
                onClick={() => setIsLostModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 min-touch-target flex items-center"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Mark Lost
              </button>
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold min-touch-target flex items-center shadow-xs"
              >
                <Trophy className="w-3.5 h-3.5 mr-1.5" /> Convert to Client
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/clients/${lead.wonClientId}`)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold min-touch-target flex items-center shadow-xs"
            >
              <Trophy className="w-3.5 h-3.5 mr-1.5" /> View Active Client Profile
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium min-touch-target flex items-center"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </button>
        </div>
      </div>

      {/* Main Lead Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{lead.name}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getLeadStageBadgeColor(lead.stage)}`}>
                {getLeadStageLabel(lead.stage)}
              </span>
            </div>

            {lead.businessName && (
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {lead.businessName}
              </p>
            )}

            {lead.source && (
              <p className="text-xs text-slate-400 mt-1">Source: {lead.source}</p>
            )}
          </div>

          {/* Quick Contact Buttons */}
          <div className="flex flex-wrap gap-2">
            {lead.phone && (
              <>
                <button
                  type="button"
                  onClick={handleCall}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center min-touch-target"
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                  Call
                </button>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center min-touch-target border border-emerald-200 dark:border-emerald-800"
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  WhatsApp
                </button>
              </>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center min-touch-target"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Email
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsLogInteractionOpen(true)}
              className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium flex items-center min-touch-target shadow-xs"
            >
              + Log Interaction
            </button>
          </div>
        </div>

        {/* Pipeline Stage Quick Changer */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Advance Pipeline Stage
          </span>
          <div className="flex flex-wrap gap-1.5">
            {LEAD_STAGES.map((stg) => {
              const isCurrent = lead.stage === stg.value;
              return (
                <button
                  key={stg.value}
                  type="button"
                  onClick={() => handleStageChange(stg.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all min-touch-target ${
                    isCurrent
                      ? 'bg-brand-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {stg.label}
                  {isCurrent && ' ✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interested Services */}
        {leadServices.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Target Services
            </span>
            <div className="flex flex-wrap gap-1.5">
              {leadServices.map((srv) => (
                <span
                  key={srv.id}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-100 dark:border-brand-900/40"
                >
                  {srv.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Valuation & Follow-up Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400">Estimated Value</span>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(lead.estimatedValue)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400">Quotation Given</span>
          <div className="text-base sm:text-lg font-bold text-indigo-600">
            {formatCurrency(lead.quotationAmount)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400">Demo Status</span>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize mt-0.5">
            {lead.demoStatus?.replace('_', ' ')}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400">Next Follow-Up</span>
          <div className="text-xs sm:text-sm font-semibold text-amber-600 mt-0.5">
            {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : 'None scheduled'}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {lead.notes && (
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prospect Notes</h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {lead.notes}
          </p>
        </div>
      )}

      {/* Interaction Timeline History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Chronological Timeline ({interactions.length} interactions)
          </h2>
          <button
            type="button"
            onClick={() => setIsLogInteractionOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 text-xs font-semibold flex items-center min-touch-target"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Log Call / Meeting
          </button>
        </div>

        {interactions.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No interactions logged with this prospect yet. Log calls or messages to track touchpoints.
          </div>
        ) : (
          <div className="relative pl-6 space-y-3 border-l border-slate-200 dark:border-slate-800 ml-2">
            {interactions.map((inter) => (
              <div key={inter.id} className="relative">
                <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-950" />
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                      {inter.type}: {inter.outcome}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {formatRelativeDate(inter.occurredAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {inter.summary}
                  </p>
                  {inter.durationMinutes && (
                    <span className="inline-block mt-2 text-[10px] text-slate-400 font-medium">
                      ⏱ Duration: {inter.durationMinutes} mins
                    </span>
                  )}
                  {inter.nextFollowUpAt && (
                    <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> Next follow-up: {formatDate(inter.nextFollowUpAt)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <LeadFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={lead}
      />

      <InteractionFormModal
        isOpen={isLogInteractionOpen}
        onClose={() => setIsLogInteractionOpen(false)}
        defaultLeadId={lead.id}
      />

      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        lead={lead}
        onConverted={(res) => {
          if (res?.client?.id) {
            navigate(`/clients/${res.client.id}`);
          }
        }}
      />

      {/* Mark as Lost Modal with Reason */}
      <ConfirmDialog
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        onConfirm={async () => {
          await markLost(lostReason || 'Client selected competitor or delayed budget');
        }}
        title="Mark Deal as Lost?"
        message="Moving this lead to Lost preserves the record for sales conversion reporting."
        confirmText="Confirm Lost"
        isDestructive={true}
      />
    </div>
  );
}
