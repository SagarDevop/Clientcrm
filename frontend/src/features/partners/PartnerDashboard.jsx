import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useClients } from '../../hooks/useClients.js';
import { usePayments } from '../../hooks/usePayments.js';
import {
  Users,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  PhoneCall,
  Calendar,
  Sparkles,
  ShieldCheck,
  Award,
} from 'lucide-react';

export function PartnerDashboard() {
  const { user } = useAuth();
  const { clients } = useClients();
  const { payments } = usePayments();

  // Metrics attributed to this partner
  const myClients = clients.filter((c) => !c.assignedPartnerId || c.assignedPartnerId === user?.id);
  const myActiveClients = myClients.filter((c) => c.status === 'active');
  const myTotalRevenue = payments
    .filter((p) => myClients.some((c) => c.id === p.clientId))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const monthlyTarget = user?.monthlyTarget || 50000;
  const targetPercent = Math.min(100, Math.round((myTotalRevenue / monthlyTarget) * 100));

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Partner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Welcome back, {user?.name || 'Partner'}! 👋
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {user?.role?.replace('_', ' ')?.toUpperCase() || 'PARTNER'}
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Track your pipeline, client deliveries, monthly target and performance milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Monthly Target</p>
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
              ₹{myTotalRevenue.toLocaleString()} / ₹{monthlyTarget.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
            {targetPercent}%
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">My Active Clients</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold mt-2 text-stone-900 dark:text-stone-100">{myActiveClients.length}</p>
          <span className="text-[10px] text-stone-400">Assigned & running</span>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Attributed Inflow</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold mt-2 text-stone-900 dark:text-stone-100">₹{myTotalRevenue.toLocaleString()}</p>
          <span className="text-[10px] text-stone-400">Total collected</span>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Follow-ups Today</span>
            <PhoneCall className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-stone-900 dark:text-stone-100">3</p>
          <span className="text-[10px] text-amber-600">Pending calls</span>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Target Progress</span>
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold mt-2 text-stone-900 dark:text-stone-100">{targetPercent}%</p>
          <span className="text-[10px] text-purple-600">On pace for month</span>
        </div>
      </div>

      {/* Assigned Clients List */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">My Assigned Clients</h2>
          <span className="text-xs text-stone-500 font-medium">{myClients.length} Total</span>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {myClients.map((client) => (
            <div key={client.id} className="p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
              <div>
                <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{client.name}</p>
                <p className="text-[11px] text-stone-500">{client.businessName} • {client.subscriptionTitle || 'Plan'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-600">₹{(client.monthlyPlanAmount || 0).toLocaleString()}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  {client.paymentStatus || 'Active'}
                </span>
              </div>
            </div>
          ))}
          {myClients.length === 0 && (
            <div className="p-8 text-center text-xs text-stone-400">No clients currently assigned to your account.</div>
          )}
        </div>
      </div>
    </div>
  );
}
