import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, UserPlus, FolderKanban, CheckSquare, ArrowRight } from 'lucide-react';
import { db } from '../../db/database.js';
import { normalizePhone } from '../../utils/id.js';

export function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ clients: [], leads: [], projects: [], tasks: [] });
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ clients: [], leads: [], projects: [], tasks: [] });
      return;
    }

    if (!query.trim()) {
      setResults({ clients: [], leads: [], projects: [], tasks: [] });
      return;
    }

    const q = query.trim().toLowerCase();
    const norm = normalizePhone(q);
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const [allClients, allLeads, allProjects, allTasks] = await Promise.all([
          db.clients.toArray(),
          db.leads.toArray(),
          db.projects.toArray(),
          db.tasks.toArray(),
        ]);

        const matchedClients = allClients
          .filter(
            (c) =>
              c.name?.toLowerCase().includes(q) ||
              c.businessName?.toLowerCase().includes(q) ||
              c.email?.toLowerCase().includes(q) ||
              c.phone?.includes(q) ||
              (norm && c.normalizedPhone?.includes(norm))
          )
          .slice(0, 5);

        const matchedLeads = allLeads
          .filter(
            (l) =>
              l.name?.toLowerCase().includes(q) ||
              l.businessName?.toLowerCase().includes(q) ||
              l.email?.toLowerCase().includes(q) ||
              l.phone?.includes(q) ||
              (norm && l.normalizedPhone?.includes(norm))
          )
          .slice(0, 5);

        const matchedProjects = allProjects
          .filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
          .slice(0, 5);

        const matchedTasks = allTasks
          .filter((t) => t.title?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q))
          .slice(0, 5);

        setResults({
          clients: matchedClients,
          leads: matchedLeads,
          projects: matchedProjects,
          tasks: matchedTasks,
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const totalResults =
    results.clients.length + results.leads.length + results.projects.length + results.tasks.length;

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-12 sm:pt-20 bg-slate-950/50 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col z-10">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, leads, projects, tasks..."
            autoFocus
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {!query && (
            <p className="text-center text-xs text-slate-400 py-6">
              Type a name, phone, email, project, or task to find records instantly.
            </p>
          )}

          {query && totalResults === 0 && !isSearching && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
              No results found for "{query}".
            </p>
          )}

          {/* Clients */}
          {results.clients.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1 flex items-center">
                <Users className="w-3.5 h-3.5 mr-1.5" /> Clients ({results.clients.length})
              </div>
              <div className="space-y-1 mt-1">
                {results.clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(`/clients/${c.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {c.businessName ? `${c.businessName} • ` : ''}{c.phone}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Leads */}
          {results.leads.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1 flex items-center">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Leads ({results.leads.length})
              </div>
              <div className="space-y-1 mt-1">
                {results.leads.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleSelect(`/leads/${l.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{l.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {l.businessName ? `${l.businessName} • ` : ''}{l.phone}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1 flex items-center">
                <FolderKanban className="w-3.5 h-3.5 mr-1.5" /> Projects ({results.projects.length})
              </div>
              <div className="space-y-1 mt-1">
                {results.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(`/projects/${p.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{p.status}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1 flex items-center">
                <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Tasks ({results.tasks.length})
              </div>
              <div className="space-y-1 mt-1">
                {results.tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect('/tasks')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{t.category}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
