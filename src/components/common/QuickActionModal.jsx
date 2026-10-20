import React from 'react';
import { Modal } from './Modal.jsx';
import { UserPlus, Users, CheckSquare, PhoneCall, DollarSign } from 'lucide-react';

export function QuickActionModal({
  isOpen,
  onClose,
  onOpenAddClient,
  onOpenAddLead,
  onOpenAddTask,
  onOpenLogInteraction,
  onOpenRecordPayment,
}) {
  const actions = [
    {
      title: 'New Lead',
      description: 'Capture prospect info, quotation & services',
      icon: UserPlus,
      color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
      onClick: () => {
        onClose();
        onOpenAddLead();
      },
    },
    {
      title: 'New Client',
      description: 'Add active client record & services',
      icon: Users,
      color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
      onClick: () => {
        onClose();
        onOpenAddClient();
      },
    },
    {
      title: 'Log Interaction',
      description: 'Record call, WhatsApp, meeting, or demo outcome',
      icon: PhoneCall,
      color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      onClick: () => {
        onClose();
        onOpenLogInteraction();
      },
    },
    {
      title: 'Add Task / Follow-up',
      description: 'Schedule daily deliverable or contact reminder',
      icon: CheckSquare,
      color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      onClick: () => {
        onClose();
        onOpenAddTask();
      },
    },
    {
      title: 'Record Payment',
      description: 'Add client deposit, payment, or adjustment',
      icon: DollarSign,
      color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
      onClick: () => {
        onClose();
        onOpenRecordPayment();
      },
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Actions" maxWidth="max-w-md">
      <div className="grid grid-cols-1 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.title}
              type="button"
              onClick={act.onClick}
              className="flex items-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left min-touch-target group"
            >
              <div className={`p-2.5 rounded-xl mr-3.5 flex-shrink-0 ${act.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {act.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {act.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
