import React, { useState, useEffect } from 'react';
import {
  Film,
  Plus,
  Kanban,
  List,
  Calendar,
  Share2,
  ExternalLink,
  Search,
  Megaphone,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { db } from '../../db/database.js';
import {
  contentRepo,
  CONTENT_STAGES,
  CONTENT_CHANNELS,
} from '../../db/repositories/contentRepo.js';
import { campaignsRepo } from '../../db/repositories/campaignsRepo.js';
import { ContentFormModal } from '../../components/forms/ContentFormModal.jsx';
import { generateWhatsAppLink, WHATSAPP_TEMPLATES } from '../../utils/whatsapp.js';

export function ContentPage() {
  const [viewMode, setViewMode] = useState('board'); // board, list, campaigns
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState({});
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [contentList, campList, allClients] = await Promise.all([
        contentRepo.getAll({}, db),
        campaignsRepo.getAll({}, db),
        db.clients ? db.clients.toArray() : [],
      ]);

      const clientMap = {};
      allClients.forEach((c) => {
        clientMap[c.id] = c;
      });

      setItems(contentList);
      setCampaigns(campList);
      setClients(clientMap);
    } catch (err) {
      console.error('Error loading content data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStageChange = async (itemId, newStage) => {
    try {
      await contentRepo.updateStage(itemId, newStage, db);
      loadData();
    } catch (err) {
      alert(`Error updating stage: ${err.message}`);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterChannel !== 'all' && item.channel !== filterChannel) return false;
    if (filterStage !== 'all' && item.stage !== filterStage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.clientName && item.clientName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Content & Marketing Deliverables
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Reels, carousels, stories, scripts, and Meta Ads performance tracker
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pipeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('campaigns')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'campaigns'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Meta Ads Campaigns"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ad Campaigns</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsContentModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Deliverable</span>
          </button>
        </div>
      </div>

      {/* Filter Strip (for Board & List views) */}
      {viewMode !== 'campaigns' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300"
            >
              <option value="all">All Channels</option>
              {CONTENT_CHANNELS.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.label}
                </option>
              ))}
            </select>

            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300"
            >
              <option value="all">All Stages</option>
              {CONTENT_STAGES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>
      )}

      {/* VIEW 1: PIPELINE BOARD (8 STAGES) */}
      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[550px]">
          {CONTENT_STAGES.map((stage) => {
            const stageItems = filteredItems.filter((it) => it.stage === stage.id);
            return (
              <div
                key={stage.id}
                className="w-72 flex-shrink-0 bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 flex flex-col space-y-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      {stage.label}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-800 text-[10px] font-mono font-bold flex items-center justify-center text-stone-600 dark:text-stone-400">
                      {stageItems.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 min-h-[100px]">
                  {stageItems.map((item) => {
                    const client = clients[item.clientId];
                    const whatsappLink = client?.phone
                      ? generateWhatsAppLink(
                          client.phone,
                          WHATSAPP_TEMPLATES.contentReview({
                            clientName: client.name,
                            contentTitle: item.title,
                            channel: item.channel.replace('_', ' '),
                            previewUrl: item.assetUrl || item.publishedUrl,
                          })
                        )
                      : null;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xs hover:border-emerald-500/50 transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                            {item.channel.replace('instagram_', 'IG ')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                              item.approvalStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : item.approvalStatus === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                            }`}
                          >
                            {item.approvalStatus}
                          </span>
                        </div>

                        <div>
                          <h4
                            onClick={() => {
                              setEditingItem(item);
                              setIsContentModalOpen(true);
                            }}
                            className="text-xs font-bold text-stone-900 dark:text-stone-100 cursor-pointer hover:underline"
                          >
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                            {item.clientName || client?.name}
                          </p>
                        </div>

                        {item.scheduledDate && (
                          <div className="text-[10px] font-mono text-stone-400">
                            📅 {item.scheduledDate}
                          </div>
                        )}

                        {/* Quick Actions Strip */}
                        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            {item.assetUrl && (
                              <a
                                href={item.assetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-stone-400 hover:text-stone-700"
                                title="Open Asset Link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {whatsappLink && (
                              <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-500"
                                title="Send Review Link to Client"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>

                          {/* Quick Stage Mover */}
                          <select
                            value={item.stage}
                            onChange={(e) => handleStageChange(item.id, e.target.value)}
                            className="text-[10px] bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-1.5 py-0.5 text-stone-600 dark:text-stone-300"
                          >
                            {CONTENT_STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                Move: {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Film className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">No deliverables found</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {item.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 uppercase">
                        {item.channel.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 uppercase">
                        {item.stage.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300">
                      {item.clientName} {item.scheduledDate ? `• Scheduled ${item.scheduledDate}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setIsContentModalOpen(true);
                      }}
                      className="px-3 py-1 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: CAMPAIGNS (META ADS PERFORMANCE TRACKER) */}
      {viewMode === 'campaigns' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>Ad Campaign Ledger:</strong> Manually recorded campaign budgets, actual spend, management fees, and lead metrics for transparent client reporting. (Not connected to unofficial Meta scrapers to ensure zero account bans).
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
                <Megaphone className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">No ad campaigns recorded yet</p>
                <p className="text-xs text-stone-400 mt-1">Track Meta and Google Ads performance for your agency clients</p>
              </div>
            ) : (
              campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-sm text-stone-900 dark:text-stone-100">{camp.name}</span>
                      <p className="text-xs text-stone-500 mt-0.5">{camp.clientName} • {camp.platform}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {camp.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-100 dark:border-stone-800 text-xs font-mono">
                    <div>
                      <span className="block text-[10px] uppercase font-sans text-stone-400">Budget:</span>
                      <span>₹{Number(camp.clientBudget).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-sans text-stone-400">Spent:</span>
                      <span>₹{Number(camp.recordedSpend).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-sans text-stone-400">Leads:</span>
                      <span className="font-bold text-emerald-600">{camp.leadsGenerated}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Content Form Modal */}
      <ContentFormModal
        isOpen={isContentModalOpen}
        onClose={() => setIsContentModalOpen(false)}
        editItem={editingItem}
        onSaved={loadData}
      />
    </div>
  );
}
