import React, { useState } from 'react';
import { BookOpen, FileText, Sparkles, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

const SAMPLE_ARTICLES = [
  {
    id: 'kb_1',
    category: 'pitch_deck',
    title: 'Instagram Reels & Content Growth Retainer (Pitch)',
    excerpt: 'Key pitching points for selling our ₹3,500 monthly growth plan covering 25 reels with guaranteed editing & weekly review.',
    content: '1. Emphasize consistency over one-off viral videos.\n2. Detail our quick turnaround and graphic design inclusion.\n3. Mention the dedicated billing cycle starting from initial token.',
  },
  {
    id: 'kb_2',
    category: 'objection_handling',
    title: 'Handling Price Objections (Retainers)',
    excerpt: 'Standard objection responses when clients compare prices with freelance editors.',
    content: 'Position ourselves not as freelance editors, but as a full-suite agency partner that takes care of strategy, thumbnail creation, and revisions.',
  },
  {
    id: 'kb_3',
    category: 'service_catalog',
    title: 'Custom Web Development Standard Deliverables',
    excerpt: 'Standard 3-week delivery process for custom responsive web applications & e-commerce websites.',
    content: 'Week 1: Wireframing & design approval.\nWeek 2: Frontend & API integration.\nWeek 3: Quality assurance, domain setup & handover.',
  },
];

export function KnowledgeCenter() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(SAMPLE_ARTICLES[0]);

  const filtered = activeCategory === 'all'
    ? SAMPLE_ARTICLES
    : SAMPLE_ARTICLES.filter((a) => a.category === activeCategory);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-600" />
          <span>Company Knowledge Center</span>
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          Shared pitches, service packages, objection handling guides, and agency playbooks.
        </p>
      </div>

      <div className="flex gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
        {['all', 'pitch_deck', 'objection_handling', 'service_catalog'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedArticle(item)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedArticle?.id === item.id
                  ? 'bg-white dark:bg-stone-900 border-emerald-500 shadow-sm'
                  : 'bg-white/60 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">{item.title}</h3>
              <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">{item.excerpt}</p>
            </div>
          ))}
        </div>

        <div className="md:col-span-2 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800">
          {selectedArticle ? (
            <div className="space-y-4">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                {selectedArticle.category.replace('_', ' ')}
              </span>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">{selectedArticle.title}</h2>
              <div className="whitespace-pre-line text-xs text-stone-700 dark:text-stone-300 leading-relaxed pt-2 border-t border-stone-100 dark:border-stone-800">
                {selectedArticle.content}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400">Select an article to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
