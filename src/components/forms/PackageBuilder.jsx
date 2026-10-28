import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, Edit3, Sliders, CheckCircle2 } from 'lucide-react';

export function PackageBuilder({ value, onChange }) {
  const [mode, setMode] = useState('builder'); // 'builder' | 'manual'

  // Structured Builder State
  const [reelsQty, setReelsQty] = useState(12);
  const [reelsScope, setReelsScope] = useState('Shoot, Edit & Copywriting');

  const [postsQty, setPostsQty] = useState(8);

  const [storiesOption, setStoriesOption] = useState('daily'); // 'none' | 'daily' | '15_mo' | 'custom'
  const [customStories, setCustomStories] = useState('');

  const [metaAdsOption, setMetaAdsOption] = useState('setup_mgmt'); // 'none' | 'setup_mgmt' | 'lead_gen' | 'sales'

  const [websiteOption, setWebsiteOption] = useState('landing_page'); // 'none' | 'landing_page' | 'dynamic_website' | 'ecommerce'

  const [shootOption, setShootOption] = useState('none'); // 'none' | 'monthly_shoot' | 'scripting_only'

  const [customItems, setCustomItems] = useState([
    'Weekly Performance & Growth Review',
  ]);
  const [newCustomInput, setNewCustomInput] = useState('');

  // Compiler: turns options into a crisp, professional bulleted description
  const compileDescription = (overrides = {}) => {
    const rQty = overrides.reelsQty !== undefined ? overrides.reelsQty : reelsQty;
    const rScope = overrides.reelsScope !== undefined ? overrides.reelsScope : reelsScope;
    const pQty = overrides.postsQty !== undefined ? overrides.postsQty : postsQty;
    const sOpt = overrides.storiesOption !== undefined ? overrides.storiesOption : storiesOption;
    const sCust = overrides.customStories !== undefined ? overrides.customStories : customStories;
    const mOpt = overrides.metaAdsOption !== undefined ? overrides.metaAdsOption : metaAdsOption;
    const wOpt = overrides.websiteOption !== undefined ? overrides.websiteOption : websiteOption;
    const shOpt = overrides.shootOption !== undefined ? overrides.shootOption : shootOption;
    const cItems = overrides.customItems !== undefined ? overrides.customItems : customItems;

    const lines = [];

    // 1. Reels
    if (rQty > 0) {
      lines.push(`• ${rQty} Instagram Reels (${rScope})`);
    }

    // 2. Static Posts
    if (pQty > 0) {
      lines.push(`• ${pQty} Static Post Creatives & Carousels`);
    }

    // 3. Stories
    if (sOpt === 'daily') {
      lines.push('• Daily Active Stories & Audience Engagement');
    } else if (sOpt === '15_mo') {
      lines.push('• 15 Branded Stories per Month');
    } else if (sOpt === 'custom' && sCust.trim()) {
      lines.push(`• ${sCust.trim()}`);
    }

    // 4. Meta Ads
    if (mOpt === 'setup_mgmt') {
      lines.push('• Meta Ads (Facebook & Instagram) Campaign Setup & Daily Optimization');
    } else if (mOpt === 'lead_gen') {
      lines.push('• High-ROI Meta Lead Generation Ads Management & Funnel Tracking');
    } else if (mOpt === 'sales') {
      lines.push('• Meta Ads E-Commerce Sales Campaign & Catalog Retargeting');
    }

    // 5. Website / Landing Page
    if (wOpt === 'landing_page') {
      lines.push('• High-Converting Sales/Lead Landing Page');
    } else if (wOpt === 'dynamic_website') {
      lines.push('• Dynamic Business Website Development & Maintenance');
    } else if (wOpt === 'ecommerce') {
      lines.push('• E-Commerce Store (Shopify/WooCommerce) Setup & Maintenance');
    }

    // 6. Shoot / Video Production
    if (shOpt === 'monthly_shoot') {
      lines.push('• Monthly On-Site Video Shoot & Creative Direction');
    } else if (shOpt === 'scripting_only') {
      lines.push('• Custom Viral Hook & Script Writing Included');
    }

    // 7. Custom Items
    cItems.forEach((item) => {
      if (item && item.trim()) {
        lines.push(`• ${item.trim()}`);
      }
    });

    return lines.join('\n');
  };

  // Sync builder to value whenever options change in builder mode
  const updateAndSync = (newParams = {}) => {
    const compiled = compileDescription(newParams);
    onChange(compiled);
  };

  // Initialize once if empty
  useEffect(() => {
    if (!value || !value.trim()) {
      const initial = compileDescription();
      onChange(initial);
    }
  }, []);

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newCustomInput.trim()) return;
    const updated = [...customItems, newCustomInput.trim()];
    setCustomItems(updated);
    setNewCustomInput('');
    updateAndSync({ customItems: updated });
  };

  const handleRemoveCustom = (index) => {
    const updated = customItems.filter((_, i) => i !== index);
    setCustomItems(updated);
    updateAndSync({ customItems: updated });
  };

  return (
    <div className="space-y-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Service Package & Deliverables Builder
        </label>

        <div className="flex items-center bg-stone-200/70 dark:bg-stone-700/60 p-0.5 rounded-xl text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('builder');
              updateAndSync();
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              mode === 'builder'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Sliders className="w-3 h-3 inline mr-1" />
            Quick Builder
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              mode === 'manual'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Edit3 className="w-3 h-3 inline mr-1" />
            Raw Text
          </button>
        </div>
      </div>

      {mode === 'builder' ? (
        <div className="space-y-3.5 pt-1">
          {/* Row 1: Reels & Static Posts Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reels */}
            <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  🎬 Instagram Reels
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {reelsQty} Reels/mo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={reelsQty}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setReelsQty(val);
                    updateAndSync({ reelsQty: val });
                  }}
                  className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold text-center rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
                <select
                  value={reelsScope}
                  onChange={(e) => {
                    setReelsScope(e.target.value);
                    updateAndSync({ reelsScope: e.target.value });
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                >
                  <option value="Shoot, Edit & Copywriting">Shoot, Edit & Copywriting</option>
                  <option value="Editing & Graphic Hooks Only">Editing & Graphics Only</option>
                  <option value="Scripting, Shoot & Complete Polish">Scripting, Shoot & Polish</option>
                  <option value="AI / Curated Repurposing">AI / Curated Repurposing</option>
                </select>
              </div>
            </div>

            {/* Static Posts */}
            <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  🖼️ Static Posts / Carousels
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {postsQty} Posts/mo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={postsQty}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setPostsQty(val);
                    updateAndSync({ postsQty: val });
                  }}
                  className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold text-center rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
                <div className="flex gap-1.5 flex-1">
                  {[0, 8, 12, 15].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setPostsQty(preset);
                        updateAndSync({ postsQty: preset });
                      }}
                      className={`px-2 py-1 text-[11px] rounded-lg font-medium border transition-colors ${
                        postsQty === preset
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
                      }`}
                    >
                      {preset === 0 ? 'None' : preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Stories & Meta Ads Management */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Stories */}
            <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700/80 space-y-1.5">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                📱 Stories
              </span>
              <select
                value={storiesOption}
                onChange={(e) => {
                  setStoriesOption(e.target.value);
                  updateAndSync({ storiesOption: e.target.value });
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              >
                <option value="daily">Daily Active Stories & Engagement</option>
                <option value="15_mo">15 Branded Stories / Month</option>
                <option value="none">No Stories Included</option>
                <option value="custom">Custom Stories Schedule...</option>
              </select>
              {storiesOption === 'custom' && (
                <input
                  type="text"
                  placeholder="e.g. 3 Stories every Tuesday and Thursday"
                  value={customStories}
                  onChange={(e) => {
                    setCustomStories(e.target.value);
                    updateAndSync({ customStories: e.target.value });
                  }}
                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              )}
            </div>

            {/* Meta Ads */}
            <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700/80 space-y-1.5">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                📢 Meta Ads (FB & IG)
              </span>
              <select
                value={metaAdsOption}
                onChange={(e) => {
                  setMetaAdsOption(e.target.value);
                  updateAndSync({ metaAdsOption: e.target.value });
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              >
                <option value="setup_mgmt">Yes — Campaign Setup & Daily Optimization</option>
                <option value="lead_gen">Yes — High-ROI Lead Generation Ads</option>
                <option value="sales">Yes — E-Commerce Catalog & Sales Campaigns</option>
                <option value="none">No Ads Management (Organic Only)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Website & Video Shoot Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Website / Landing Page */}
            <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700/80 space-y-1.5">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                🌐 Website / Landing Page
              </span>
              <select
                value={websiteOption}
                onChange={(e) => {
                  setWebsiteOption(e.target.value);
                  updateAndSync({ websiteOption: e.target.value });
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              >
                <option value="landing_page">High-Converting Sales/Lead Landing Page</option>
                <option value="dynamic_website">Dynamic Business Website (Multi-Page)</option>
                <option value="ecommerce">E-Commerce Store (Shopify/WooCommerce)</option>
                <option value="none">No Website Service</option>
              </select>
            </div>

            {/* Video Shoot */}
            <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700/80 space-y-1.5">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                📸 Video Shoot / Direction
              </span>
              <select
                value={shootOption}
                onChange={(e) => {
                  setShootOption(e.target.value);
                  updateAndSync({ shootOption: e.target.value });
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              >
                <option value="none">Client Provides Raw Footage (Edit Only)</option>
                <option value="monthly_shoot">Monthly Video Shoot & Direction Included</option>
                <option value="scripting_only">Custom Scripting & Hook Strategy Only</option>
              </select>
            </div>
          </div>

          {/* Row 4: Custom Deliverables / Fill in the Blanks */}
          <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700/80 space-y-2">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
              ➕ Extra Deliverables / Custom Add-ons
            </span>

            {/* Existing custom items */}
            {customItems.length > 0 && (
              <div className="space-y-1.5">
                {customItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700/60 text-xs"
                  >
                    <span className="text-stone-700 dark:text-stone-300 font-medium">
                      • {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustom(idx)}
                      className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                      title="Remove deliverable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new custom deliverable */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Google My Business SEO, WhatsApp Bot Setup, Weekly Analytics..."
                value={newCustomInput}
                onChange={(e) => setNewCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustom(e);
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Live Package Preview (What Client & Receipt Will See):
            </span>
            <pre className="text-xs font-sans text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
              {value || 'No deliverables selected yet.'}
            </pre>
          </div>
        </div>
      ) : (
        /* Manual Raw Text Editor Mode */
        <div className="space-y-2 pt-1">
          <textarea
            rows={6}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type or edit raw package deliverables..."
            className="w-full p-3 text-xs font-sans rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 leading-relaxed focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-[11px] text-stone-400">
            Each line starting with a bullet will appear formatted cleanly in client emails and invoices.
          </p>
        </div>
      )}
    </div>
  );
}
